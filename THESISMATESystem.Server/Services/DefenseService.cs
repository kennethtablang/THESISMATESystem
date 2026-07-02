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
        private readonly IEmailService _email;
        private readonly ILogger<DefenseService> _logger;

        public DefenseService(
            AppDbContext db,
            IMapper mapper,
            INotificationService notifications,
            IEmailService email,
            ILogger<DefenseService> logger)
        {
            _db = db;
            _mapper = mapper;
            _notifications = notifications;
            _email = email;
            _logger = logger;
        }

        public async Task<DefenseScheduleResponseDto> CreateScheduleAsync(CreateDefenseScheduleRequestDto dto)
        {
            var duration = dto.DurationMinutes > 0 ? dto.DurationMinutes : 60;
            PhilippineTime.ValidateScheduleHours(dto.ScheduledDateTime, duration);

            var schedule = new DefenseSchedule
            {
                CapstoneGroupId   = dto.CapstoneGroupId,
                ScheduledDateTime = dto.ScheduledDateTime,
                DurationMinutes   = duration,
                Venue             = dto.Venue,
                Phase             = dto.Phase,
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

            // Notifications are best-effort — a failure must not prevent the 201 response
            try
            {
                var group = await _db.CapstoneGroups
                    .Include(g => g.Adviser)
                    .FirstAsync(g => g.Id == dto.CapstoneGroupId);

                var panelistUsers = dto.PanelistIds.Count > 0
                    ? await _db.Users
                        .Where(u => dto.PanelistIds.Contains(u.Id))
                        .Select(u => new { u.Id, u.Email, u.FirstName, u.LastName })
                        .ToListAsync()
                    : [];

                var inAppMsg = $"Defense scheduled on {dto.ScheduledDateTime:MMM dd, yyyy h:mm tt} at {dto.Venue}.";
                await _notifications.SendToGroupMembersAsync(dto.CapstoneGroupId, inAppMsg, NotificationType.DefenseScheduled, defenseId: schedule.Id);
                await _notifications.SendAsync(group.AdviserId, inAppMsg, NotificationType.DefenseScheduled, groupId: dto.CapstoneGroupId, defenseId: schedule.Id);
                foreach (var p in panelistUsers)
                    await _notifications.SendAsync(p.Id, inAppMsg, NotificationType.DefenseScheduled, groupId: dto.CapstoneGroupId, defenseId: schedule.Id);

                var memberEmails   = await GetGroupMemberEmailsAsync(dto.CapstoneGroupId);
                var panelistEmails = panelistUsers.Where(p => !string.IsNullOrEmpty(p.Email)).Select(p => p.Email!);
                var adviserEmail   = group.Adviser?.Email;
                var allEmails      = memberEmails
                    .Concat(panelistEmails)
                    .Concat(adviserEmail is not null ? [adviserEmail] : [])
                    .Distinct();

                var panelistNames = panelistUsers.Select(p => $"{p.FirstName} {p.LastName}".Trim()).ToList();
                var html    = DefenseEmailTemplates.Scheduled(group.GroupName, schedule.Phase, schedule.ScheduledDateTime, schedule.Venue, schedule.DurationMinutes, panelistNames);
                var subject = $"Defense Scheduled – {group.GroupName} – {DefenseEmailTemplates.PhaseLabel(schedule.Phase)}";
                await Task.WhenAll(allEmails.Select(to => SendEmailSafeAsync(to, subject, html)));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send scheduling notifications for defense {Id}", schedule.Id);
            }

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

            if (schedule.Status == DefenseStatus.Completed)
                throw new InvalidOperationException("Cannot modify a completed defense.");

            var rescheduled = false;
            if (dto.ScheduledDateTime.HasValue)
            {
                // Only validate and mark as rescheduled when the time actually changes.
                // Comparing ticks works because both values are the same UTC moment
                // (stored Unspecified, sent back as Utc — same underlying ticks).
                var timeChanged = dto.ScheduledDateTime.Value.Ticks != schedule.ScheduledDateTime.Ticks;
                if (timeChanged)
                {
                    var newDuration = dto.DurationMinutes ?? schedule.DurationMinutes;
                    PhilippineTime.ValidateScheduleHours(dto.ScheduledDateTime.Value, newDuration);
                    schedule.ScheduledDateTime = dto.ScheduledDateTime.Value;
                    schedule.Status = DefenseStatus.Rescheduled;
                    rescheduled = true;
                }
            }
            if (dto.Venue is not null)          schedule.Venue           = dto.Venue;
            if (dto.Phase.HasValue)             schedule.Phase           = dto.Phase.Value;
            // Duration-only validation is skipped here: the frontend already validated the
            // end time before calling the API, and the stored ScheduledDateTime has
            // DateTimeKind.Unspecified (not reliably UTC), making server-side PHT conversion unreliable.
            if (dto.DurationMinutes.HasValue)   schedule.DurationMinutes = dto.DurationMinutes.Value;
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

            // Notifications are best-effort — a failure must not roll back the committed save
            if (rescheduled)
            {
                try
                {
                    var inAppMsg = $"Defense rescheduled to {schedule.ScheduledDateTime:MMM dd, yyyy h:mm tt} at {schedule.Venue}.";
                    await _notifications.SendToGroupMembersAsync(schedule.CapstoneGroupId, inAppMsg, NotificationType.DefenseRescheduled, defenseId: id);

                    var group2 = await _db.CapstoneGroups.Include(g => g.Adviser).FirstAsync(g => g.Id == schedule.CapstoneGroupId);
                    var memberEmails2 = await GetGroupMemberEmailsAsync(schedule.CapstoneGroupId);
                    var adviserEmail2 = group2.Adviser?.Email;
                    var allEmails2    = memberEmails2.Concat(adviserEmail2 is not null ? [adviserEmail2] : []).Distinct();

                    var html2    = DefenseEmailTemplates.Rescheduled(group2.GroupName, schedule.Phase, schedule.ScheduledDateTime, schedule.Venue);
                    var subject2 = $"Defense Rescheduled – {group2.GroupName} – {DefenseEmailTemplates.PhaseLabel(schedule.Phase)}";
                    await Task.WhenAll(allEmails2.Select(to => SendEmailSafeAsync(to, subject2, html2)));
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send rescheduling notifications for defense {Id}", id);
                }
            }

            return await GetScheduleByIdAsync(id)
                ?? throw new InvalidOperationException("Failed to reload schedule.");
        }

        public async Task<bool> CancelScheduleAsync(int id)
        {
            var schedule = await _db.DefenseSchedules.FindAsync(id);
            if (schedule is null) return false;
            if (schedule.Status == DefenseStatus.Completed) return false;

            schedule.Status = DefenseStatus.Cancelled;
            schedule.UpdatedAt = PhilippineTime.Now;
            await _db.SaveChangesAsync();

            // Notifications are best-effort — must not fail the cancel response
            try
            {
                await _notifications.SendToGroupMembersAsync(
                    schedule.CapstoneGroupId,
                    "Your defense has been cancelled. Please wait for rescheduling.",
                    NotificationType.DefenceCancelled,
                    defenseId: id);

                var group3        = await _db.CapstoneGroups.Include(g => g.Adviser).FirstAsync(g => g.Id == schedule.CapstoneGroupId);
                var memberEmails3 = await GetGroupMemberEmailsAsync(schedule.CapstoneGroupId);
                var adviserEmail3 = group3.Adviser?.Email;
                var allEmails3    = memberEmails3.Concat(adviserEmail3 is not null ? [adviserEmail3] : []).Distinct();

                var html3    = DefenseEmailTemplates.Cancelled(group3.GroupName, schedule.Phase);
                var subject3 = $"Defense Cancelled – {group3.GroupName} – {DefenseEmailTemplates.PhaseLabel(schedule.Phase)}";
                await Task.WhenAll(allEmails3.Select(to => SendEmailSafeAsync(to, subject3, html3)));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send cancellation notifications for defense {Id}", id);
            }

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

            var isAssigned = await _db.PanelAssignments
                .AnyAsync(pa => pa.DefenseScheduleId == dto.DefenseScheduleId && pa.PanelistId == panelistId);
            if (!isAssigned)
                throw new InvalidOperationException("You are not assigned to this defense panel.");

            var criterion = await _db.DefenseCriteria.FindAsync(dto.DefenseCriterionId)
                ?? throw new InvalidOperationException("Criterion not found.");

            if (criterion.Phase != schedule.Phase)
                throw new InvalidOperationException($"Criterion '{criterion.Name}' does not belong to the {schedule.Phase} rubric.");

            if (dto.Score < 0 || dto.Score > criterion.MaxScore)
                throw new InvalidOperationException($"Score must be between 0 and {criterion.MaxScore} for '{criterion.Name}'.");

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

        public async Task<IEnumerable<DefenseCriterionResponseDto>> GetCriteriaAsync(DefensePhase? phase = null)
        {
            var query = _db.DefenseCriteria.Where(c => c.IsActive);
            if (phase.HasValue) query = query.Where(c => c.Phase == phase.Value);
            var criteria = await query.OrderBy(c => c.Id).ToListAsync();
            return _mapper.Map<IEnumerable<DefenseCriterionResponseDto>>(criteria);
        }

        public async Task<DefenseCriterionResponseDto> CreateCriterionAsync(CreateCriterionRequestDto dto)
        {
            var criterion = new DefenseCriterion
            {
                Name        = dto.Name,
                Description = dto.Description,
                Weight      = dto.Weight,
                MaxScore    = dto.MaxScore,
                Phase       = dto.Phase,
            };

            _db.DefenseCriteria.Add(criterion);
            await _db.SaveChangesAsync();

            return _mapper.Map<DefenseCriterionResponseDto>(criterion);
        }

        public async Task<DefenseCriterionResponseDto> UpdateCriterionAsync(int id, UpdateCriterionRequestDto dto)
        {
            var criterion = await _db.DefenseCriteria.FindAsync(id)
                ?? throw new KeyNotFoundException($"Criterion {id} not found.");

            if (dto.Name is not null)        criterion.Name        = dto.Name;
            if (dto.Description is not null) criterion.Description = dto.Description;
            if (dto.Weight.HasValue)         criterion.Weight      = dto.Weight.Value;
            if (dto.MaxScore.HasValue)       criterion.MaxScore    = dto.MaxScore.Value;
            if (dto.Phase.HasValue)          criterion.Phase       = dto.Phase.Value;

            await _db.SaveChangesAsync();
            return _mapper.Map<DefenseCriterionResponseDto>(criterion);
        }

        public async Task<bool> DeleteCriterionAsync(int id)
        {
            var criterion = await _db.DefenseCriteria.FindAsync(id);
            if (criterion is null) return false;
            criterion.IsActive = false;
            await _db.SaveChangesAsync();
            return true;
        }

        private async Task<IEnumerable<string>> GetGroupMemberEmailsAsync(int groupId)
        {
            var emails = await _db.GroupMembers
                .Where(m => m.CapstoneGroupId == groupId)
                .Select(m => m.User.Email)
                .ToListAsync();
            return emails.Where(e => !string.IsNullOrEmpty(e)).Select(e => e!);
        }

        private async Task SendEmailSafeAsync(string to, string subject, string html)
        {
            try
            {
                await _email.SendEmailAsync(to, subject, html);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send defense email to {To}", to);
            }
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

        private async Task<ConsolidatedRatingDto> BuildConsolidatedRating(DefenseSchedule schedule)
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

            var totalCriteria = await _db.DefenseCriteria.CountAsync(c => c.IsActive && c.Phase == schedule.Phase);
            var totalRatingsExpected = panelCount * totalCriteria;
            var allSubmitted = schedule.DefenseRatings.Count >= totalRatingsExpected;

            return new ConsolidatedRatingDto
            {
                TotalWeightedScore = Math.Round(breakdown.Sum(b => b.WeightedContribution), 2),
                AllRatingsSubmitted = allSubmitted,
                CriterionBreakdown = breakdown
            };
        }
    }
}
