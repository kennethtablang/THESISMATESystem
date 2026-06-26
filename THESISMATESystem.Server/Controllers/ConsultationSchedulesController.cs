using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/consultation-schedules")]
    [Authorize]
    public class ConsultationSchedulesController : ControllerBase
    {
        private readonly IConsultationScheduleService _schedules;

        public ConsultationSchedulesController(IConsultationScheduleService schedules) => _schedules = schedules;

        [HttpGet]
        public async Task<IActionResult> GetAll()
            => Ok(await _schedules.GetAllSchedulesAsync());

        [HttpGet("my-schedules")]
        [Authorize(Roles = "Faculty")]
        public async Task<IActionResult> GetMySchedules()
        {
            var facultyICId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return Ok(await _schedules.GetSchedulesByFacultyICAsync(facultyICId));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var schedule = await _schedules.GetScheduleByIdAsync(id);
            return schedule is null ? NotFound() : Ok(schedule);
        }

        [HttpPost]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> Create([FromBody] CreateConsultationScheduleRequestDto dto)
        {
            var facultyICId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await _schedules.CreateScheduleAsync(facultyICId, dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateConsultationScheduleRequestDto dto)
        {
            var facultyICId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _schedules.UpdateScheduleAsync(id, facultyICId, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }

        [HttpPatch("{id:int}/status")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateScheduleStatusRequestDto dto)
        {
            var success = await _schedules.UpdateScheduleStatusAsync(id, dto);
            return success ? Ok() : NotFound();
        }

        [HttpPost("requests")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> RequestSlot([FromBody] RequestConsultationSlotDto dto)
        {
            var requestedById = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _schedules.RequestSlotAsync(requestedById, dto)); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("{id:int}/requests")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> GetRequests(int id)
            => Ok(await _schedules.GetRequestsByScheduleAsync(id));

        [HttpGet("my-group-requests/{groupId:int}")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetMyGroupRequests(int groupId)
            => Ok(await _schedules.GetMyRequestsAsync(groupId));

        [HttpPatch("requests/{requestId:int}/respond")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> Respond(int requestId, [FromBody] RespondToConsultationRequestDto dto)
        {
            var facultyICId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _schedules.RespondToRequestAsync(requestId, facultyICId, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }
    }
}
