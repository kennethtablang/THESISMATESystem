using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Controllers
{
    [ApiController]
    [Route("api/sections")]
    [Authorize]
    public class SectionsController : ControllerBase
    {
        private readonly ISectionService _sections;

        public SectionsController(ISectionService sections) => _sections = sections;

        // GET /api/sections/options — active sections for the public registration form
        [HttpGet("options")]
        [AllowAnonymous]
        public async Task<IActionResult> GetOptions() => Ok(await _sections.GetActiveOptionsAsync());

        [HttpGet]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> GetAll() => Ok(await _sections.GetAllAsync());

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] SaveBlockSectionRequestDto dto)
        {
            try { return Ok(await _sections.CreateAsync(dto)); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] SaveBlockSectionRequestDto dto)
        {
            try { return Ok(await _sections.UpdateAsync(id, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("{id:int}/roster")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetRoster(int id)
        {
            try { return Ok(await _sections.GetRosterAsync(id)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpPost("{id:int}/roster")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddRoster(int id, [FromBody] AddRosterEntriesRequestDto dto)
        {
            try { return Ok(await _sections.AddRosterEntriesAsync(id, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpDelete("{id:int}/roster/{entryId:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RemoveRoster(int id, int entryId)
            => await _sections.RemoveRosterEntryAsync(id, entryId) ? Ok() : NotFound();

        [HttpGet("{id:int}/students")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetStudents(int id)
        {
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
