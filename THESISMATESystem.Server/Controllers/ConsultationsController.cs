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
    public class ConsultationsController : ControllerBase
    {
        private readonly IConsultationService _consultations;

        public ConsultationsController(IConsultationService consultations) => _consultations = consultations;

        [HttpGet]
        [Authorize(Roles = "Faculty,Admin,SuperAdmin")]
        public async Task<IActionResult> GetAll()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var role = User.FindFirstValue(ClaimTypes.Role)!;
            return Ok(await _consultations.GetConsultationsForUserAsync(userId, role));
        }

        [HttpGet("group/{groupId:int}")]
        public async Task<IActionResult> GetByGroup(int groupId)
            => Ok(await _consultations.GetConsultationsByGroupAsync(groupId));

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var log = await _consultations.GetConsultationByIdAsync(id);
            return log is null ? NotFound() : Ok(log);
        }

        [HttpPost]
        [Authorize(Roles = "Faculty")]
        public async Task<IActionResult> Create(CreateConsultationRequestDto dto)
        {
            var adviserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await _consultations.CreateConsultationAsync(adviserId, dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Faculty")]
        public async Task<IActionResult> Update(int id, UpdateConsultationRequestDto dto)
        {
            var adviserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            try { return Ok(await _consultations.UpdateConsultationAsync(id, adviserId, dto)); }
            catch (KeyNotFoundException) { return NotFound(); }
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Faculty")]
        public async Task<IActionResult> Delete(int id)
        {
            var adviserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var success = await _consultations.DeleteConsultationAsync(id, adviserId);
            return success ? Ok() : NotFound();
        }
    }
}
