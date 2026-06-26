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
        [Authorize(Roles = "Faculty")]
        public async Task<IActionResult> GetForAdviser()
        {
            var adviserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return Ok(await _documents.GetDocumentsByAdviserAsync(adviserId));
        }

        [HttpGet("all")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> GetAll()
            => Ok(await _documents.GetAllDocumentsAsync());

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
        [Authorize(Roles = "Student,Faculty,Admin,SuperAdmin")]
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
            var role   = User.FindFirstValue(ClaimTypes.Role)!;
            var success = await _documents.DeleteDocumentAsync(id, userId, role);
            return success ? Ok() : NotFound();
        }

        [HttpPost("{id:int}/new-version")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> UploadNewVersion(int id, IFormFile file)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try
            {
                var result = await _documents.UploadNewVersionAsync(id, userId, file);
                return Ok(result);
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("{id:int}/versions")]
        public async Task<IActionResult> GetVersions(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role   = User.FindFirstValue(ClaimTypes.Role)!;
            try { return Ok(await _documents.GetVersionsAsync(id, userId, role)); }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException) { return NotFound(); }
        }
    }
}
