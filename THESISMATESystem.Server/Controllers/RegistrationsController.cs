using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    // Approving student registrations is an Admin duty; the SuperAdmin manages accounts instead.
    [ApiController]
    [Route("api/registrations")]
    [Authorize(Roles = "Admin")]
    public class RegistrationsController : ControllerBase
    {
        private readonly IRegistrationService _registrations;

        public RegistrationsController(IRegistrationService registrations) => _registrations = registrations;

        [HttpGet("pending")]
        public async Task<IActionResult> GetPending() => Ok(await _registrations.GetPendingAsync());

        [HttpPost("{userId}/approve")]
        public async Task<IActionResult> Approve(string userId)
        {
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await _registrations.ApproveAsync(userId, adminId);
                return Ok(new { message = "Registration approved." });
            }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("{userId}/reject")]
        public async Task<IActionResult> Reject(string userId, [FromBody] RejectRegistrationRequestDto dto)
        {
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await _registrations.RejectAsync(userId, adminId, dto.Reason);
                return Ok(new { message = "Registration rejected." });
            }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}
