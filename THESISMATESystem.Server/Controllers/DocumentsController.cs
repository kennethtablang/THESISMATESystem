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
    public class DocumentsController : ControllerBase
    {
        private readonly IDocumentService _documents;

        public DocumentsController(IDocumentService documents) => _documents = documents;

        [HttpGet("group/{groupId:int}")]
        public async Task<IActionResult> GetByGroup(int groupId)
            => Ok(await _documents.GetDocumentsByGroupAsync(groupId));

        [HttpGet("my-advisees")]
        [Authorize(Roles = "Adviser")]
        public async Task<IActionResult> GetForAdviser()
        {
            var adviserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return Ok(await _documents.GetDocumentsByAdviserAsync(adviserId));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var doc = await _documents.GetDocumentByIdAsync(id);
            return doc is null ? NotFound() : Ok(doc);
        }

        [HttpPost]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> Upload([FromForm] UploadDocumentRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await _documents.UploadDocumentAsync(userId, dto);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("{id:int}/download")]
        public async Task<IActionResult> Download(int id)
        {
            try
            {
                var path = await _documents.GetDownloadPathAsync(id);
                if (!System.IO.File.Exists(path)) return NotFound();
                var bytes = await System.IO.File.ReadAllBytesAsync(path);
                var fileName = Path.GetFileName(path);
                return File(bytes, "application/octet-stream", fileName);
            }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpPost("{id:int}/comments")]
        [Authorize(Roles = "Adviser,Admin,SuperAdmin")]
        public async Task<IActionResult> AddComment(int id, [FromBody] AddDocumentCommentRequestDto dto)
        {
            var authorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _documents.AddCommentAsync(id, authorId, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpGet("{id:int}/comments")]
        public async Task<IActionResult> GetComments(int id)
            => Ok(await _documents.GetCommentsAsync(id));

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Student,Admin,SuperAdmin")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var success = await _documents.DeleteDocumentAsync(id, userId);
            return success ? Ok() : NotFound();
        }
    }
}
