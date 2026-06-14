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

        public AuthController(IAuthService auth) => _auth = auth;

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
                ? Ok(new { message = "Email verified successfully. You can now log in." })
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
            return Ok(await _auth.UpdateUserAsync(userId, dto));
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(ChangePasswordRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var success = await _auth.ChangePasswordAsync(userId, dto);
            return success ? Ok() : BadRequest(new { message = "Password change failed." });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] string email)
        {
            await _auth.ForgotPasswordAsync(email);
            return Ok(new { message = "If that email is registered, a reset link has been sent." });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordRequestDto dto)
        {
            var success = await _auth.ResetPasswordAsync(dto);
            return success ? Ok() : BadRequest(new { message = "Password reset failed." });
        }

        [HttpGet("users")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> GetAllUsers() => Ok(await _auth.GetAllUsersAsync());

        [HttpPut("users/{userId}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> UpdateUser(string userId, UpdateUserRequestDto dto)
        {
            try { return Ok(await _auth.UpdateUserAsync(userId, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpPatch("users/{userId}/deactivate")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> DeactivateUser(string userId)
        {
            var success = await _auth.DeactivateUserAsync(userId);
            return success ? Ok() : NotFound();
        }
    }
}
