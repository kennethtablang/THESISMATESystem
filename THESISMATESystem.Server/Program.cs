using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using QuestPDF.Infrastructure;
using System.Security.Claims;
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
                options.UseSqlServer(
                    builder.Configuration.GetConnectionString("DefaultConnection"),
                    sql => sql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null)));

            // Identity
            builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = false;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                // One account per email address.
                options.User.RequireUniqueEmail = true;
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

            // JWT Authentication
            // Secrets live in user-secrets (dev) or environment variables (Jwt__Key), never appsettings.json
            var jwtKey = builder.Configuration["Jwt:Key"];
            if (string.IsNullOrWhiteSpace(jwtKey))
                throw new InvalidOperationException(
                    "JWT Key is not configured. Run: dotnet user-secrets set \"Jwt:Key\" \"<long random key>\"");

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
                    },
                    // A JWT stays valid for 8 hours and carries the role it was issued with, so without
                    // this a deactivated (or deleted) account kept full access, and a demoted user kept
                    // their old role's permissions, until the token expired. The lookup is cached briefly
                    // per user to avoid a database round-trip on every request; changes apply within 30s.
                    OnTokenValidated = async ctx =>
                    {
                        var userId = ctx.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                        if (string.IsNullOrEmpty(userId)) { ctx.Fail("Token has no subject."); return; }

                        var services = ctx.HttpContext.RequestServices;
                        // Current role of an active account; null when it is inactive or no longer exists.
                        var currentRole = await services.GetRequiredService<IMemoryCache>().GetOrCreateAsync(
                            $"user-state:{userId}",
                            async entry =>
                            {
                                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30);
                                var db = services.GetRequiredService<AppDbContext>();
                                var account = await db.Users
                                    .Where(u => u.Id == userId && u.IsActive)
                                    .Select(u => new
                                    {
                                        Role = db.UserRoles
                                            .Where(ur => ur.UserId == u.Id)
                                            .Join(db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
                                            .FirstOrDefault(),
                                    })
                                    .FirstOrDefaultAsync();
                                return account is null ? null : account.Role ?? string.Empty;
                            });

                        if (currentRole is null) { ctx.Fail("Account is deactivated."); return; }
                        if (currentRole != (ctx.Principal!.FindFirstValue(ClaimTypes.Role) ?? string.Empty))
                            ctx.Fail("Your role has changed. Please sign in again.");
                    }
                };
            });

            builder.Services.AddAuthorization();
            builder.Services.AddMemoryCache();

            // AutoMapper
            builder.Services.AddAutoMapper(typeof(MappingProfile));

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
            builder.Services.AddScoped<IGroupAccessChecker, GroupAccessChecker>();
            builder.Services.AddScoped<ISectionService, SectionService>();
            builder.Services.AddScoped<IRegistrationService, RegistrationService>();
            builder.Services.AddScoped<IDefenseAutoScheduler, DefenseAutoScheduler>();
            builder.Services.AddHostedService<MaintenanceHostedService>();

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

            // Allow large file uploads (50 MB). Kestrel caps request bodies at ~28.6 MB by default and
            // that cap applies before FormOptions, so both must be raised for the 50 MB limit to hold.
            const long maxUploadBytes = 52_428_800;
            builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = maxUploadBytes);
            builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o =>
            {
                o.MultipartBodyLengthLimit = maxUploadBytes;
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

            // Last-resort handler for anything a controller does not catch. The middleware logs the
            // exception with its stack trace; the client only gets a generic message, so database,
            // file-system and SMTP details never leave the server.
            app.UseExceptionHandler(errorApp => errorApp.Run(async ctx =>
            {
                ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await ctx.Response.WriteAsJsonAsync(new { message = "An unexpected error occurred. Please try again." });
            }));

            // Ensure wwwroot exists for file uploads
            var wwwroot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
            Directory.CreateDirectory(wwwroot);
            Directory.CreateDirectory(Path.Combine(wwwroot, "uploads", "documents"));
            Directory.CreateDirectory(Path.Combine(wwwroot, "uploads", "chapters"));
            Directory.CreateDirectory(Path.Combine(wwwroot, "uploads", "manuscripts"));
            Directory.CreateDirectory(Path.Combine(wwwroot, "uploads", "system-features"));

            // Submitted documents and chapters live under wwwroot but are private: they are only
            // ever served through /api/documents/{id}/download and the chapters equivalent, which
            // run a group-access check first. Without this any static handler below would serve the
            // same bytes to anyone holding the URL, bypassing that check entirely.
            app.Use(async (ctx, next) =>
            {
                var path = ctx.Request.Path;
                if (path.StartsWithSegments("/uploads/documents") ||
                    path.StartsWithSegments("/uploads/chapters"))
                {
                    ctx.Response.StatusCode = StatusCodes.Status404NotFound;
                    return;
                }
                await next();
            });

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
