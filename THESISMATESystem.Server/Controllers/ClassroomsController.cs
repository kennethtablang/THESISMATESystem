using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/classrooms")]
    [Authorize]
    public class ClassroomsController : ControllerBase
    {
        private readonly IClassroomService _classrooms;

        public ClassroomsController(IClassroomService classrooms) => _classrooms = classrooms;

        // POST /api/classrooms — FacultyIC creates a classroom
        [HttpPost]
        [Authorize(Roles = "FacultyIC,Admin,SuperAdmin")]
        public async Task<IActionResult> Create([FromBody] CreateClassroomRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await _classrooms.CreateClassroomAsync(userId, dto);
            return CreatedAtAction(nameof(GetMyClassrooms), new { }, result);
        }

        // GET /api/classrooms/my — FacultyIC gets all their classrooms
        [HttpGet("my")]
        [Authorize(Roles = "FacultyIC,Admin,SuperAdmin")]
        public async Task<IActionResult> GetMyClassrooms()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return Ok(await _classrooms.GetMyClassroomsAsync(userId));
        }

        // POST /api/classrooms/join — Student joins via join code
        [HttpPost("join")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> Join([FromBody] JoinClassroomRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await _classrooms.JoinClassroomAsync(userId, dto);
                return Ok(result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        }

        // GET /api/classrooms/my-class — Student gets their active classroom
        [HttpGet("my-class")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetStudentClassroom()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await _classrooms.GetStudentClassroomAsync(userId);
            return result is null ? NotFound() : Ok(result);
        }

        // GET /api/classrooms/{id}/enrollments — FacultyIC gets enrolled student list
        [HttpGet("{id:int}/enrollments")]
        [Authorize(Roles = "FacultyIC,Admin,SuperAdmin")]
        public async Task<IActionResult> GetEnrollments(int id)
        {
            try { return Ok(await _classrooms.GetEnrollmentsAsync(id)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        // POST /api/classrooms/{id}/announcements — FacultyIC posts an announcement
        [HttpPost("{id:int}/announcements")]
        [Authorize(Roles = "FacultyIC,Admin,SuperAdmin")]
        public async Task<IActionResult> PostAnnouncement(int id, [FromBody] PostAnnouncementRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _classrooms.PostAnnouncementAsync(id, userId, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        // GET /api/classrooms/{id}/announcements?groupId=... — Get announcements for a classroom
        [HttpGet("{id:int}/announcements")]
        public async Task<IActionResult> GetAnnouncements(int id, [FromQuery] int? groupId = null)
            => Ok(await _classrooms.GetAnnouncementsAsync(id, groupId));

        // GET /api/classrooms/announcements/my — Student gets their relevant announcements
        [HttpGet("announcements/my")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetMyAnnouncements()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return Ok(await _classrooms.GetStudentAnnouncementsAsync(userId));
        }

        // POST /api/classrooms/assign-group — FacultyIC assigns students to a capstone group
        [HttpPost("assign-group")]
        [Authorize(Roles = "FacultyIC,Admin,SuperAdmin")]
        public async Task<IActionResult> AssignStudentsToGroup([FromBody] AssignStudentsToGroupRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await _classrooms.AssignStudentsToGroupAsync(userId, dto);
                return Ok(new { message = "Students assigned successfully." });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        }

        // POST /api/classrooms/{id}/regenerate-code — FacultyIC gets a new join code
        [HttpPost("{id:int}/regenerate-code")]
        [Authorize(Roles = "FacultyIC,Admin,SuperAdmin")]
        public async Task<IActionResult> RegenerateCode(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                await _classrooms.RegenerateJoinCodeAsync(id, userId);
                return Ok(new { message = "Join code regenerated." });
            }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }
    }
}
