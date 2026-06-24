using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/manuscript")]
    [Authorize]
    public class ManuscriptController : ControllerBase
    {
        private readonly IManuscriptService _manuscript;

        public ManuscriptController(IManuscriptService manuscript) => _manuscript = manuscript;

        // ── Sections ──────────────────────────────────────────

        [HttpGet("group/{groupId:int}")]
        [Authorize(Roles = "Admin,SuperAdmin,Adviser,Panel,FacultyIC")]
        public async Task<IActionResult> GetByGroup(int groupId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role = User.FindFirstValue(ClaimTypes.Role)!;
            if (!await _manuscript.IsAuthorizedForGroupAsync(userId, role, groupId)) return Forbid();
            return Ok(await _manuscript.GetSectionsAsync(groupId));
        }

        [HttpGet("my-group")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetMyGroup()
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var sections = await _manuscript.GetSectionsByStudentAsync(studentId);
            return sections is null ? NotFound() : Ok(sections);
        }

        [HttpPut("my-group/{sectionKey}")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> SaveSection(string sectionKey, [FromBody] SaveSectionRequestDto dto)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await _manuscript.SaveSectionAsync(studentId, sectionKey.ToLower(), dto);
                return Ok(result);
            }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        }

        // ── Voting ────────────────────────────────────────────

        [HttpGet("my-group/vote-status")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetVoteStatus()
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _manuscript.GetVoteStatusAsync(studentId)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpPost("my-group/vote")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> CastVote()
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _manuscript.CastVoteAsync(studentId)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        }

        [HttpDelete("my-group/vote")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> RevokeVote()
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _manuscript.RevokeVoteAsync(studentId)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        }

        // ── Comments ──────────────────────────────────────────

        [HttpGet("group/{groupId:int}/comments")]
        [Authorize(Roles = "Admin,SuperAdmin,Adviser,Panel,FacultyIC,Student")]
        public async Task<IActionResult> GetComments(int groupId, [FromQuery] string? sectionKey, [FromQuery] int? revision)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role = User.FindFirstValue(ClaimTypes.Role)!;
            if (!await _manuscript.IsAuthorizedForGroupAsync(userId, role, groupId)) return Forbid();
            return Ok(await _manuscript.GetCommentsAsync(groupId, sectionKey, revision));
        }

        [HttpGet("my-group/comments")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetMyGroupComments([FromQuery] string? sectionKey, [FromQuery] int? revision)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var comments = await _manuscript.GetCommentsByStudentAsync(studentId, sectionKey, revision);
            return comments is null ? NotFound() : Ok(comments);
        }

        [HttpPost("group/{groupId:int}/comments/{sectionKey}")]
        [Authorize(Roles = "Adviser,Panel,FacultyIC")]
        public async Task<IActionResult> AddComment(int groupId, string sectionKey, [FromBody] AddManuscriptCommentRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role = User.FindFirstValue(ClaimTypes.Role)!;
            if (!await _manuscript.IsAuthorizedForGroupAsync(userId, role, groupId)) return Forbid();
            try
            {
                var result = await _manuscript.AddCommentAsync(userId, groupId, sectionKey.ToLower(), dto);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // ── Revision summary ──────────────────────────────────

        [HttpGet("group/{groupId:int}/revision-summary")]
        [Authorize(Roles = "Admin,SuperAdmin,Adviser,Panel,FacultyIC")]
        public async Task<IActionResult> GetRevisionSummary(int groupId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role   = User.FindFirstValue(ClaimTypes.Role)!;
            try
            {
                return Ok(await _manuscript.GetRevisionSummaryAsync(groupId, userId, role));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException)        { return NotFound(); }
        }

        [HttpGet("my-group/revision-summary")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetMyRevisionSummary()
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await _manuscript.GetMyRevisionSummaryAsync(studentId);
            return result is null ? NotFound() : Ok(result);
        }

        // ── Revision management ───────────────────────────────

        [HttpPost("group/{groupId:int}/open-revision")]
        [Authorize(Roles = "Adviser,FacultyIC")]
        public async Task<IActionResult> OpenRevision(int groupId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role = User.FindFirstValue(ClaimTypes.Role)!;
            if (!await _manuscript.IsAuthorizedForGroupAsync(userId, role, groupId)) return Forbid();
            try
            {
                await _manuscript.OpenRevisionAsync(userId, groupId);
                return NoContent();
            }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        }

        // ── Image upload ──────────────────────────────────────

        [HttpPost("upload-image")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await _manuscript.UploadImageAsync(studentId, file);
                return Ok(result);
            }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}
