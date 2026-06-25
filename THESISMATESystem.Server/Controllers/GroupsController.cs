using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Security.Claims;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class GroupsController : ControllerBase
    {
        private readonly IGroupService _groups;

        public GroupsController(IGroupService groups) => _groups = groups;

        [HttpGet]
        [Authorize(Roles = "Admin,SuperAdmin,Adviser,FacultyIC,Panel")]
        public async Task<IActionResult> GetAll([FromQuery] GroupStatus? status)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role = User.FindFirstValue(ClaimTypes.Role)!;

            var result = role == "Adviser"
                ? await _groups.GetGroupsByAdviserAsync(userId)
                : await _groups.GetAllGroupsAsync(status);

            return Ok(result);
        }

        [HttpGet("my-group")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetMyGroup()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var group = await _groups.GetGroupByStudentAsync(userId);
            return group is null ? NotFound() : Ok(group);
        }

        [HttpPatch("my-group/version")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> UpdateVersion(UpdateVersionRequestDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _groups.UpdateVersionAsync(userId, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var group = await _groups.GetGroupByIdAsync(id);
            return group is null ? NotFound() : Ok(group);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Create(CreateGroupRequestDto dto)
        {
            var group = await _groups.CreateGroupAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = group.Id }, group);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Update(int id, UpdateGroupRequestDto dto)
        {
            try { return Ok(await _groups.UpdateGroupAsync(id, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpPatch("{id:int}/archive")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Archive(int id)
        {
            var success = await _groups.ArchiveGroupAsync(id);
            return success ? Ok() : NotFound();
        }

        [HttpPost("{id:int}/logo")]
        [Authorize(Roles = "Student,Admin,SuperAdmin")]
        public async Task<IActionResult> UploadLogo(int id, IFormFile file)
        {
            if (file is null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowed.Contains(ext))
                return BadRequest(new { message = "Only image files are allowed (jpg, png, gif, webp)." });

            var callerId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var callerRole = User.FindFirstValue(ClaimTypes.Role)!;

            try { return Ok(await _groups.UploadLogoAsync(id, file, callerId, callerRole)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (UnauthorizedAccessException) { return Forbid(); }
        }

        [HttpGet("{id:int}/logo")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLogo(int id)
        {
            var result = await _groups.GetLogoAsync(id);
            if (result is null) return NotFound();
            return File(result.Value.bytes, result.Value.contentType);
        }
    }
}
