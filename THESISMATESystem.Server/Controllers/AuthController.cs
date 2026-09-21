using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _auth;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService auth, ILogger<AuthController> logger)
        {
            _auth = auth;
            _logger = logger;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequestDto dto)
        {
            try { return Ok(await _auth.LoginAsync(dto)); }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequestDto dto)
        {
            try { return Ok(await _auth.RegisterAsync(dto)); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail(VerifyEmailRequestDto dto)
        {
            var success = await _auth.VerifyEmailAsync(dto.UserId, dto.Token);
            return success
                ? Ok(new { message = "Email verified. An administrator will review your registration; you will be emailed once it is approved." })
                : BadRequest(new { message = "The verification link is invalid or has expired. Please request a new verification email." });
        }

        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var profile = await _auth.GetProfileAsync(userId);
            return profile is null ? NotFound() : Ok(profile);
        }

        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile(UpdateUserRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var callerRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            // Self-service covers personal details only. Status and role go through the admin
            // endpoint; accepting IsActive here let a just-deactivated user reactivate themselves.
            dto.IsActive = null;
            dto.Role = null;
            try { return Ok(await _auth.UpdateUserAsync(userId, dto, callerRole)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(ChangePasswordRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var success = await _auth.ChangePasswordAsync(userId, dto);
                return success ? Ok() : BadRequest(new { message = "Current password is incorrect." });
            }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto dto)
        {
            try
            {
                await _auth.ForgotPasswordAsync(dto.Email.Trim());
                return Ok(new { message = "If that email is registered, a reset link has been sent." });
            }
            catch (Exception)
            {
                return Ok(new { message = "If that email is registered, a reset link has been sent." });
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordRequestDto dto)
        {
            var success = await _auth.ResetPasswordAsync(dto);
            return success ? Ok() : BadRequest(new { message = "The reset link is invalid or has expired. Please request a new one." });
        }

        [HttpGet("2fa/status")]
        [Authorize]
        public async Task<IActionResult> GetTwoFactorStatus()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return Ok(new { enabled = await _auth.GetTwoFactorStatusAsync(userId) });
        }

        [HttpPost("2fa/enable")]
        [Authorize]
        public async Task<IActionResult> EnableTwoFactor()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await _auth.EnableTwoFactorSendCodeAsync(userId);
                return Ok(new { message = "Verification code sent to your email." });
            }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (Exception ex)
            {
                // SMTP failures carry server and credential details that must not reach the client.
                _logger.LogError(ex, "Failed to send 2FA setup code to user {UserId}", userId);
                return BadRequest(new { message = "Unable to send the verification code. Please try again later." });
            }
        }

        [HttpPost("2fa/verify-setup")]
        [Authorize]
        public async Task<IActionResult> VerifyTwoFactorSetup([FromBody] TwoFactorVerifySetupRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var success = await _auth.VerifyAndEnableTwoFactorAsync(userId, dto.Code);
            return success ? Ok(new { message = "Two-factor authentication enabled." }) : BadRequest(new { message = "Invalid or expired code." });
        }

        [HttpPost("2fa/disable")]
        [Authorize]
        public async Task<IActionResult> DisableTwoFactor([FromBody] TwoFactorDisableRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await _auth.DisableTwoFactorAsync(userId, dto.Password);
                return Ok(new { message = "Two-factor authentication disabled." });
            }
            // 400, not 401: the caller is authenticated and only mistyped their password.
            // A 401 tells the client the session is invalid, and it would sign the user out.
            catch (UnauthorizedAccessException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("2fa/login")]
        public async Task<IActionResult> TwoFactorLogin([FromBody] TwoFactorLoginRequestDto dto)
        {
            try { return Ok(await _auth.TwoFactorLoginAsync(dto.UserId, dto.Code)); }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
        }

        // Admin reads the directory to pick advisers, panelists and students; only the SuperAdmin
        // may create or change accounts.
        [HttpGet("users")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> GetAllUsers() => Ok(await _auth.GetAllUsersAsync());

        [HttpPost("users")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> CreateUser(CreateUserRequestDto dto)
        {
            var callerId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _auth.CreateUserAsync(dto, callerId)); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("users/{userId}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> UpdateUser(string userId, UpdateUserRequestDto dto)
        {
            var callerRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            try { return Ok(await _auth.UpdateUserAsync(userId, dto, callerRole)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPatch("users/{userId}/deactivate")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> DeactivateUser(string userId)
        {
            var callerId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var success = await _auth.DeactivateUserAsync(userId, callerId);
            return success ? Ok() : NotFound();
        }

        [HttpPost("users/{userId}/reset-password")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> AdminForceResetPassword(string userId, [FromBody] AdminForcePasswordRequestDto dto)
        {
            try { await _auth.AdminForceSetPasswordAsync(userId, dto.NewPassword); return Ok(); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPatch("users/{userId}/email")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> AdminSetEmail(string userId, [FromBody] AdminSetEmailRequestDto dto)
        {
            try { return Ok(await _auth.AdminSetEmailAsync(userId, dto.Email)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPatch("users/{userId}/2fa/disable")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> AdminDisableTwoFactor(string userId)
        {
            try { await _auth.AdminDisableTwoFactorAsync(userId); return Ok(); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpPatch("users/{userId}/2fa/enable")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> AdminEnableTwoFactor(string userId)
        {
            try { await _auth.AdminEnableTwoFactorAsync(userId); return Ok(); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}
