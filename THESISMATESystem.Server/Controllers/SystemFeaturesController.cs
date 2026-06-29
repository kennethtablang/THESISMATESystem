using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/system-features")]
    [Authorize]
    public class SystemFeaturesController : ControllerBase
    {
        private readonly ISystemFeatureService _features;
        private readonly IWebHostEnvironment _env;

        public SystemFeaturesController(ISystemFeatureService features, IWebHostEnvironment env)
        {
            _features = features;
            _env = env;
        }

        [HttpGet("group/{groupId:int}")]
        public async Task<IActionResult> GetByGroup(int groupId)
            => Ok(await _features.GetFeaturesByGroupAsync(groupId));

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var feature = await _features.GetFeatureByIdAsync(id);
            return feature is null ? NotFound() : Ok(feature);
        }

        [HttpPost]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> Create([FromBody] CreateSystemFeatureRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await _features.CreateFeatureAsync(userId, dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin,Student")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateSystemFeatureRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role = User.FindFirstValue(ClaimTypes.Role)!;
            // Students may only set status to InProgress
            if (role == "Student")
            {
                if (!dto.Status.HasValue || dto.Status.Value != Enums.SystemFeatureStatus.InProgress)
                    return Forbid();
                dto = new UpdateSystemFeatureRequestDto { Status = Enums.SystemFeatureStatus.InProgress };
            }
            try { return Ok(await _features.UpdateFeatureAsync(id, userId, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _features.DeleteFeatureAsync(id);
            return success ? Ok() : NotFound();
        }

        [HttpPost("{id:int}/comments")]
        public async Task<IActionResult> AddComment(int id, [FromBody] AddSystemFeatureCommentRequestDto dto)
        {
            var authorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _features.AddCommentAsync(id, authorId, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        [HttpPatch("{id:int}/dates")]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> UpdateDates(int id, [FromBody] UpdateSystemFeatureRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _features.UpdateFeatureAsync(id, userId, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpGet("{id:int}/comments")]
        public async Task<IActionResult> GetComments(int id)
            => Ok(await _features.GetCommentsAsync(id));

        [HttpDelete("{featureId:int}/comments/{commentId:int}")]
        public async Task<IActionResult> DeleteComment(int featureId, int commentId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _features.DeleteCommentAsync(commentId, userId)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (UnauthorizedAccessException e) { return Forbid(e.Message); }
        }

        [HttpPatch("{id:int}/student-test")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> SubmitStudentTest(int id, [FromBody] SubmitStudentTestRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _features.SubmitStudentTestAsync(id, userId, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        [HttpPost("{id:int}/screenshot")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> UploadScreenshot(int id, IFormFile file)
        {
            if (file is null || file.Length == 0) return BadRequest("No file provided.");
            var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowed.Contains(ext)) return BadRequest("Only image files are allowed.");
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _features.UploadScreenshotAsync(id, userId, file, _env.WebRootPath)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }
    }
}
