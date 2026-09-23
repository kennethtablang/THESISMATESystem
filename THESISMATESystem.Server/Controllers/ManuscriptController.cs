using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.Hubs;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/manuscript")]
    [Authorize]
    public class ManuscriptController : ControllerBase
    {
        private readonly IManuscriptService _manuscript;
        private readonly IHubContext<ManuscriptHub> _hub;

        public ManuscriptController(IManuscriptService manuscript, IHubContext<ManuscriptHub> hub)
        {
            _manuscript = manuscript;
            _hub = hub;
        }

        // Tells everyone viewing the section to reload its highlights.
        private Task BroadcastAnnotationsChangedAsync(int groupId, string sectionKey) =>
            _hub.Clients.Group(ManuscriptHub.RoomKey(groupId, sectionKey))
                .SendAsync("AnnotationsChanged", sectionKey);

        // ── Sections ──────────────────────────────────────────

        [HttpGet("group/{groupId:int}")]
        [Authorize(Roles = "Admin,Faculty")]
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

        // ── Lock status ─────────────────────────────────────────

        [HttpGet("my-group/vote-status")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetVoteStatus()
        {
            var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _manuscript.GetVoteStatusAsync(studentId)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        // ── Comments ──────────────────────────────────────────

        [HttpGet("group/{groupId:int}/comments")]
        [Authorize(Roles = "Admin,Faculty,Student")]
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
        [Authorize(Roles = "Faculty,Admin")]
        public async Task<IActionResult> AddComment(int groupId, string sectionKey, [FromBody] AddManuscriptCommentRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role = User.FindFirstValue(ClaimTypes.Role)!;
            if (!await _manuscript.IsAuthorizedForGroupAsync(userId, role, groupId)) return Forbid();
            try
            {
                var result = await _manuscript.AddCommentAsync(userId, groupId, sectionKey.ToLower(), dto);
                await BroadcastAnnotationsChangedAsync(groupId, result.SectionKey);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpDelete("group/{groupId:int}/comments/{commentId:int}")]
        [Authorize(Roles = "Faculty,Admin")]
        public async Task<IActionResult> DeleteComment(int groupId, int commentId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role = User.FindFirstValue(ClaimTypes.Role)!;
            if (!await _manuscript.IsAuthorizedForGroupAsync(userId, role, groupId)) return Forbid();
            try
            {
                var sectionKey = await _manuscript.DeleteCommentAsync(userId, groupId, commentId);
                await BroadcastAnnotationsChangedAsync(groupId, sectionKey);
                return NoContent();
            }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        }

        [HttpGet("group/{groupId:int}/reviewers")]
        [Authorize(Roles = "Admin,Faculty")]
        public async Task<IActionResult> GetReviewers(int groupId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role = User.FindFirstValue(ClaimTypes.Role)!;
            if (!await _manuscript.IsAuthorizedForGroupAsync(userId, role, groupId)) return Forbid();
            return Ok(await _manuscript.GetReviewersAsync(groupId));
        }

        // ── Revision summary ──────────────────────────────────

        [HttpGet("group/{groupId:int}/revision-summary")]
        [Authorize(Roles = "Admin,Faculty")]
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
        [Authorize(Roles = "Faculty,Admin")]
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
