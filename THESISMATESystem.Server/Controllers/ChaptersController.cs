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

        [HttpGet]
        public async Task<IActionResult> GetAll(int groupId)
            => Ok(await _chapters.GetChaptersByGroupAsync(groupId));

        [HttpGet("{chapterNumber:int}/history")]
        public async Task<IActionResult> GetHistory(int groupId, int chapterNumber)
            => Ok(await _chapters.GetChapterHistoryAsync(groupId, chapterNumber));

        [HttpGet("submissions/{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var submission = await _chapters.GetChapterByIdAsync(id);
            return submission is null ? NotFound() : Ok(submission);
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
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPatch("submissions/{id:int}/status")]
        [Authorize(Roles = "Adviser")]
        public async Task<IActionResult> UpdateStatus(int id, UpdateChapterStatusRequestDto dto)
        {
            var adviserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _chapters.UpdateChapterStatusAsync(id, dto.Status, adviserId)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpPost("submissions/{id:int}/revision-notes")]
        [Authorize(Roles = "Adviser")]
        public async Task<IActionResult> AddRevisionNote(int id, AddRevisionNoteRequestDto dto)
        {
            var adviserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _chapters.AddRevisionNoteAsync(id, adviserId, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpGet("submissions/{id:int}/download")]
        public async Task<IActionResult> Download(int id)
        {
            try
            {
                var path = await _chapters.GetDownloadPathAsync(id);
                if (!System.IO.File.Exists(path)) return NotFound();
                var bytes = await System.IO.File.ReadAllBytesAsync(path);
                var fileName = Path.GetFileName(path);
                return File(bytes, "application/octet-stream", fileName);
            }
            catch (KeyNotFoundException) { return NotFound(); }
        }
    }
}
