using AutoMapper;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;
using THESISMATESystem.Server.Interfaces;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Services
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IConfiguration _config;
        private readonly IMapper _mapper;
        private readonly AppDbContext _db;
        private readonly IEmailService _email;
        private readonly ILogger<AuthService> _logger;
        private readonly ITimeLimitedDataProtector _twoFactorChallenge;
        private readonly IHostEnvironment _env;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration config,
            IMapper mapper,
            AppDbContext db,
            IEmailService email,
            ILogger<AuthService> logger,
            IDataProtectionProvider dataProtection,
            IHostEnvironment env)
        {
            _env = env;
            _twoFactorChallenge = dataProtection
                .CreateProtector("ThesisMate.Auth.TwoFactorChallenge")
                .ToTimeLimitedDataProtector();
            _userManager = userManager;
            _signInManager = signInManager;
            _config = config;
            _mapper = mapper;
            _db = db;
            _email = email;
            _logger = logger;
        }

        public async Task<AuthResponseDto> LoginAsync(LoginRequestDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);

            if (user is null)
            {
                await WriteAuditAsync(null, "Login", "User", dto.Email, success: false);
                throw new UnauthorizedAccessException("Invalid credentials.");
            }

            if (!user.IsActive)
            {
                await WriteAuditAsync(user.Id, "Login", "User", dto.Email, success: false);
                throw new UnauthorizedAccessException("Account is deactivated.");
            }

            if (!user.EmailConfirmed)
            {
                await WriteAuditAsync(user.Id, "Login", "User", dto.Email, success: false);
                throw new UnauthorizedAccessException("Please verify your email address before logging in. Check your inbox for the verification link.");
            }

            var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);
            if (result.IsLockedOut)
            {
                await WriteAuditAsync(user.Id, "Login", "User", dto.Email, success: false);
                throw new UnauthorizedAccessException("Account temporarily locked due to repeated failed attempts. Please try again in a few minutes.");
            }
            if (!result.Succeeded)
            {
                await WriteAuditAsync(user.Id, "Login", "User", dto.Email, success: false);
                throw new UnauthorizedAccessException("Invalid credentials.");
            }

            // Checked after the password so the approval state is only revealed to the owner.
            if (user.RegistrationStatus == RegistrationStatus.PendingApproval)
            {
                await WriteAuditAsync(user.Id, "Login", "User", dto.Email, success: false);
                throw new UnauthorizedAccessException("Your registration is awaiting approval by the administrator. You will receive an email once it has been reviewed.");
            }

            // 2FA check
            if (await _userManager.GetTwoFactorEnabledAsync(user))
            {
                var code = await _userManager.GenerateTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider);
                try
                {
                    await _email.SendEmailAsync(user.Email!, "Your ThesisMate login code", Build2FAEmail(user.FirstName, code));
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send 2FA code to {Email}", user.Email);
                    throw new InvalidOperationException("Failed to send your login code. Please try again.");
                }
                // A signed, short-lived challenge rather than the raw user id. Email 2FA codes are
                // time-based and verify whether or not one was sent, so accepting a bare id let anyone
                // who knew it guess the code and sign in without the password.
                var challenge = _twoFactorChallenge.Protect(user.Id, TimeSpan.FromMinutes(10));
                return new AuthResponseDto { TwoFactorRequired = true, TempUserId = challenge };
            }

            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault() ?? string.Empty;
            var token = GenerateJwt(user, role);

            await WriteAuditAsync(user.Id, "Login", "User", dto.Email, success: true);

            var userDto = _mapper.Map<UserResponseDto>(user);
            userDto.Role = role;

            return new AuthResponseDto
            {
                Token = token,
                RefreshToken = string.Empty,
                Expires = DateTime.UtcNow.AddHours(8),
                User = userDto
            };
        }

        public async Task<RegisterResponseDto> RegisterAsync(RegisterRequestDto dto)
        {
            // Self-registration only ever creates a Student, and only as a pending request.
            // Staff accounts are created by the SuperAdmin through CreateUserAsync.
            var section = await _db.Sections.FirstOrDefaultAsync(s => s.Id == dto.SectionId && s.IsActive)
                ?? throw new InvalidOperationException("Please select a valid block/section.");

            var studentId = dto.StudentId.Trim();
            var duplicateId = await _userManager.Users
                .AnyAsync(u => u.StudentId == studentId);
            if (duplicateId)
                throw new InvalidOperationException($"DUPLICATE_STUDENT_ID");

            var user = new ApplicationUser
            {
                FirstName = dto.FirstName.Trim(),
                MiddleName = string.IsNullOrWhiteSpace(dto.MiddleName) ? null : dto.MiddleName.Trim(),
                LastName = dto.LastName.Trim(),
                StudentId = studentId,
                SectionId = section.Id,
                Email = dto.Email.Trim(),
                UserName = dto.Email.Trim(),
                IsActive = true,
                EmailConfirmed = false,
                RegistrationStatus = RegistrationStatus.PendingApproval,
                RegistrationExpiresAt = PhilippineTime.Now.AddDays(PendingRegistrationDays),
            };

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded)
                throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));

            await _userManager.AddToRoleAsync(user, "Student");
            await WriteAuditAsync(user.Id, "Register", "User", user.Email, success: true);

            var confirmToken = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            // Base64Url-encode so the token survives email links intact (no +/= chars that break URLs)
            var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(confirmToken));
            var clientUrl = _config["ClientBaseUrl"] ?? "https://localhost:62535";
            var verifyUrl = $"{clientUrl}/verify-email?userId={user.Id}&token={encodedToken}";

            try
            {
                await _email.SendEmailAsync(user.Email!, "Verify your ThesisMate account", BuildVerificationEmail(user.FirstName, verifyUrl));
            }
            catch (Exception ex) when (_env.IsDevelopment())
            {
                // Local dev without working SMTP: keep the account and log the link so registration can be tested
                _logger.LogError(ex, "Failed to send verification email to {Email}", user.Email);
                _logger.LogWarning("DEVELOPMENT ONLY - verification link for {Email}: {VerifyUrl}", user.Email, verifyUrl);
            }
            catch (Exception ex)
            {
                // Roll back the user so the same email can be used to register again
                await _userManager.DeleteAsync(user);
                _logger.LogError(ex, "Failed to send verification email to {Email}", user.Email);
                throw new InvalidOperationException("Failed to send the verification email. Please check your email address and try again later.");
            }

            return new RegisterResponseDto
            {
                Message = $"Registration submitted. Verify your email, then wait for the administrator to approve your account. Unapproved registrations are removed after {PendingRegistrationDays} days.",
                Email = user.Email!
            };
        }

        public async Task<bool> VerifyEmailAsync(string userId, string token)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null) return false;

            if (user.EmailConfirmed) return true;

            string decodedToken;
            try
            {
                decodedToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token));
            }
            catch
            {
                return false;
            }

            var result = await _userManager.ConfirmEmailAsync(user, decodedToken);
            return result.Succeeded;
        }

        private static string BuildVerificationEmail(string firstName, string verifyUrl) => $"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family:Inter,system-ui,sans-serif;background:#f4f0e6;margin:0;padding:40px 20px;">
              <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <div style="background:linear-gradient(135deg,#0a1628 0%,#1e3350 100%);padding:32px 40px;text-align:center;">
                  <p style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;margin:0 0 4px;">ThesisMate</p>
                  <p style="color:#c9a84c;margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">PSU Lingayen</p>
                </div>
                <div style="padding:40px;">
                  <h2 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 12px;letter-spacing:-0.4px;">Verify your email address</h2>
                  <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">Hi {firstName}, welcome to ThesisMate! Click the button below to verify your email. After that, an administrator will review your registration against your section's class list.</p>
                  <div style="text-align:center;margin:32px 0;">
                    <a href="{verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#d4b565);color:#0a1628;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:12px;">Verify Email Address</a>
                  </div>
                  <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 6px;">If the button doesn't work, copy and paste this link into your browser:</p>
                  <p style="word-break:break-all;color:#c9a84c;font-size:12px;margin:0 0 24px;">{verifyUrl}</p>
                  <p style="color:#9ca3af;font-size:12px;margin:0;">This link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>
                </div>
                <div style="background:#f9f7f2;padding:20px 40px;text-align:center;border-top:1px solid #e8e1d0;">
                  <p style="color:#9ca3af;font-size:12px;margin:0;">Pangasinan State University — Lingayen Campus</p>
                </div>
              </div>
            </body>
            </html>
            """;


        private static string BuildPasswordResetEmail(string firstName, string resetUrl) => $"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family:Inter,system-ui,sans-serif;background:#f4f0e6;margin:0;padding:40px 20px;">
              <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <div style="background:linear-gradient(135deg,#0a1628 0%,#1e3350 100%);padding:32px 40px;text-align:center;">
                  <p style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;margin:0 0 4px;">ThesisMate</p>
                  <p style="color:#c9a84c;margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">PSU Lingayen</p>
                </div>
                <div style="padding:40px;">
                  <h2 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 12px;letter-spacing:-0.4px;">Reset your password</h2>
                  <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">Hi {firstName}, we received a request to reset your password. Click the button below to set a new one.</p>
                  <div style="text-align:center;margin:32px 0;">
                    <a href="{resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#d4b565);color:#0a1628;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:12px;">Reset Password</a>
                  </div>
                  <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 6px;">If the button doesn't work, copy and paste this link into your browser:</p>
                  <p style="word-break:break-all;color:#c9a84c;font-size:12px;margin:0 0 24px;">{resetUrl}</p>
                  <p style="color:#9ca3af;font-size:12px;margin:0;">This link expires in 24 hours. If you did not request a password reset, you can safely ignore this email.</p>
                </div>
                <div style="background:#f9f7f2;padding:20px 40px;text-align:center;border-top:1px solid #e8e1d0;">
                  <p style="color:#9ca3af;font-size:12px;margin:0;">Pangasinan State University — Lingayen Campus</p>
                </div>
              </div>
            </body>
            </html>
            """;

        private static string Build2FAEmail(string firstName, string code) => $"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family:Inter,system-ui,sans-serif;background:#f4f0e6;margin:0;padding:40px 20px;">
              <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <div style="background:linear-gradient(135deg,#0a1628 0%,#1e3350 100%);padding:32px 40px;text-align:center;">
                  <p style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;margin:0 0 4px;">ThesisMate</p>
                  <p style="color:#c9a84c;margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">PSU Lingayen</p>
                </div>
                <div style="padding:40px;text-align:center;">
                  <h2 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 12px;letter-spacing:-0.4px;">Your login code</h2>
                  <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 32px;">Hi {firstName}, use the code below to complete your sign-in. This code expires in 10 minutes.</p>
                  <div style="background:#f4f0e6;border-radius:16px;padding:24px 40px;display:inline-block;margin:0 auto 32px;">
                    <p style="font-size:40px;font-weight:800;letter-spacing:0.2em;color:#0a1628;margin:0;font-family:monospace;">{code}</p>
                  </div>
                  <p style="color:#9ca3af;font-size:12px;margin:0;">Never share this code with anyone. ThesisMate will never ask for it.</p>
                </div>
                <div style="background:#f9f7f2;padding:20px 40px;text-align:center;border-top:1px solid #e8e1d0;">
                  <p style="color:#9ca3af;font-size:12px;margin:0;">Pangasinan State University — Lingayen Campus</p>
                </div>
              </div>
            </body>
            </html>
            """;

        public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequestDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("User not found.");

            var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
            return result.Succeeded;
        }

        public async Task<bool> ForgotPasswordAsync(string email)
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user is null) return true; // don't reveal if email exists

            var rawToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(rawToken));
            var clientUrl = _config["ClientBaseUrl"] ?? "https://localhost:62535";
            var resetUrl = $"{clientUrl}/reset-password?email={Uri.EscapeDataString(email)}&token={encodedToken}";

            try
            {
                await _email.SendEmailAsync(email, "Reset your ThesisMate password", BuildPasswordResetEmail(user.FirstName, resetUrl));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email to {Email}", email);
            }

            return true;
        }

        public async Task<bool> ResetPasswordAsync(ResetPasswordRequestDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email)
                ?? throw new KeyNotFoundException("User not found.");

            string decodedToken;
            try
            {
                decodedToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(dto.Token));
            }
            catch
            {
                return false;
            }

            var result = await _userManager.ResetPasswordAsync(user, decodedToken, dto.NewPassword);
            return result.Succeeded;
        }

        public async Task<bool> GetTwoFactorStatusAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("User not found.");
            return await _userManager.GetTwoFactorEnabledAsync(user);
        }

        public async Task EnableTwoFactorSendCodeAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("User not found.");

            var code = await _userManager.GenerateTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider);
            await _email.SendEmailAsync(user.Email!, "Enable 2FA — Your ThesisMate verification code", Build2FAEmail(user.FirstName, code));
        }

        public async Task<bool> VerifyAndEnableTwoFactorAsync(string userId, string code)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("User not found.");

            var valid = await _userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider, code);
            if (!valid) return false;

            await _userManager.SetTwoFactorEnabledAsync(user, true);
            return true;
        }

        public async Task DisableTwoFactorAsync(string userId, string password)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("User not found.");

            var passwordValid = await _userManager.CheckPasswordAsync(user, password);
            if (!passwordValid)
                throw new UnauthorizedAccessException("Incorrect password.");

            await _userManager.SetTwoFactorEnabledAsync(user, false);
        }

        public async Task<AuthResponseDto> TwoFactorLoginAsync(string challenge, string code)
        {
            string userId;
            try { userId = _twoFactorChallenge.Unprotect(challenge); }
            catch (CryptographicException)
            {
                // Tampered, forged, or older than 10 minutes.
                throw new UnauthorizedAccessException("Your sign-in session has expired. Please sign in again.");
            }

            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new UnauthorizedAccessException("Invalid session. Please log in again.");

            // Re-assert the same gates LoginAsync applies. This endpoint is reachable on its own,
            // and the account can be deactivated between the password step and code entry.
            if (!user.IsActive)
            {
                await WriteAuditAsync(user.Id, "Login2FA", "User", user.Email, success: false);
                throw new UnauthorizedAccessException("Account is deactivated.");
            }
            if (!user.EmailConfirmed)
            {
                await WriteAuditAsync(user.Id, "Login2FA", "User", user.Email, success: false);
                throw new UnauthorizedAccessException("Please verify your email address before logging in.");
            }
            if (user.RegistrationStatus == RegistrationStatus.PendingApproval)
            {
                await WriteAuditAsync(user.Id, "Login2FA", "User", user.Email, success: false);
                throw new UnauthorizedAccessException("Your registration is awaiting approval by the administrator.");
            }

            // Wrong codes count toward the same lockout as wrong passwords, so the 6-digit code
            // cannot be brute-forced within its validity window.
            if (await _userManager.IsLockedOutAsync(user))
            {
                await WriteAuditAsync(user.Id, "Login2FA", "User", user.Email, success: false);
                throw new UnauthorizedAccessException("Account temporarily locked due to repeated failed attempts. Please try again in a few minutes.");
            }

            var valid = await _userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider, code);
            if (!valid)
            {
                await _userManager.AccessFailedAsync(user);
                await WriteAuditAsync(user.Id, "Login2FA", "User", user.Email, success: false);
                throw new UnauthorizedAccessException("Invalid or expired code. Please try again.");
            }
            await _userManager.ResetAccessFailedCountAsync(user);

            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault() ?? string.Empty;
            var token = GenerateJwt(user, role);

            await WriteAuditAsync(user.Id, "Login2FA", "User", user.Email, success: true);

            var userDto = _mapper.Map<UserResponseDto>(user);
            userDto.Role = role;

            return new AuthResponseDto
            {
                Token = token,
                RefreshToken = string.Empty,
                Expires = DateTime.UtcNow.AddHours(8),
                User = userDto
            };
        }

        public async Task<UserResponseDto?> GetProfileAsync(string userId)
        {
            var user = await _db.Users.Include(u => u.Section).FirstOrDefaultAsync(u => u.Id == userId);
            if (user is null) return null;

            var roles = await _userManager.GetRolesAsync(user);
            var dto = _mapper.Map<UserResponseDto>(user);
            dto.Role = roles.FirstOrDefault() ?? string.Empty;
            return dto;
        }

        private int PendingRegistrationDays =>
            int.TryParse(_config["Registration:PendingExpiryDays"], out var days) && days > 0 ? days : 3;

        private static readonly HashSet<string> ValidRoles =
            ["SuperAdmin", "Admin", "Faculty", "Student"];

        public async Task<UserResponseDto> UpdateUserAsync(string userId, UpdateUserRequestDto dto, string callerRole)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("User not found.");

            // Validate the role change up front so an unauthorized/invalid request
            // doesn't partially apply the profile-field updates below.
            if (dto.Role is not null)
            {
                if (callerRole != "SuperAdmin")
                    throw new UnauthorizedAccessException("Only SuperAdmin can change user roles.");

                if (!ValidRoles.Contains(dto.Role))
                    throw new ArgumentException($"'{dto.Role}' is not a valid role.");
            }

            if (dto.FirstName is not null) user.FirstName = dto.FirstName.Trim();
            if (dto.MiddleName is not null) user.MiddleName = string.IsNullOrWhiteSpace(dto.MiddleName) ? null : dto.MiddleName.Trim();
            if (dto.LastName is not null) user.LastName = dto.LastName.Trim();
            if (dto.PhoneNumber is not null) user.PhoneNumber = dto.PhoneNumber;
            if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;

            if (dto.Role is not null)
            {
                var currentRoles = await _userManager.GetRolesAsync(user);

                // Prevent removing the last SuperAdmin
                if (currentRoles.Contains("SuperAdmin") && dto.Role != "SuperAdmin")
                {
                    var superAdmins = await _userManager.GetUsersInRoleAsync("SuperAdmin");
                    if (superAdmins.Count <= 1)
                        throw new InvalidOperationException("Cannot demote the last SuperAdmin.");
                }

                if (currentRoles.Any())
                    await _userManager.RemoveFromRolesAsync(user, currentRoles);
                await _userManager.AddToRoleAsync(user, dto.Role);
            }

            await _userManager.UpdateAsync(user);

            var roles = await _userManager.GetRolesAsync(user);
            var userDto = _mapper.Map<UserResponseDto>(user);
            userDto.Role = roles.FirstOrDefault() ?? string.Empty;
            return userDto;
        }

        public async Task<bool> DeactivateUserAsync(string userId, string performedByUserId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null) return false;

            user.IsActive = false;
            await _userManager.UpdateAsync(user);
            // Actor is the admin performing the action; the target is the entity id.
            await WriteAuditAsync(performedByUserId, "DeactivateAccount", "User", userId, success: true);
            return true;
        }

        public async Task<IEnumerable<UserResponseDto>> GetAllUsersAsync()
        {
            // Pending registrations are not accounts yet; they are listed on the Admin's
            // registrations page instead.
            var users = await _db.Users
                .Include(u => u.Section)
                .Include(u => u.HandledSections).ThenInclude(a => a.Section)
                .AsSplitQuery()
                .Where(u => u.RegistrationStatus == RegistrationStatus.Approved)
                .OrderBy(u => u.LastName)
                .ToListAsync();

            // One query for every user's role instead of GetRolesAsync per user, which issued a
            // separate round-trip for each account on every load of the user list.
            var roleByUser = (await (
                    from ur in _db.UserRoles
                    join r in _db.Roles on ur.RoleId equals r.Id
                    select new { ur.UserId, r.Name })
                .ToListAsync())
                .GroupBy(x => x.UserId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Name).First());

            return users.Select(u =>
            {
                var dto = _mapper.Map<UserResponseDto>(u);
                dto.Role = roleByUser.GetValueOrDefault(u.Id) ?? string.Empty;
                return dto;
            }).ToList();
        }

        public async Task<UserResponseDto> CreateUserAsync(CreateUserRequestDto dto, string createdById)
        {
            if (!ValidRoles.Contains(dto.Role))
                throw new ArgumentException($"'{dto.Role}' is not a valid role.");

            // The SuperAdmin's only job is staffing: Admin/subject teacher and Faculty accounts.
            // Students self-register and are approved by their block's Admin; another SuperAdmin
            // is not something this screen may mint.
            if (dto.Role is not ("Admin" or "Faculty"))
                throw new ArgumentException("The SuperAdmin can only create Admin/subject teacher and Faculty accounts.");

            string? studentId = null;
            int? sectionId = null;
            var handledSectionIds = new List<int>();
            if (dto.Role == "Admin")
            {
                handledSectionIds = dto.SectionIds.Distinct().ToList();
                var anySection = await _db.Sections.AnyAsync(s => s.IsActive);
                if (handledSectionIds.Count == 0 && anySection)
                    throw new ArgumentException("Pick at least one block for the Admin/subject teacher to handle.");

                var valid = await _db.Sections
                    .Where(s => handledSectionIds.Contains(s.Id) && s.IsActive)
                    .Select(s => s.Id)
                    .ToListAsync();
                var missing = handledSectionIds.Except(valid).ToList();
                if (missing.Count > 0)
                    throw new ArgumentException("One of the selected blocks does not exist or is inactive.");
            }
            if (dto.Role == "Student")
            {
                studentId = dto.StudentId?.Trim();
                if (string.IsNullOrEmpty(studentId))
                    throw new ArgumentException("Student ID is required for student accounts.");
                if (dto.SectionId is null)
                    throw new ArgumentException("Block/section is required for student accounts.");
                if (!await _db.Sections.AnyAsync(s => s.Id == dto.SectionId && s.IsActive))
                    throw new ArgumentException("The selected block/section does not exist or is inactive.");
                if (await _db.Users.AnyAsync(u => u.StudentId == studentId))
                    throw new InvalidOperationException($"Student ID {studentId} is already registered.");
                sectionId = dto.SectionId;
            }

            var email = dto.Email.Trim();
            if (await _userManager.FindByEmailAsync(email) is not null)
                throw new InvalidOperationException("Email is already in use by another account.");

            var user = new ApplicationUser
            {
                FirstName = dto.FirstName.Trim(),
                MiddleName = string.IsNullOrWhiteSpace(dto.MiddleName) ? null : dto.MiddleName.Trim(),
                LastName = dto.LastName.Trim(),
                Email = email,
                UserName = email,
                StudentId = studentId,
                SectionId = sectionId,
                IsActive = true,
                // Created and vouched for by the SuperAdmin, so no email or approval step.
                EmailConfirmed = true,
                RegistrationStatus = RegistrationStatus.Approved,
                ReviewedById = createdById,
                ReviewedAt = PhilippineTime.Now,
            };

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded)
                throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));

            await _userManager.AddToRoleAsync(user, dto.Role);

            if (handledSectionIds.Count > 0)
            {
                _db.SectionAdminAssignments.AddRange(handledSectionIds.Select(id =>
                    new SectionAdminAssignment { SectionId = id, AdminId = user.Id }));
                await _db.SaveChangesAsync();
            }

            await WriteAuditAsync(createdById, "CreateAccount", "User", user.Id, success: true);

            await _db.Entry(user).Reference(u => u.Section).LoadAsync();
            await _db.Entry(user).Collection(u => u.HandledSections).Query().Include(a => a.Section).LoadAsync();
            var userDto = _mapper.Map<UserResponseDto>(user);
            userDto.Role = dto.Role;
            return userDto;
        }

        /// <summary>
        /// Replaces the blocks an Admin/subject teacher handles. Removing a block takes away that
        /// Admin's right to approve registrations for it, so the SuperAdmin is the only caller.
        /// </summary>
        public async Task<UserResponseDto> SetAdminSectionsAsync(string userId, IEnumerable<int> sectionIds, string actorId)
        {
            var user = await _db.Users
                .Include(u => u.Section)
                .Include(u => u.HandledSections)
                .FirstOrDefaultAsync(u => u.Id == userId)
                ?? throw new KeyNotFoundException("User not found.");

            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault() ?? string.Empty;
            if (role != "Admin")
                throw new InvalidOperationException("Only Admin/subject teacher accounts handle blocks.");

            var wanted = sectionIds.Distinct().ToList();
            var valid = await _db.Sections
                .Where(s => wanted.Contains(s.Id) && s.IsActive)
                .Select(s => s.Id)
                .ToListAsync();
            if (wanted.Except(valid).Any())
                throw new InvalidOperationException("One of the selected blocks does not exist or is inactive.");

            _db.SectionAdminAssignments.RemoveRange(
                user.HandledSections.Where(a => !valid.Contains(a.SectionId)));
            var existing = user.HandledSections.Select(a => a.SectionId).ToHashSet();
            _db.SectionAdminAssignments.AddRange(valid
                .Where(id => !existing.Contains(id))
                .Select(id => new SectionAdminAssignment { SectionId = id, AdminId = user.Id }));
            await _db.SaveChangesAsync();

            await WriteAuditAsync(actorId, "SetAdminSections", "User", user.Id, success: true);

            // Re-read rather than trusting the tracked collection: the rows just removed may or
            // may not have been fixed up out of it, and the response has to be exact.
            var dto = _mapper.Map<UserResponseDto>(user);
            dto.Role = role;
            dto.HandledSections = await _db.SectionAdminAssignments
                .Where(a => a.AdminId == user.Id)
                .Select(a => new SectionOptionDto
                {
                    Id = a.Section.Id,
                    Name = a.Section.Name,
                    AcademicYear = a.Section.AcademicYear,
                })
                .ToListAsync();
            return dto;
        }

        public async Task AdminForceSetPasswordAsync(string userId, string newPassword)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("User not found.");

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, newPassword);
            if (!result.Succeeded)
                throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        public async Task<UserResponseDto> AdminSetEmailAsync(string userId, string newEmail)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("User not found.");

            var existing = await _userManager.FindByEmailAsync(newEmail);
            if (existing is not null && existing.Id != userId)
                throw new InvalidOperationException("Email is already in use by another account.");

            await _userManager.SetEmailAsync(user, newEmail);
            await _userManager.SetUserNameAsync(user, newEmail);
            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);

            var roles = await _userManager.GetRolesAsync(user);
            var dto = _mapper.Map<UserResponseDto>(user);
            dto.Role = roles.FirstOrDefault() ?? string.Empty;
            return dto;
        }

        public async Task AdminDisableTwoFactorAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("User not found.");
            await _userManager.SetTwoFactorEnabledAsync(user, false);
        }

        public async Task AdminEnableTwoFactorAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("User not found.");
            if (!user.EmailConfirmed)
                throw new InvalidOperationException("Cannot enable 2FA for a user whose email is not confirmed.");
            await _userManager.SetTwoFactorEnabledAsync(user, true);
        }

        private async Task WriteAuditAsync(string? userId, string action, string entityName, string? entityId, bool success)
        {
            try
            {
                _db.AuditLogs.Add(new AuditLog
                {
                    UserId = userId,
                    Action = action,
                    EntityName = entityName,
                    EntityId = entityId,
                    Success = success
                });
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to write audit log for action {Action}", action);
            }
        }

        private string GenerateJwt(ApplicationUser user, string role)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _config["Jwt:Key"] is { Length: > 0 } jwtKey ? jwtKey : throw new InvalidOperationException("JWT key not configured.")));

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id),
                new(ClaimTypes.Email, user.Email ?? string.Empty),
                new(ClaimTypes.GivenName, user.FirstName),
                new(ClaimTypes.Surname, user.LastName),
                new(ClaimTypes.Role, role)
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
