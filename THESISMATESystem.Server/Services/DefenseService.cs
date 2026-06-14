using AutoMapper;
using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;
using THESISMATESystem.Server.Interfaces;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Services
{
    public class DefenseService : IDefenseService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;
        private readonly INotificationService _notifications;

        public DefenseService(AppDbContext db, IMapper mapper, INotificationService notifications)
        {
            _db = db;
            _mapper = mapper;
            _notifications = notifications;
        }

        public async Task<DefenseScheduleResponseDto> CreateScheduleAsync(CreateDefenseScheduleRequestDto dto)
        {
            var schedule = new DefenseSchedule
            {
                CapstoneGroupId = dto.CapstoneGroupId,
                ScheduledDateTime = dto.ScheduledDateTime,
                Venue = dto.Venue
            };

            _db.DefenseSchedules.Add(schedule);
            await _db.SaveChangesAsync();

            if (dto.PanelistIds.Any())
            {
                var assignments = dto.PanelistIds.Select(pid => new PanelAssignment
                {
                    DefenseScheduleId = schedule.Id,
                    PanelistId = pid
                });
                _db.PanelAssignments.AddRange(assignments);
                await _db.SaveChangesAsync();
            }

            // Notify group members, adviser, and panelists
            var group = await _db.CapstoneGroups.Include(g => g.Adviser).FirstAsync(g => g.Id == dto.CapstoneGroupId);
            var msg = $"Defense scheduled on {dto.ScheduledDateTime:MMM dd, yyyy h:mm tt} at {dto.Venue}.";

            await _notifications.SendToGroupMembersAsync(dto.CapstoneGroupId, msg, NotificationType.DefenseScheduled, defenseId: schedule.Id);
            await _notifications.SendAsync(group.AdviserId, msg, NotificationType.DefenseScheduled, groupId: dto.CapstoneGroupId, defenseId: schedule.Id);

            foreach (var pId in dto.PanelistIds)
                await _notifications.SendAsync(pId, msg, NotificationType.DefenseScheduled, groupId: dto.CapstoneGroupId, defenseId: schedule.Id);

            return await GetScheduleByIdAsync(schedule.Id)
                ?? throw new InvalidOperationException("Failed to load defense schedule.");
        }

        public async Task<DefenseScheduleResponseDto?> GetScheduleByIdAsync(int id)
        {
            var schedule = await LoadScheduleQuery().FirstOrDefaultAsync(s => s.Id == id);
            if (schedule is null) return null;

            var dto = _mapper.Map<DefenseScheduleResponseDto>(schedule);
            if (schedule.Status == DefenseStatus.Completed)
                dto.ConsolidatedRating = await BuildConsolidatedRating(schedule);
            return dto;
        }

        public async Task<IEnumerable<DefenseScheduleResponseDto>> GetSchedulesByGroupAsync(int groupId)
        {
            var schedules = await LoadScheduleQuery()
                .Where(s => s.CapstoneGroupId == groupId)
                .OrderByDescending(s => s.ScheduledDateTime)
                .ToListAsync();
            return await MapSchedules(schedules);
        }

        public async Task<IEnumerable<DefenseScheduleResponseDto>> GetSchedulesByPanelistAsync(string panelistId)
        {
            var schedules = await LoadScheduleQuery()
                .Where(s => s.PanelAssignments.Any(pa => pa.PanelistId == panelistId))
                .OrderByDescending(s => s.ScheduledDateTime)
                .ToListAsync();
            return await MapSchedules(schedules);
        }

        public async Task<IEnumerable<DefenseScheduleResponseDto>> GetAllSchedulesAsync()
        {
            var schedules = await LoadScheduleQuery()
                .OrderByDescending(s => s.ScheduledDateTime)
                .ToListAsync();
            return await MapSchedules(schedules);
        }

        public async Task<DefenseScheduleResponseDto> UpdateScheduleAsync(int id, UpdateDefenseScheduleRequestDto dto)
        {
            var schedule = await _db.DefenseSchedules
                .Include(s => s.PanelAssignments)
                .FirstOrDefaultAsync(s => s.Id == id)
                ?? throw new KeyNotFoundException($"Schedule {id} not found.");

            var rescheduled = false;
            if (dto.ScheduledDateTime.HasValue)
            {
                schedule.ScheduledDateTime = dto.ScheduledDateTime.Value;
                schedule.Status = DefenseStatus.Rescheduled;
                rescheduled = true;
            }
            if (dto.Venue is not null) schedule.Venue = dto.Venue;
            schedule.UpdatedAt = PhilippineTime.Now;

            if (dto.PanelistIds is not null)
            {
                _db.PanelAssignments.RemoveRange(schedule.PanelAssignments);
                var assignments = dto.PanelistIds.Select(pid => new PanelAssignment
                {
                    DefenseScheduleId = schedule.Id,
                    PanelistId = pid
                });
                _db.PanelAssignments.AddRange(assignments);
            }

            await _db.SaveChangesAsync();

            if (rescheduled)
            {
                var msg = $"Defense rescheduled to {schedule.ScheduledDateTime:MMM dd, yyyy h:mm tt} at {schedule.Venue}.";
                await _notifications.SendToGroupMembersAsync(schedule.CapstoneGroupId, msg, NotificationType.DefenseRescheduled, defenseId: id);
            }

            return await GetScheduleByIdAsync(id)
                ?? throw new InvalidOperationException("Failed to reload schedule.");
        }

        public async Task<bool> CancelScheduleAsync(int id)
        {
            var schedule = await _db.DefenseSchedules.FindAsync(id);
            if (schedule is null) return false;

            schedule.Status = DefenseStatus.Cancelled;
            schedule.UpdatedAt = PhilippineTime.Now;
            await _db.SaveChangesAsync();

            await _notifications.SendToGroupMembersAsync(
                schedule.CapstoneGroupId,
                "Your defense has been cancelled. Please wait for rescheduling.",
                NotificationType.DefenceCancelled,
                defenseId: id);

            return true;
        }

        public async Task<bool> SetRatingOpenAsync(int id, bool isOpen)
        {
            var schedule = await _db.DefenseSchedules.FindAsync(id);
            if (schedule is null) return false;

            schedule.IsRatingOpen = isOpen;
            schedule.UpdatedAt = PhilippineTime.Now;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<DefenseRatingResponseDto> SubmitRatingAsync(string panelistId, SubmitRatingRequestDto dto)
        {
            var schedule = await _db.DefenseSchedules.FindAsync(dto.DefenseScheduleId)
                ?? throw new InvalidOperationException("Defense schedule not found.");

            if (!schedule.IsRatingOpen)
                throw new InvalidOperationException("Rating is currently closed for this presentation. Grades are immutable.");

            var existing = await _db.DefenseRatings.FirstOrDefaultAsync(r =>
                r.DefenseScheduleId == dto.DefenseScheduleId &&
                r.DefenseCriterionId == dto.DefenseCriterionId &&
                r.PanelistId == panelistId);

            if (existing is not null && existing.IsFinalized)
                throw new InvalidOperationException("Rating is already finalized and cannot be edited.");

            if (existing is not null)
            {
                existing.Score = dto.Score;
                existing.Comments = dto.Comments;
                existing.SubmittedAt = PhilippineTime.Now;
            }
            else
            {
                existing = new DefenseRating
                {
                    DefenseScheduleId = dto.DefenseScheduleId,
                    DefenseCriterionId = dto.DefenseCriterionId,
                    PanelistId = panelistId,
                    Score = dto.Score,
                    Comments = dto.Comments
                };
                _db.DefenseRatings.Add(existing);
            }

            await _db.SaveChangesAsync();

            var loaded = await _db.DefenseRatings
                .Include(r => r.DefenseCriterion)
                .Include(r => r.Panelist)
                .FirstAsync(r => r.Id == existing.Id);

            return _mapper.Map<DefenseRatingResponseDto>(loaded);
        }

        public async Task<IEnumerable<DefenseRatingResponseDto>> GetRatingsByScheduleAsync(int scheduleId)
        {
            var ratings = await _db.DefenseRatings
                .Include(r => r.DefenseCriterion)
                .Include(r => r.Panelist)
                .Where(r => r.DefenseScheduleId == scheduleId)
                .ToListAsync();

            return _mapper.Map<IEnumerable<DefenseRatingResponseDto>>(ratings);
        }

        public async Task<ConsolidatedRatingDto> GetConsolidatedRatingAsync(int scheduleId)
        {
            var schedule = await _db.DefenseSchedules
                .Include(s => s.PanelAssignments)
                .Include(s => s.DefenseRatings).ThenInclude(r => r.DefenseCriterion)
                .FirstOrDefaultAsync(s => s.Id == scheduleId)
                ?? throw new KeyNotFoundException($"Schedule {scheduleId} not found.");

            return await BuildConsolidatedRating(schedule);
        }

        public async Task<bool> FinalizeRatingsAsync(int scheduleId, string adminId)
        {
            var ratings = await _db.DefenseRatings
                .Where(r => r.DefenseScheduleId == scheduleId && !r.IsFinalized)
                .ToListAsync();

            if (!ratings.Any()) return false;

            foreach (var r in ratings)
            {
                r.IsFinalized = true;
                r.FinalizedAt = PhilippineTime.Now;
            }

            var schedule = await _db.DefenseSchedules.FindAsync(scheduleId);
            if (schedule is not null) schedule.Status = DefenseStatus.Completed;

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<DefenseCriterionResponseDto>> GetCriteriaAsync()
        {
            var criteria = await _db.DefenseCriteria.Where(c => c.IsActive).ToListAsync();
            return _mapper.Map<IEnumerable<DefenseCriterionResponseDto>>(criteria);
        }

        public async Task<DefenseCriterionResponseDto> CreateCriterionAsync(CreateCriterionRequestDto dto)
        {
            var criterion = new DefenseCriterion
            {
                Name = dto.Name,
                Description = dto.Description,
                Weight = dto.Weight,
                MaxScore = dto.MaxScore
            };

            _db.DefenseCriteria.Add(criterion);
            await _db.SaveChangesAsync();

            return _mapper.Map<DefenseCriterionResponseDto>(criterion);
        }

        private IQueryable<DefenseSchedule> LoadScheduleQuery() =>
            _db.DefenseSchedules
                .Include(s => s.CapstoneGroup)
                .Include(s => s.PanelAssignments).ThenInclude(pa => pa.Panelist)
                .Include(s => s.DefenseRatings).ThenInclude(r => r.DefenseCriterion);

        private async Task<IEnumerable<DefenseScheduleResponseDto>> MapSchedules(IEnumerable<DefenseSchedule> schedules)
        {
            var dtos = new List<DefenseScheduleResponseDto>();
            foreach (var s in schedules)
            {
                var dto = _mapper.Map<DefenseScheduleResponseDto>(s);
                if (s.Status == DefenseStatus.Completed)
                    dto.ConsolidatedRating = await BuildConsolidatedRating(s);
                dtos.Add(dto);
            }
            return dtos;
        }

        private Task<ConsolidatedRatingDto> BuildConsolidatedRating(DefenseSchedule schedule)
        {
            var panelCount = schedule.PanelAssignments.Count;
            var ratingsByCriterion = schedule.DefenseRatings
                .GroupBy(r => r.DefenseCriterion);

            var breakdown = ratingsByCriterion.Select(g =>
            {
                var avg = g.Average(r => r.Score);
                var weighted = Math.Round(avg * g.Key.Weight / 100, 2);
                return new CriterionAggregateDto
                {
                    CriterionName = g.Key.Name,
                    Weight = g.Key.Weight,
                    AverageScore = Math.Round(avg, 2),
                    WeightedContribution = weighted
                };
            }).ToList();

            var totalCriteria = _db.DefenseCriteria.Count(c => c.IsActive);
            var totalRatingsExpected = panelCount * totalCriteria;
            var allSubmitted = schedule.DefenseRatings.Count >= totalRatingsExpected;

            var result = new ConsolidatedRatingDto
            {
                TotalWeightedScore = Math.Round(breakdown.Sum(b => b.WeightedContribution), 2),
                AllRatingsSubmitted = allSubmitted,
                CriterionBreakdown = breakdown
            };

            return Task.FromResult(result);
        }
    }
}
