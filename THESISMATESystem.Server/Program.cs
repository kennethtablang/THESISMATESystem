using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using QuestPDF.Infrastructure;
using System.Text;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.Hubs;
using THESISMATESystem.Server.Interfaces;
using THESISMATESystem.Server.Models;
using THESISMATESystem.Server.Profiles;
using THESISMATESystem.Server.Services;

namespace THESISMATESystem.Server
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var builder = WebApplication.CreateBuilder(args);

            // Persist data protection keys so email tokens survive server restarts
            builder.Services.AddDataProtection()
                .PersistKeysToFileSystem(new DirectoryInfo(
                    Path.Combine(builder.Environment.ContentRootPath, "DataProtection-Keys")));

            // Database
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // Identity
            builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = false;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

            // JWT Authentication
            var jwtKey = builder.Configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("JWT Key is not configured.");

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = builder.Configuration["Jwt:Issuer"],
                    ValidAudience = builder.Configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                };
                // Allow JWT via query string for SignalR WebSocket connections
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = ctx =>
                    {
                        var access = ctx.Request.Query["access_token"];
                        var path = ctx.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(access) && path.StartsWithSegments("/hubs"))
                            ctx.Token = access;
                        return Task.CompletedTask;
                    }
                };
            });

            builder.Services.AddAuthorization();

            // AutoMapper
            builder.Services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());

            // Services
            builder.Services.AddScoped<IEmailService, EmailService>();
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<IGroupService, GroupService>();
            builder.Services.AddScoped<IChapterService, ChapterService>();
            builder.Services.AddScoped<IConsultationService, ConsultationService>();
            builder.Services.AddScoped<IDefenseService, DefenseService>();
            builder.Services.AddScoped<INotificationService, NotificationService>();
            builder.Services.AddScoped<IReportService, ReportService>();
            builder.Services.AddScoped<IDocumentService, DocumentService>();
            builder.Services.AddScoped<ISystemFeatureService, SystemFeatureService>();
            builder.Services.AddScoped<IConsultationScheduleService, ConsultationScheduleService>();
            builder.Services.AddScoped<IClassroomService, ClassroomService>();
            builder.Services.AddScoped<IManuscriptService, ManuscriptService>();
            builder.Services.AddScoped<IMonitoringService, MonitoringService>();

            builder.Services.AddSignalR(options =>
            {
                // Allow large Yjs binary updates from paste operations (default is 32 KB)
                options.MaximumReceiveMessageSize = 4 * 1024 * 1024; // 4 MB
            });

            builder.Services.AddControllers()
                .AddJsonOptions(o =>
                {
                    // Serialize enums as strings
                    o.JsonSerializerOptions.Converters.Add(
                        new System.Text.Json.Serialization.JsonStringEnumConverter());
                    // Always write DateTime/DateTime? with 'Z' suffix so browsers
                    // parse them as UTC (not local time). SQL Server returns DateTimeKind.Unspecified
                    // which System.Text.Json serialises without 'Z', causing an 8-hour offset in PHT.
                    o.JsonSerializerOptions.Converters.Add(new THESISMATESystem.Server.Helpers.UtcDateTimeConverter());
                    o.JsonSerializerOptions.Converters.Add(new THESISMATESystem.Server.Helpers.UtcNullableDateTimeConverter());
                });

            // Swagger / OpenAPI
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "ThesisMate API",
                    Version = "v1",
                    Description = "Backend API for ThesisMate Capstone Management System — PSU Lingayen"
                });

                // JWT Bearer auth in Swagger UI
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "Bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Paste your JWT token here (without the 'Bearer ' prefix). Get it from POST /api/auth/login."
                });

                c.AddSecurityRequirement((doc) => new OpenApiSecurityRequirement
                {
                    { new OpenApiSecuritySchemeReference("Bearer", doc), new List<string>() }
                });
            });

            // Allow large file uploads (50 MB)
            builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o =>
            {
                o.MultipartBodyLengthLimit = 52_428_800;
            });

            // CORS for SPA development
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("SpaPolicy", policy =>
                    policy.WithOrigins(builder.Configuration["SpaProxyServerUrl"] ?? "https://localhost:62535")
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials());
            });

            var app = builder.Build();

            // Ensure wwwroot exists for file uploads
            var wwwroot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
            Directory.CreateDirectory(wwwroot);
            Directory.CreateDirectory(Path.Combine(wwwroot, "uploads", "documents"));
            Directory.CreateDirectory(Path.Combine(wwwroot, "uploads", "chapters"));
            Directory.CreateDirectory(Path.Combine(wwwroot, "uploads", "manuscripts"));
            Directory.CreateDirectory(Path.Combine(wwwroot, "uploads", "system-features"));

            app.UseDefaultFiles();
            app.MapStaticAssets();

            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "ThesisMate API v1");
                c.RoutePrefix = "swagger";
                c.DocumentTitle = "ThesisMate API";
                c.DefaultModelsExpandDepth(-1);
                c.DisplayRequestDuration();
            });

            // Serve static files; prevent MIME sniffing across all static paths
            app.UseStaticFiles(new StaticFileOptions
            {
                OnPrepareResponse = ctx =>
                {
                    // Prevents browser from overriding the Content-Type we set.
                    // Combined with the server-side allowlist + magic-byte check in
                    // ManuscriptService.UploadImageAsync, this closes the XSS-via-upload vector.
                    ctx.Context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
                }
            });
            app.UseHttpsRedirection();
            app.UseCors("SpaPolicy");
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseMiddleware<THESISMATESystem.Server.Middleware.UpdateLastActiveMiddleware>();
            app.MapControllers();
            app.MapHub<ManuscriptHub>("/hubs/manuscript");
            app.MapFallbackToFile("/index.html");

            // Seed roles and default users on startup
            await DbSeeder.SeedAsync(app.Services);

            app.Run();
        }
    }
}
