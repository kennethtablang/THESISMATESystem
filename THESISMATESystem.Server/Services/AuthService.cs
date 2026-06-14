using AutoMapper;
using Microsoft.AspNetCore.Identity;
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

        public AuthService(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration config,
            IMapper mapper,
            AppDbContext db,
            IEmailService email)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _config = config;
            _mapper = mapper;
            _db = db;
            _email = email;
        }

        public async Task<AuthResponseDto> LoginAsync(LoginRequestDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email)
                ?? throw new UnauthorizedAccessException("Invalid credentials.");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is deactivated.");

            if (!user.EmailConfirmed)
                throw new UnauthorizedAccessException("Please verify your email address before logging in. Check your inbox for the verification link.");

            var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);
            if (!result.Succeeded)
                throw new UnauthorizedAccessException("Invalid credentials.");

            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault() ?? string.Empty;
            var token = GenerateJwt(user, role);

            var userDto = _mapper.Map<UserResponseDto>(user);
            userDto.Role = role;

            return new AuthResponseDto
            {
                Token = token,
                RefreshToken = string.Empty, // extend with refresh token if needed
                Expires = DateTime.UtcNow.AddHours(8),
                User = userDto
            };
        }

        public async Task<RegisterResponseDto> RegisterAsync(RegisterRequestDto dto)
        {
            if (dto.Role != "Student")
                throw new InvalidOperationException("Self-registration is only available for students. Other roles must be created by an administrator.");

            var user = new ApplicationUser
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
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
            var encodedToken = Uri.EscapeDataString(confirmToken);
            var clientUrl = _config["ClientBaseUrl"] ?? "https://localhost:62535";
            var verifyUrl = $"{clientUrl}/verify-email?userId={user.Id}&token={encodedToken}";

            await _email.SendEmailAsync(user.Email!, "Verify your ThesisMate account", BuildVerificationEmail(user.FirstName, verifyUrl));

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

            var result = await _userManager.ConfirmEmailAsync(user, token);
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

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            // TODO: send email with reset link containing token
            return true;
        }

        public async Task<bool> ResetPasswordAsync(ResetPasswordRequestDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email)
                ?? throw new KeyNotFoundException("User not found.");

            var result = await _userManager.ResetPasswordAsync(user, dto.Token, dto.NewPassword);
            return result.Succeeded;
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

        public async Task<UserResponseDto> UpdateUserAsync(string userId, UpdateUserRequestDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("User not found.");

            if (dto.FirstName is not null) user.FirstName = dto.FirstName;
            if (dto.LastName is not null) user.LastName = dto.LastName;
            if (dto.PhoneNumber is not null) user.PhoneNumber = dto.PhoneNumber;
            if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;

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
