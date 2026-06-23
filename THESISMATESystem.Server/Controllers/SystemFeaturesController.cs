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
    public class SystemFeaturesController : ControllerBase
    {
        private readonly ISystemFeatureService _features;

        public SystemFeaturesController(ISystemFeatureService features) => _features = features;

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
        [Authorize(Roles = "Adviser,Admin,SuperAdmin")]
        public async Task<IActionResult> Create([FromBody] CreateSystemFeatureRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await _features.CreateFeatureAsync(userId, dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Adviser,Admin,SuperAdmin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateSystemFeatureRequestDto dto)
        {
            try { return Ok(await _features.UpdateFeatureAsync(id, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Adviser,Admin,SuperAdmin")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _features.DeleteFeatureAsync(id);
            return success ? Ok() : NotFound();
        }

        [HttpPost("{id:int}/comments")]
        [Authorize(Roles = "Adviser,Panel,Admin,SuperAdmin")]
        public async Task<IActionResult> AddComment(int id, [FromBody] AddSystemFeatureCommentRequestDto dto)
        {
            var authorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _features.AddCommentAsync(id, authorId, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpPatch("{id:int}/dates")]
        [Authorize(Roles = "Adviser,Admin,SuperAdmin")]
        public async Task<IActionResult> UpdateDates(int id, [FromBody] UpdateSystemFeatureRequestDto dto)
        {
            try { return Ok(await _features.UpdateFeatureAsync(id, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpGet("{id:int}/comments")]
        public async Task<IActionResult> GetComments(int id)
            => Ok(await _features.GetCommentsAsync(id));
    }
}
