using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Interfaces;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Services
{
    public class ConsultationScheduleService : IConsultationScheduleService
    {
        private readonly AppDbContext _db;

        public ConsultationScheduleService(AppDbContext db) => _db = db;

        public async Task<ConsultationScheduleResponseDto> CreateScheduleAsync(string facultyICId, CreateConsultationScheduleRequestDto dto)
        {
            var schedule = new ConsultationSchedule
            {
                FacultyICId = facultyICId,
                Title = dto.Title,
                Description = dto.Description,
                Location = dto.Location,
                Mode = dto.Mode,
                ScheduledStartAt = dto.ScheduledStartAt,
                ScheduledEndAt = dto.ScheduledEndAt,
                MaxGroups = dto.MaxGroups
            };

            _db.ConsultationSchedules.Add(schedule);
            await _db.SaveChangesAsync();

            return await BuildResponseAsync(schedule.Id);
        }

        public async Task<IEnumerable<ConsultationScheduleResponseDto>> GetAllSchedulesAsync()
        {
            var ids = await _db.ConsultationSchedules
                .OrderByDescending(cs => cs.ScheduledStartAt)
                .Select(cs => cs.Id)
                .ToListAsync();

            var result = new List<ConsultationScheduleResponseDto>();
            foreach (var id in ids)
                result.Add(await BuildResponseAsync(id));
            return result;
        }

        public async Task<IEnumerable<ConsultationScheduleResponseDto>> GetSchedulesByFacultyICAsync(string facultyICId)
        {
            var ids = await _db.ConsultationSchedules
                .Where(cs => cs.FacultyICId == facultyICId)
                .OrderByDescending(cs => cs.ScheduledStartAt)
                .Select(cs => cs.Id)
                .ToListAsync();

            var result = new List<ConsultationScheduleResponseDto>();
            foreach (var id in ids)
                result.Add(await BuildResponseAsync(id));
            return result;
        }

        public async Task<ConsultationScheduleResponseDto?> GetScheduleByIdAsync(int id)
        {
            var exists = await _db.ConsultationSchedules.AnyAsync(cs => cs.Id == id);
            return exists ? await BuildResponseAsync(id) : null;
        }

        public async Task<ConsultationScheduleResponseDto> UpdateScheduleAsync(int id, string facultyICId, UpdateConsultationScheduleRequestDto dto)
        {
            var schedule = await _db.ConsultationSchedules.FindAsync(id)
                ?? throw new KeyNotFoundException("Schedule not found.");

            if (schedule.FacultyICId != facultyICId)
                throw new UnauthorizedAccessException("You can only edit your own schedules.");

            if (dto.Title is not null) schedule.Title = dto.Title;
            if (dto.Description is not null) schedule.Description = dto.Description;
            if (dto.Location is not null) schedule.Location = dto.Location;
            if (dto.Mode.HasValue) schedule.Mode = dto.Mode.Value;
            if (dto.ScheduledStartAt.HasValue) schedule.ScheduledStartAt = dto.ScheduledStartAt.Value;
            if (dto.ScheduledEndAt.HasValue) schedule.ScheduledEndAt = dto.ScheduledEndAt.Value;
            if (dto.MaxGroups.HasValue) schedule.MaxGroups = dto.MaxGroups.Value;

            await _db.SaveChangesAsync();
            return await BuildResponseAsync(id);
        }

        public async Task<bool> UpdateScheduleStatusAsync(int id, UpdateScheduleStatusRequestDto dto)
        {
            var schedule = await _db.ConsultationSchedules.FindAsync(id);
            if (schedule is null) return false;
            schedule.Status = dto.Status;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<ConsultationRequestResponseDto> RequestSlotAsync(string requestedById, RequestConsultationSlotDto dto)
        {
            var schedule = await _db.ConsultationSchedules
                .Include(cs => cs.Requests)
                .FirstOrDefaultAsync(cs => cs.Id == dto.ConsultationScheduleId)
                ?? throw new KeyNotFoundException("Schedule not found.");

            if (schedule.Status != ConsultationScheduleStatus.Open)
                throw new InvalidOperationException("This schedule is not open for requests.");

            var approved = schedule.Requests.Count(r => r.Status == ConsultationRequestStatus.Approved);
            if (approved >= schedule.MaxGroups)
                throw new InvalidOperationException("Schedule is already full.");

            var request = new ConsultationRequest
            {
                ConsultationScheduleId = dto.ConsultationScheduleId,
                CapstoneGroupId = dto.CapstoneGroupId,
                RequestedById = requestedById,
                Notes = dto.Notes
            };

            _db.ConsultationRequests.Add(request);
            await _db.SaveChangesAsync();

            return await BuildRequestResponseAsync(request.Id);
        }

        public async Task<IEnumerable<ConsultationRequestResponseDto>> GetRequestsByScheduleAsync(int scheduleId)
        {
            var ids = await _db.ConsultationRequests
                .Where(r => r.ConsultationScheduleId == scheduleId)
                .OrderByDescending(r => r.RequestedAt)
                .Select(r => r.Id)
                .ToListAsync();

            var result = new List<ConsultationRequestResponseDto>();
            foreach (var id in ids)
                result.Add(await BuildRequestResponseAsync(id));
            return result;
        }

        public async Task<IEnumerable<ConsultationRequestResponseDto>> GetMyRequestsAsync(int groupId)
        {
            var ids = await _db.ConsultationRequests
                .Where(r => r.CapstoneGroupId == groupId)
                .OrderByDescending(r => r.RequestedAt)
                .Select(r => r.Id)
                .ToListAsync();

            var result = new List<ConsultationRequestResponseDto>();
            foreach (var id in ids)
                result.Add(await BuildRequestResponseAsync(id));
            return result;
        }

        public async Task<ConsultationRequestResponseDto> RespondToRequestAsync(int requestId, string facultyICId, RespondToConsultationRequestDto dto)
        {
            var request = await _db.ConsultationRequests
                .Include(r => r.ConsultationSchedule)
                .FirstOrDefaultAsync(r => r.Id == requestId)
                ?? throw new KeyNotFoundException("Request not found.");

            if (request.ConsultationSchedule.FacultyICId != facultyICId)
                throw new UnauthorizedAccessException("You can only respond to your own schedule requests.");

            if (dto.Status == ConsultationRequestStatus.Approved)
            {
                var approvedCount = await _db.ConsultationRequests
                    .CountAsync(r => r.ConsultationScheduleId == request.ConsultationScheduleId
                                  && r.Status == ConsultationRequestStatus.Approved);
                if (approvedCount >= request.ConsultationSchedule.MaxGroups)
                    throw new InvalidOperationException("Schedule is already full.");
            }

            request.Status = dto.Status;
            request.ResponseNotes = dto.ResponseNotes;
            request.RespondedAt = DateTime.UtcNow;

            // Auto-close schedule if full after approval
            if (dto.Status == ConsultationRequestStatus.Approved)
            {
                var approvedCount = await _db.ConsultationRequests
                    .CountAsync(r => r.ConsultationScheduleId == request.ConsultationScheduleId
                                  && r.Status == ConsultationRequestStatus.Approved);
                if (approvedCount >= request.ConsultationSchedule.MaxGroups)
                    request.ConsultationSchedule.Status = ConsultationScheduleStatus.Full;
            }

            await _db.SaveChangesAsync();
            return await BuildRequestResponseAsync(requestId);
        }

        private async Task<ConsultationScheduleResponseDto> BuildResponseAsync(int id)
        {
            var cs = await _db.ConsultationSchedules
                .Include(s => s.FacultyIC)
                .Include(s => s.Requests)
                .FirstAsync(s => s.Id == id);

            return new ConsultationScheduleResponseDto
            {
                Id = cs.Id,
                FacultyIC = new UserSummaryDto { Id = cs.FacultyIC.Id, FullName = $"{cs.FacultyIC.FirstName} {cs.FacultyIC.LastName}" },
                Title = cs.Title,
                Description = cs.Description,
                Location = cs.Location,
                Mode = cs.Mode,
                ModeLabel = cs.Mode.ToString(),
                ScheduledStartAt = cs.ScheduledStartAt,
                ScheduledEndAt = cs.ScheduledEndAt,
                MaxGroups = cs.MaxGroups,
                ApprovedCount = cs.Requests.Count(r => r.Status == ConsultationRequestStatus.Approved),
                Status = cs.Status,
                StatusLabel = cs.Status.ToString(),
                CreatedAt = cs.CreatedAt
            };
        }

        private async Task<ConsultationRequestResponseDto> BuildRequestResponseAsync(int id)
        {
            var r = await _db.ConsultationRequests
                .Include(x => x.ConsultationSchedule)
                .Include(x => x.CapstoneGroup)
                .Include(x => x.RequestedBy)
                .FirstAsync(x => x.Id == id);

            return new ConsultationRequestResponseDto
            {
                Id = r.Id,
                ConsultationScheduleId = r.ConsultationScheduleId,
                ScheduleTitle = r.ConsultationSchedule.Title,
                ScheduledStartAt = r.ConsultationSchedule.ScheduledStartAt,
                CapstoneGroupId = r.CapstoneGroupId,
                GroupName = r.CapstoneGroup.GroupName,
                RequestedBy = new UserSummaryDto { Id = r.RequestedBy.Id, FullName = $"{r.RequestedBy.FirstName} {r.RequestedBy.LastName}" },
                Status = r.Status,
                StatusLabel = r.Status.ToString(),
                Notes = r.Notes,
                ResponseNotes = r.ResponseNotes,
                RequestedAt = r.RequestedAt,
                RespondedAt = r.RespondedAt
            };
        }
    }
}
