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

        // POST /api/classrooms — Faculty creates a classroom
        [HttpPost]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> Create([FromBody] CreateClassroomRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await _classrooms.CreateClassroomAsync(userId, dto);
            return CreatedAtAction(nameof(GetMyClassrooms), new { }, result);
        }

        // GET /api/classrooms/my — Faculty gets all their classrooms
        [HttpGet("my")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
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

        // GET /api/classrooms/{id}/enrollments — Faculty gets enrolled student list
        [HttpGet("{id:int}/enrollments")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> GetEnrollments(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role   = User.FindFirstValue(ClaimTypes.Role)!;
            try { return Ok(await _classrooms.GetEnrollmentsAsync(id, userId, role)); }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        // POST /api/classrooms/{id}/announcements — Faculty posts an announcement
        [HttpPost("{id:int}/announcements")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> PostAnnouncement(int id, [FromBody] PostAnnouncementRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role   = User.FindFirstValue(ClaimTypes.Role)!;
            try { return Ok(await _classrooms.PostAnnouncementAsync(id, userId, role, dto)); }
            catch (UnauthorizedAccessException) { return Forbid(); }
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

        // POST /api/classrooms/assign-group — Faculty assigns students to a capstone group
        [HttpPost("assign-group")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> AssignStudentsToGroup([FromBody] AssignStudentsToGroupRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role   = User.FindFirstValue(ClaimTypes.Role)!;
            try
            {
                await _classrooms.AssignStudentsToGroupAsync(userId, role, dto);
                return Ok(new { message = "Students assigned successfully." });
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        }

        // POST /api/classrooms/{id}/groups — Faculty creates a capstone group within a classroom
        [HttpPost("{id:int}/groups")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> CreateGroupInClassroom(int id, [FromBody] CreateGroupInClassroomRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var userRole = User.FindFirstValue(ClaimTypes.Role)!;
            try
            {
                var result = await _classrooms.CreateGroupInClassroomAsync(id, userId, userRole, dto);
                return Ok(result);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // GET /api/classrooms/all — Admin/SuperAdmin sees every classroom
        [HttpGet("all")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> GetAll() => Ok(await _classrooms.GetAllClassroomsAsync());

        // POST /api/classrooms/{id}/invite — Admin invites students
        [HttpPost("{id:int}/invite")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> InviteStudents(int id, [FromBody] InviteStudentsRequestDto dto)
        {
            try { await _classrooms.InviteStudentsAsync(id, dto); return Ok(); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        }

        // GET /api/classrooms/invitations/my — Student's pending invitations
        [HttpGet("invitations/my")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetMyInvitations()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return Ok(await _classrooms.GetMyInvitationsAsync(userId));
        }

        // POST /api/classrooms/invitations/{id}/accept — Student accepts an invitation
        [HttpPost("invitations/{id:int}/accept")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> AcceptInvitation(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { await _classrooms.AcceptInvitationAsync(id, userId); return Ok(); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        // GET /api/classrooms/active-students — Students with active enrollment (for group assignment)
        [HttpGet("active-students")]
        [Authorize(Roles = "Admin,SuperAdmin,Faculty")]
        public async Task<IActionResult> GetActiveStudents()
            => Ok(await _classrooms.GetActiveEnrolledStudentsAsync());

        // POST /api/classrooms/{id}/regenerate-code — Faculty gets a new join code
        [HttpPost("{id:int}/regenerate-code")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
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
