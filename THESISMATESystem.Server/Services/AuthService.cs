using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
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

        public AuthService(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration config,
            IMapper mapper,
            AppDbContext db,
            IEmailService email,
            ILogger<AuthService> logger)
        {
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
                return new AuthResponseDto { TwoFactorRequired = true, TempUserId = user.Id };
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
            if (dto.Role != "Student")
                throw new InvalidOperationException("Self-registration is only available for students. Other roles must be created by an administrator.");

            var studentId = dto.StudentId.Trim();
            var duplicateId = await _userManager.Users
                .AnyAsync(u => u.StudentId == studentId);
            if (duplicateId)
                throw new InvalidOperationException($"DUPLICATE_STUDENT_ID");

            var user = new ApplicationUser
            {
                FirstName = dto.FirstName,
                MiddleName = string.IsNullOrWhiteSpace(dto.MiddleName) ? null : dto.MiddleName.Trim(),
                LastName = dto.LastName,
                StudentId = studentId,
                Email = dto.Email,
                UserName = dto.Email,
                IsActive = true,
                EmailConfirmed = false
            };

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded)
                throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));

            await _userManager.AddToRoleAsync(user, "Student");

            var confirmToken = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            // Base64Url-encode so the token survives email links intact (no +/= chars that break URLs)
            var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(confirmToken));
            var clientUrl = _config["ClientBaseUrl"] ?? "https://localhost:62535";
            var verifyUrl = $"{clientUrl}/verify-email?userId={user.Id}&token={encodedToken}";

            try
            {
                await _email.SendEmailAsync(user.Email!, "Verify your ThesisMate account", BuildVerificationEmail(user.FirstName, verifyUrl));
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
                Message = "Registration successful. Please check your email to verify your account.",
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
                  <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">Hi {firstName}, welcome to ThesisMate! Click the button below to verify your email and activate your student account.</p>
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

        public async Task<AuthResponseDto> TwoFactorLoginAsync(string userId, string code)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new UnauthorizedAccessException("Invalid session. Please log in again.");

            var valid = await _userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider, code);
            if (!valid)
            {
                await WriteAuditAsync(user.Id, "Login2FA", "User", user.Email, success: false);
                throw new UnauthorizedAccessException("Invalid or expired code. Please try again.");
            }

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
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null) return null;

            var roles = await _userManager.GetRolesAsync(user);
            var dto = _mapper.Map<UserResponseDto>(user);
            dto.Role = roles.FirstOrDefault() ?? string.Empty;
            return dto;
        }

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

        public async Task<bool> DeactivateUserAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null) return false;

            user.IsActive = false;
            await _userManager.UpdateAsync(user);
            await WriteAuditAsync(userId, "DeactivateAccount", "User", userId, success: true);
            return true;
        }

        public async Task<IEnumerable<UserResponseDto>> GetAllUsersAsync()
        {
            var users = await _userManager.Users.OrderBy(u => u.LastName).ToListAsync();
            var dtos = new List<UserResponseDto>();

            foreach (var u in users)
            {
                var roles = await _userManager.GetRolesAsync(u);
                var dto = _mapper.Map<UserResponseDto>(u);
                dto.Role = roles.FirstOrDefault() ?? string.Empty;
                dtos.Add(dto);
            }

            return dtos;
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
                _config["Jwt:Key"] ?? throw new InvalidOperationException("JWT key not configured.")));

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
