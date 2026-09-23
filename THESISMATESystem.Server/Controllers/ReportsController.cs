using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Faculty")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reports;
        private readonly IDefenseService _defenses;
        private readonly IGroupAccessChecker _groupAccess;

        public ReportsController(IReportService reports, IDefenseService defenses, IGroupAccessChecker groupAccess)
        {
            _reports = reports;
            _defenses = defenses;
            _groupAccess = groupAccess;
        }

        private (string UserId, string Role) Caller()
            => (User.FindFirstValue(ClaimTypes.NameIdentifier)!, User.FindFirstValue(ClaimTypes.Role)!);

        [HttpGet("group/{groupId:int}/progress")]
        public async Task<IActionResult> GroupProgress(int groupId)
        {
            var (userId, role) = Caller();
            if (!await _groupAccess.CanAccessGroupAsync(userId, role, groupId))
                return Forbid();

            try
            {
                var bytes = await _reports.GenerateGroupProgressReportAsync(groupId);
                return File(bytes, "application/pdf", $"group_{groupId}_progress.pdf");
            }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpGet("milestone-completion")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> MilestoneCompletion([FromQuery] string academicYear)
        {
            try
            {
                var bytes = await _reports.GenerateMilestoneCompletionReportAsync(academicYear);
                return File(bytes, "application/pdf", $"milestone_completion_{academicYear}.pdf");
            }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpGet("defense/{scheduleId:int}/outcome")]
        public async Task<IActionResult> DefenseOutcome(int scheduleId)
        {
            var schedule = await _defenses.GetScheduleByIdAsync(scheduleId);
            if (schedule is null) return NotFound();

            var (userId, role) = Caller();
            if (!await _groupAccess.CanAccessGroupAsync(userId, role, schedule.CapstoneGroupId))
                return Forbid();

            try
            {
                var bytes = await _reports.GenerateDefenseOutcomeReportAsync(scheduleId);
                return File(bytes, "application/pdf", $"defense_{scheduleId}_outcome.pdf");
            }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpGet("all-groups")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AllGroups(
            [FromQuery] string? adviserId,
            [FromQuery] string? academicYear,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to)
        {
            try
            {
                var bytes = await _reports.GenerateAllGroupsReportAsync(adviserId, academicYear, from, to);
                return File(bytes, "application/pdf", "all_groups_report.pdf");
            }
            catch (KeyNotFoundException) { return NotFound(); }
        }
    }
}
