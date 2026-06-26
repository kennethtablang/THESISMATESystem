using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DefensesController : ControllerBase
    {
        private readonly IDefenseService _defenses;

        public DefensesController(IDefenseService defenses) => _defenses = defenses;

        [HttpGet]
        [Authorize(Roles = "Admin,SuperAdmin,Faculty")]
        public async Task<IActionResult> GetAll() => Ok(await _defenses.GetAllSchedulesAsync());

        [HttpGet("my-schedules")]
        [Authorize(Roles = "Faculty")]
        public async Task<IActionResult> GetMySchedules()
        {
            var panelistId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return Ok(await _defenses.GetSchedulesByPanelistAsync(panelistId));
        }

        [HttpGet("group/{groupId:int}")]
        public async Task<IActionResult> GetByGroup(int groupId)
            => Ok(await _defenses.GetSchedulesByGroupAsync(groupId));

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var schedule = await _defenses.GetScheduleByIdAsync(id);
            return schedule is null ? NotFound() : Ok(schedule);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Create(CreateDefenseScheduleRequestDto dto)
        {
            var result = await _defenses.CreateScheduleAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Update(int id, UpdateDefenseScheduleRequestDto dto)
        {
            try { return Ok(await _defenses.UpdateScheduleAsync(id, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpPatch("{id:int}/cancel")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Cancel(int id)
        {
            var success = await _defenses.CancelScheduleAsync(id);
            return success ? Ok() : NotFound();
        }

        [HttpPatch("{id:int}/rating-status")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> SetRatingStatus(int id, [FromBody] bool isOpen)
        {
            var success = await _defenses.SetRatingOpenAsync(id, isOpen);
            return success ? Ok() : NotFound();
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
        public async Task<IActionResult> GetRatings(int id)
            => Ok(await _defenses.GetRatingsByScheduleAsync(id));

        [HttpGet("{id:int}/consolidated")]
        public async Task<IActionResult> GetConsolidated(int id)
        {
            try { return Ok(await _defenses.GetConsolidatedRatingAsync(id)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpPost("{id:int}/finalize")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Finalize(int id)
        {
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var success = await _defenses.FinalizeRatingsAsync(id, adminId);
            return success ? Ok() : BadRequest(new { message = "No pending ratings to finalize." });
        }

        // Criteria
        [HttpGet("criteria")]
        public async Task<IActionResult> GetCriteria() => Ok(await _defenses.GetCriteriaAsync());

        [HttpPost("criteria")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> CreateCriterion(CreateCriterionRequestDto dto)
            => Ok(await _defenses.CreateCriterionAsync(dto));
    }
}
