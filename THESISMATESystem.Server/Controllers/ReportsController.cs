using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,SuperAdmin,Faculty")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reports;

        public ReportsController(IReportService reports) => _reports = reports;

        [HttpGet("group/{groupId:int}/progress")]
        public async Task<IActionResult> GroupProgress(int groupId)
        {
            try
            {
                var bytes = await _reports.GenerateGroupProgressReportAsync(groupId);
                return File(bytes, "application/pdf", $"group_{groupId}_progress.pdf");
            }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpGet("milestone-completion")]
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
            try
            {
                var bytes = await _reports.GenerateDefenseOutcomeReportAsync(scheduleId);
                return File(bytes, "application/pdf", $"defense_{scheduleId}_outcome.pdf");
            }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpGet("all-groups")]
        [Authorize(Roles = "Admin,SuperAdmin")]
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
