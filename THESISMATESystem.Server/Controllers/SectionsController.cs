using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    // Blocks are created by the SuperAdmin, by typing the block when making an Admin/subject
    // teacher account. The Admin only works inside their own block (its class list and students)
    // from My Classroom and cannot create or rename blocks.
    [ApiController]
    [Route("api/sections")]
    [Authorize]
    public class SectionsController : ControllerBase
    {
        private readonly ISectionService _sections;

        public SectionsController(ISectionService sections) => _sections = sections;

        private string CallerId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        // A block outside the caller's own is reported as missing, like the group-scoped reads.
        private Task<bool> HandlesAsync(int sectionId) => _sections.HandlesAsync(CallerId, sectionId);

        // GET /api/sections/options — blocks with an Admin, for the public registration form
        [HttpGet("options")]
        [AllowAnonymous]
        public async Task<IActionResult> GetOptions() => Ok(await _sections.GetActiveOptionsAsync());

        // The SuperAdmin reads this to see which blocks exist and who handles them.
        [HttpGet]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> GetAll() => Ok(await _sections.GetAllAsync());

        // GET /api/sections/mine — the Admin's own block(s), for My Classroom
        [HttpGet("mine")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetMine() => Ok(await _sections.GetHandledByAsync(CallerId));

        [HttpGet("{id:int}/roster")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetRoster(int id)
        {
            if (!await HandlesAsync(id)) return NotFound();
            try { return Ok(await _sections.GetRosterAsync(id)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpPost("{id:int}/roster")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddRoster(int id, [FromBody] AddRosterEntriesRequestDto dto)
        {
            if (!await HandlesAsync(id)) return NotFound();
            try { return Ok(await _sections.AddRosterEntriesAsync(id, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpDelete("{id:int}/roster/{entryId:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RemoveRoster(int id, int entryId)
        {
            if (!await HandlesAsync(id)) return NotFound();
            return await _sections.RemoveRosterEntryAsync(id, entryId) ? Ok() : NotFound();
        }

        [HttpGet("{id:int}/students")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetStudents(int id)
        {
            if (!await HandlesAsync(id)) return NotFound();
            try { return Ok(await _sections.GetStudentsAsync(id)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpGet("unassigned-students")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetUnassigned() => Ok(await _sections.GetUnassignedStudentsAsync());

        [HttpPut("{id:int}/students")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AssignStudents(int id, [FromBody] AssignSectionStudentsRequestDto dto)
        {
            if (!await HandlesAsync(id)) return NotFound();
            try
            {
                await _sections.AssignStudentsAsync(id, dto);
                return Ok(new { message = "Students assigned to section." });
            }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}
