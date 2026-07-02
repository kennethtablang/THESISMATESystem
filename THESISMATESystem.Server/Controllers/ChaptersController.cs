using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/groups/{groupId:int}/chapters")]
    [Authorize]
    public class ChaptersController : ControllerBase
    {
        private readonly IChapterService _chapters;

        public ChaptersController(IChapterService chapters) => _chapters = chapters;

        private (string UserId, string Role) Caller()
            => (User.FindFirstValue(ClaimTypes.NameIdentifier)!, User.FindFirstValue(ClaimTypes.Role)!);

        [HttpGet]
        public async Task<IActionResult> GetAll(int groupId)
        {
            var (userId, role) = Caller();
            try { return Ok(await _chapters.GetChaptersByGroupAsync(groupId, userId, role)); }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        [HttpGet("{chapterNumber:int}/history")]
        public async Task<IActionResult> GetHistory(int groupId, int chapterNumber)
        {
            var (userId, role) = Caller();
            try { return Ok(await _chapters.GetChapterHistoryAsync(groupId, chapterNumber, userId, role)); }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        [HttpGet("submissions/{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var (userId, role) = Caller();
            try
            {
                var submission = await _chapters.GetChapterByIdAsync(id, userId, role);
                return submission is null ? NotFound() : Ok(submission);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        [HttpPost]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> Submit(int groupId, [FromForm] SubmitChapterRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await _chapters.SubmitChapterAsync(groupId, userId, dto);
                return CreatedAtAction(nameof(GetById), new { groupId, id = result.Id }, result);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPatch("submissions/{id:int}/status")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> UpdateStatus(int id, UpdateChapterStatusRequestDto dto)
        {
            var (userId, role) = Caller();
            try { return Ok(await _chapters.UpdateChapterStatusAsync(id, dto.Status, userId, role)); }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpPost("submissions/{id:int}/revision-notes")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> AddRevisionNote(int id, AddRevisionNoteRequestDto dto)
        {
            var (userId, role) = Caller();
            try { return Ok(await _chapters.AddRevisionNoteAsync(id, userId, role, dto)); }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpGet("submissions/{id:int}/download")]
        public async Task<IActionResult> Download(int id)
        {
            var (userId, role) = Caller();
            try
            {
                var path = await _chapters.GetDownloadPathAsync(id, userId, role);
                if (!System.IO.File.Exists(path)) return NotFound();
                var bytes = await System.IO.File.ReadAllBytesAsync(path);
                var fileName = Path.GetFileName(path);
                return File(bytes, "application/octet-stream", fileName);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException) { return NotFound(); }
        }
    }
}
