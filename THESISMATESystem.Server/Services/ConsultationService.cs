using AutoMapper;
using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Interfaces;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Services
{
    public class ConsultationService : IConsultationService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;
        private readonly INotificationService _notifications;

        public ConsultationService(AppDbContext db, IMapper mapper, INotificationService notifications)
        {
            _db = db;
            _mapper = mapper;
            _notifications = notifications;
        }

        public async Task<ConsultationLogResponseDto> CreateConsultationAsync(
            string adviserId, CreateConsultationRequestDto dto)
        {
            var log = new ConsultationLog
            {
                CapstoneGroupId = dto.CapstoneGroupId,
                ChapterSubmissionId = dto.ChapterSubmissionId,
                AdviserId = adviserId,
                ConsultationDate = dto.ConsultationDate,
                Mode = dto.Mode,
                DiscussionContent = dto.DiscussionContent,
                Outcome = dto.Outcome
            };

            _db.ConsultationLogs.Add(log);
            await _db.SaveChangesAsync();

            await _notifications.SendToGroupMembersAsync(
                dto.CapstoneGroupId,
                $"A consultation log was recorded for {dto.ConsultationDate:MMM dd, yyyy}.",
                NotificationType.ConsultationLogged);

            return await GetConsultationByIdAsync(log.Id)
                ?? throw new InvalidOperationException("Failed to load consultation.");
        }

        public async Task<IEnumerable<ConsultationLogResponseDto>> GetConsultationsForUserAsync(string userId, string role)
        {
            IQueryable<ConsultationLog> query = _db.ConsultationLogs
                .Include(cl => cl.Adviser)
                .Include(cl => cl.CapstoneGroup);

            if (role == "Faculty")
                query = query.Where(cl => cl.AdviserId == userId);

            var logs = await query.OrderByDescending(cl => cl.ConsultationDate).ToListAsync();
            return _mapper.Map<IEnumerable<ConsultationLogResponseDto>>(logs);
        }

        public async Task<IEnumerable<ConsultationLogResponseDto>> GetConsultationsByGroupAsync(int groupId)
        {
            var logs = await _db.ConsultationLogs
                .Include(cl => cl.Adviser)
                .Include(cl => cl.CapstoneGroup)
                .Where(cl => cl.CapstoneGroupId == groupId)
                .OrderByDescending(cl => cl.ConsultationDate)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ConsultationLogResponseDto>>(logs);
        }

        public async Task<ConsultationLogResponseDto?> GetConsultationByIdAsync(int id)
        {
            var log = await _db.ConsultationLogs
                .Include(cl => cl.Adviser)
                .Include(cl => cl.CapstoneGroup)
                .FirstOrDefaultAsync(cl => cl.Id == id);

            return log is null ? null : _mapper.Map<ConsultationLogResponseDto>(log);
        }

        public async Task<ConsultationLogResponseDto> UpdateConsultationAsync(
            int id, string adviserId, UpdateConsultationRequestDto dto)
        {
            var log = await _db.ConsultationLogs.FirstOrDefaultAsync(cl => cl.Id == id && cl.AdviserId == adviserId)
                ?? throw new KeyNotFoundException($"Consultation {id} not found or access denied.");

            if (dto.ConsultationDate.HasValue) log.ConsultationDate = dto.ConsultationDate.Value;
            if (dto.Mode.HasValue) log.Mode = dto.Mode.Value;
            if (dto.DiscussionContent is not null) log.DiscussionContent = dto.DiscussionContent;
            if (dto.Outcome is not null) log.Outcome = dto.Outcome;

            await _db.SaveChangesAsync();
            return await GetConsultationByIdAsync(id)
                ?? throw new InvalidOperationException("Failed to reload consultation.");
        }

        public async Task<bool> DeleteConsultationAsync(int id, string adviserId)
        {
            var log = await _db.ConsultationLogs
                .FirstOrDefaultAsync(cl => cl.Id == id && cl.AdviserId == adviserId);

            if (log is null) return false;
            _db.ConsultationLogs.Remove(log);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
