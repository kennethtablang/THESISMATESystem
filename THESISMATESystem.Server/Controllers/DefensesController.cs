using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DefensesController : ControllerBase
    {
        private readonly IDefenseService _defenses;
        private readonly IGroupAccessChecker _groupAccess;
        private readonly IDefenseAutoScheduler _autoScheduler;

        public DefensesController(IDefenseService defenses, IGroupAccessChecker groupAccess, IDefenseAutoScheduler autoScheduler)
        {
            _defenses = defenses;
            _groupAccess = groupAccess;
            _autoScheduler = autoScheduler;
        }

        private async Task<bool> CanAccessGroupAsync(int groupId)
            => await _groupAccess.CanAccessGroupAsync(
                User.FindFirstValue(ClaimTypes.NameIdentifier)!,
                User.FindFirstValue(ClaimTypes.Role)!,
                groupId);

        // Resolves the group behind a defense schedule, or null when the schedule is missing.
        private async Task<int?> GroupOfScheduleAsync(int scheduleId)
            => (await _defenses.GetScheduleByIdAsync(scheduleId))?.CapstoneGroupId;

        [HttpGet]
        [Authorize(Roles = "Admin,Faculty")]
        public async Task<IActionResult> GetAll()
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            var facultyId = role == "Faculty" ? User.FindFirstValue(ClaimTypes.NameIdentifier) : null;
            return Ok(await _defenses.GetAllSchedulesAsync(facultyId));
        }

        [HttpGet("my-schedules")]
        [Authorize(Roles = "Faculty")]
        public async Task<IActionResult> GetMySchedules()
        {
            var panelistId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return Ok(await _defenses.GetSchedulesByPanelistAsync(panelistId));
        }

        [HttpGet("coverage")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetCoverage([FromQuery] string academicYear)
        {
            if (string.IsNullOrWhiteSpace(academicYear))
                return BadRequest(new { message = "academicYear is required." });
            return Ok(await _defenses.GetCoverageAsync(academicYear));
        }

        [HttpGet("group/{groupId:int}")]
        public async Task<IActionResult> GetByGroup(int groupId)
        {
            if (!await CanAccessGroupAsync(groupId)) return Forbid();
            return Ok(await _defenses.GetSchedulesByGroupAsync(groupId));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var schedule = await _defenses.GetScheduleByIdAsync(id);
            if (schedule is null) return NotFound();
            if (!await CanAccessGroupAsync(schedule.CapstoneGroupId)) return Forbid();
            return Ok(schedule);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create(CreateDefenseScheduleRequestDto dto)
        {
            try { var result = await _defenses.CreateScheduleAsync(dto); return CreatedAtAction(nameof(GetById), new { id = result.Id }, result); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, UpdateDefenseScheduleRequestDto dto)
        {
            try { return Ok(await _defenses.UpdateScheduleAsync(id, dto)); }
            catch (KeyNotFoundException)          { return NotFound(); }
            catch (InvalidOperationException ex)  { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPatch("{id:int}/cancel")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Cancel(int id)
        {
            var success = await _defenses.CancelScheduleAsync(id);
            return success ? Ok() : NotFound();
        }

        [HttpPatch("{id:int}/rating-status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SetRatingStatus(int id, [FromBody] bool isOpen)
        {
            try
            {
                var success = await _defenses.SetRatingOpenAsync(id, isOpen);
                return success ? Ok() : NotFound();
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // PATCH /api/defenses/{id}/complete — marks the defense done, which opens rating.
        // Defenses are also completed automatically once their scheduled end time passes.
        [HttpPatch("{id:int}/complete")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Complete(int id)
        {
            try { return Ok(await _defenses.CompleteDefenseAsync(id)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // POST /api/defenses/auto-schedule/preview — proposes a conflict-free schedule; saves nothing
        [HttpPost("auto-schedule/preview")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AutoSchedulePreview(AutoScheduleRequestDto dto)
        {
            try { return Ok(await _autoScheduler.ProposeAsync(dto)); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // "Schedule group 1 and the rest follow" — proposes the remaining groups back-to-back
        // behind a defense that is already saved. Still a proposal; nothing is written yet.
        [HttpPost("auto-schedule/chain")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AutoScheduleChain(ChainScheduleRequestDto dto)
        {
            try { return Ok(await _autoScheduler.ProposeChainAsync(dto)); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // POST /api/defenses/auto-schedule/confirm — saves the proposal the Admin reviewed
        [HttpPost("auto-schedule/confirm")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AutoScheduleConfirm(ConfirmAutoScheduleRequestDto dto)
        {
            try { return Ok(await _autoScheduler.ConfirmAsync(dto)); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // Ratings
        [HttpPost("ratings")]
        [Authorize(Roles = "Faculty")]
        public async Task<IActionResult> SubmitRating(SubmitRatingRequestDto dto)
        {
            var panelistId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _defenses.SubmitRatingAsync(panelistId, dto)); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("{id:int}/ratings")]
        [Authorize(Roles = "Faculty,Admin")]
        public async Task<IActionResult> GetRatings(int id)
        {
            var groupId = await GroupOfScheduleAsync(id);
            if (groupId is null) return NotFound();
            if (!await CanAccessGroupAsync(groupId.Value)) return Forbid();
            return Ok(await _defenses.GetRatingsByScheduleAsync(id));
        }

        [HttpGet("{id:int}/consolidated")]
        public async Task<IActionResult> GetConsolidated(int id)
        {
            var groupId = await GroupOfScheduleAsync(id);
            if (groupId is null) return NotFound();
            if (!await CanAccessGroupAsync(groupId.Value)) return Forbid();

            try { return Ok(await _defenses.GetConsolidatedRatingAsync(id)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpPost("{id:int}/finalize")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Finalize(int id)
        {
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var success = await _defenses.FinalizeRatingsAsync(id, adminId);
            return success ? Ok() : BadRequest(new { message = "No pending ratings to finalize." });
        }

        // Criteria / Rubric
        [HttpGet("criteria")]
        public async Task<IActionResult> GetCriteria([FromQuery] DefensePhase? phase)
            => Ok(await _defenses.GetCriteriaAsync(phase));

        [HttpPost("criteria")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateCriterion(CreateCriterionRequestDto dto)
        {
            try { return Ok(await _defenses.CreateCriterionAsync(dto)); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("criteria/{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateCriterion(int id, UpdateCriterionRequestDto dto)
        {
            try { return Ok(await _defenses.UpdateCriterionAsync(id, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("criteria/{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteCriterion(int id)
        {
            var success = await _defenses.DeleteCriterionAsync(id);
            return success ? Ok() : NotFound();
        }
    }
}
