using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/monitoring")]
    [Authorize]
    public class MonitoringController : ControllerBase
    {
        private readonly IMonitoringService _monitoring;

        public MonitoringController(IMonitoringService monitoring) => _monitoring = monitoring;

        // All groups summary — for Admin, SuperAdmin, Adviser, FacultyIC
        [HttpGet("groups")]
        [Authorize(Roles = "Admin,SuperAdmin,Adviser,FacultyIC")]
        public async Task<IActionResult> GetSummary()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role   = User.FindFirstValue(ClaimTypes.Role)!;
            return Ok(await _monitoring.GetSummaryAsync(userId, role));
        }

        // Single group detail — Admin, SuperAdmin, Adviser (own groups only), FacultyIC
        [HttpGet("groups/{id:int}")]
        [Authorize(Roles = "Admin,SuperAdmin,Adviser,FacultyIC")]
        public async Task<IActionResult> GetGroupHealth(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role   = User.FindFirstValue(ClaimTypes.Role)!;
            var result = await _monitoring.GetGroupHealthAsync(id, userId, role);
            return result is null ? NotFound() : Ok(result);
        }

        // Student views their own group's health
        [HttpGet("my-group")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetMyGroupHealth()
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await _monitoring.GetMyGroupHealthAsync(studentId);
            return result is null ? NotFound(new { message = "No active group found." }) : Ok(result);
        }
    }
}
