using AutoMapper;
using Microsoft.AspNetCore.Http;
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
    public class GroupService : IGroupService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _env;
        private readonly INotificationService _notifications;
        private readonly IEmailService _email;
        private readonly ILogger<GroupService> _logger;

        public GroupService(
            AppDbContext db,
            IMapper mapper,
            IWebHostEnvironment env,
            INotificationService notifications,
            IEmailService email,
            ILogger<GroupService> logger)
        {
            _db = db;
            _mapper = mapper;
            _env = env;
            _notifications = notifications;
            _email = email;
            _logger = logger;
        }

        public async Task<CapstoneGroupResponseDto> CreateGroupAsync(CreateGroupRequestDto dto)
        {
            var group = new CapstoneGroup
            {
                GroupName = dto.GroupName,
                AdviserId = dto.AdviserId,
                AcademicYear = dto.AcademicYear
            };

            _db.CapstoneGroups.Add(group);
            await _db.SaveChangesAsync();

            if (dto.MemberIds.Any())
            {
                var members = dto.MemberIds.Select(uid => new GroupMember
                {
                    CapstoneGroupId = group.Id,
                    UserId = uid
                });
                _db.GroupMembers.AddRange(members);
                await _db.SaveChangesAsync();
            }

            return await GetGroupByIdAsync(group.Id)
                ?? throw new InvalidOperationException("Failed to load created group.");
        }

        public async Task<CapstoneGroupResponseDto?> GetGroupByIdAsync(int id)
        {
            var group = await _db.CapstoneGroups
                .Include(g => g.Adviser)
                .Include(g => g.Members).ThenInclude(m => m.User)
                .Include(g => g.ChapterSubmissions)
                .Include(g => g.DefenseSchedules)
                .FirstOrDefaultAsync(g => g.Id == id);

            if (group is null) return null;

            var dto = _mapper.Map<CapstoneGroupResponseDto>(group);
            dto.MilestoneProgress = ComputeMilestone(group);
            dto.SystemLogoUrl = group.SystemLogoPath != null ? $"/api/groups/{group.Id}/logo" : null;
            return dto;
        }

        public async Task<IEnumerable<CapstoneGroupResponseDto>> GetAllGroupsAsync(GroupStatus? status = null)
        {
            var query = _db.CapstoneGroups
                .Include(g => g.Adviser)
                .Include(g => g.Members).ThenInclude(m => m.User)
                .Include(g => g.ChapterSubmissions)
                .Include(g => g.DefenseSchedules)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(g => g.Status == status.Value);

            var groups = await query.OrderByDescending(g => g.CreatedAt).ToListAsync();
            return groups.Select(g =>
            {
                var dto = _mapper.Map<CapstoneGroupResponseDto>(g);
                dto.MilestoneProgress = ComputeMilestone(g);
                dto.SystemLogoUrl = g.SystemLogoPath != null ? $"/api/groups/{g.Id}/logo" : null;
                return dto;
            });
        }

        public async Task<IEnumerable<CapstoneGroupResponseDto>> GetGroupsByAdviserAsync(string adviserId)
        {
            var groups = await _db.CapstoneGroups
                .Include(g => g.Adviser)
                .Include(g => g.Members).ThenInclude(m => m.User)
                .Include(g => g.ChapterSubmissions)
                .Include(g => g.DefenseSchedules)
                .Where(g => g.AdviserId == adviserId)
                .OrderByDescending(g => g.CreatedAt)
                .ToListAsync();

            return groups.Select(g =>
            {
                var dto = _mapper.Map<CapstoneGroupResponseDto>(g);
                dto.MilestoneProgress = ComputeMilestone(g);
                dto.SystemLogoUrl = g.SystemLogoPath != null ? $"/api/groups/{g.Id}/logo" : null;
                return dto;
            });
        }

        public async Task<CapstoneGroupResponseDto?> GetGroupByStudentAsync(string studentId)
        {
            var membership = await _db.GroupMembers
                .Include(gm => gm.CapstoneGroup).ThenInclude(g => g.Adviser)
                .Include(gm => gm.CapstoneGroup).ThenInclude(g => g.Members).ThenInclude(m => m.User)
                .Include(gm => gm.CapstoneGroup).ThenInclude(g => g.ChapterSubmissions)
                .Include(gm => gm.CapstoneGroup).ThenInclude(g => g.DefenseSchedules)
                .FirstOrDefaultAsync(gm => gm.UserId == studentId &&
                    gm.CapstoneGroup.Status == GroupStatus.Active);

            if (membership is null) return null;

            var dto = _mapper.Map<CapstoneGroupResponseDto>(membership.CapstoneGroup);
            dto.MilestoneProgress = ComputeMilestone(membership.CapstoneGroup);
            dto.SystemLogoUrl = membership.CapstoneGroup.SystemLogoPath != null
                ? $"/api/groups/{membership.CapstoneGroup.Id}/logo" : null;
            return dto;
        }

        public async Task<CapstoneGroupResponseDto> UpdateGroupAsync(int id, UpdateGroupRequestDto dto)
        {
            var group = await _db.CapstoneGroups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.Id == id)
                ?? throw new KeyNotFoundException($"Group {id} not found.");

            if (dto.GroupName is not null) group.GroupName = dto.GroupName;
            if (dto.AdviserId is not null) group.AdviserId = dto.AdviserId;
            if (dto.ProjectTitle is not null) group.ProjectTitle = dto.ProjectTitle;
            if (dto.TitleApproved.HasValue) group.TitleApproved = dto.TitleApproved.Value;

            if (dto.MemberIds is not null)
            {
                _db.GroupMembers.RemoveRange(group.Members);
                var newMembers = dto.MemberIds.Select(uid => new GroupMember
                {
                    CapstoneGroupId = group.Id,
                    UserId = uid
                });
                _db.GroupMembers.AddRange(newMembers);
            }

            await _db.SaveChangesAsync();
            return await GetGroupByIdAsync(id)
                ?? throw new InvalidOperationException("Failed to reload group.");
        }

        public async Task<bool> ArchiveGroupAsync(int id)
        {
            var group = await _db.CapstoneGroups.FindAsync(id);
            if (group is null) return false;

            group.Status = GroupStatus.Archived;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<CapstoneGroupResponseDto> UpdateVersionAsync(string studentId, UpdateVersionRequestDto dto)
        {
            var membership = await _db.GroupMembers
                .Include(gm => gm.CapstoneGroup)
                .FirstOrDefaultAsync(gm => gm.UserId == studentId &&
                    gm.CapstoneGroup.Status == GroupStatus.Active)
                ?? throw new KeyNotFoundException("No active group found for this student.");

            var group = membership.CapstoneGroup;
            group.ManuscriptVersion = dto.ManuscriptVersion;
            group.SystemVersion = dto.SystemVersion;

            await _db.SaveChangesAsync();
            return await GetGroupByIdAsync(group.Id)
                ?? throw new InvalidOperationException("Failed to reload group.");
        }

        public async Task<CapstoneGroupResponseDto> UploadLogoAsync(int groupId, IFormFile file, string callerId, string callerRole)
        {
            var group = await _db.CapstoneGroups.FindAsync(groupId)
                ?? throw new KeyNotFoundException($"Group {groupId} not found.");

            // Students may only upload a logo for the group they belong to
            if (callerRole == "Student")
            {
                var isMember = await _db.GroupMembers
                    .AnyAsync(m => m.CapstoneGroupId == groupId && m.UserId == callerId);
                if (!isMember)
                    throw new UnauthorizedAccessException("You are not a member of this group.");
            }

            var logoDir = Path.Combine(_env.WebRootPath, "uploads", "logos");
            Directory.CreateDirectory(logoDir);

            // Delete old logo if present
            if (group.SystemLogoPath != null && File.Exists(group.SystemLogoPath))
                File.Delete(group.SystemLogoPath);

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var stored = Path.Combine(logoDir, $"group_{groupId}{ext}");
            using (var stream = File.Create(stored))
                await file.CopyToAsync(stream);

            group.SystemLogoPath = stored;
            await _db.SaveChangesAsync();

            return await GetGroupByIdAsync(groupId)
                ?? throw new InvalidOperationException("Failed to reload group.");
        }

        public async Task<CapstoneGroupResponseDto> AddMemberAsync(int groupId, string userId)
        {
            var group = await _db.CapstoneGroups.FindAsync(groupId)
                ?? throw new KeyNotFoundException($"Group {groupId} not found.");

            var alreadyMember = await _db.GroupMembers
                .AnyAsync(gm => gm.CapstoneGroupId == groupId && gm.UserId == userId);
            if (alreadyMember)
                throw new InvalidOperationException("This student is already a member of this group.");

            _db.GroupMembers.Add(new GroupMember { CapstoneGroupId = groupId, UserId = userId });
            await _db.SaveChangesAsync();
            return await GetGroupByIdAsync(groupId)
                ?? throw new InvalidOperationException("Failed to reload group.");
        }

        public async Task<CapstoneGroupResponseDto> RemoveMemberAsync(int groupId, string userId)
        {
            var member = await _db.GroupMembers
                .FirstOrDefaultAsync(gm => gm.CapstoneGroupId == groupId && gm.UserId == userId)
                ?? throw new KeyNotFoundException("Member not found in this group.");

            _db.GroupMembers.Remove(member);
            await _db.SaveChangesAsync();
            return await GetGroupByIdAsync(groupId)
                ?? throw new InvalidOperationException("Failed to reload group.");
        }

        public async Task<CapstoneGroupResponseDto> SetDeadlinesAsync(int groupId, SetGroupDeadlinesRequestDto dto)
        {
            var group = await _db.CapstoneGroups.FindAsync(groupId)
                ?? throw new KeyNotFoundException("Group not found.");

            group.ManuscriptDueDate = dto.ManuscriptDueDate;
            group.SystemFeaturesDueDate = dto.SystemFeaturesDueDate;
            await _db.SaveChangesAsync();

            return await GetGroupByIdAsync(groupId)
                ?? throw new InvalidOperationException("Failed to reload group.");
        }

        public async Task<(byte[] bytes, string contentType)?> GetLogoAsync(int groupId)
        {
            var group = await _db.CapstoneGroups.FindAsync(groupId);
            if (group?.SystemLogoPath is null || !File.Exists(group.SystemLogoPath))
                return null;

            var ext = Path.GetExtension(group.SystemLogoPath).ToLowerInvariant();
            var contentType = ext switch
            {
                ".png"  => "image/png",
                ".gif"  => "image/gif",
                ".webp" => "image/webp",
                _       => "image/jpeg",
            };
            return (await File.ReadAllBytesAsync(group.SystemLogoPath), contentType);
        }

        // ── Access guard ─────────────────────────────────────────────────────────

        public async Task<bool> CanAccessGroupAsync(string userId, string role, int groupId)
        {
            if (role is "Admin" or "SuperAdmin") return true;

            var group = await _db.CapstoneGroups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.Id == groupId);

            if (group is null) return false;

            if (role == "Faculty")
                return group.AdviserId == userId;

            return group.Members.Any(m => m.UserId == userId);
        }

        // ── Group Deadlines ──────────────────────────────────────────────────────

        public async Task<IEnumerable<GroupDeadlineResponseDto>> GetDeadlinesAsync(int groupId)
        {
            var list = await _db.GroupDeadlines
                .Include(d => d.CreatedBy)
                .Where(d => d.GroupId == groupId && d.IsActive)
                .OrderBy(d => d.DueDate)
                .ToListAsync();

            return list.Select(MapDeadline);
        }

        public async Task<GroupDeadlineResponseDto> CreateDeadlineAsync(
            string userId, string role, int groupId, CreateGroupDeadlineRequestDto dto)
        {
            var group = await _db.CapstoneGroups.FindAsync(groupId)
                ?? throw new KeyNotFoundException("Group not found.");

            if (role == "Faculty" && group.AdviserId != userId)
                throw new UnauthorizedAccessException("Only the group's adviser can add deadlines.");

            var deadline = new GroupDeadline
            {
                GroupId     = groupId,
                Title       = dto.Title,
                Description = dto.Description?.Trim(),
                DueDate     = dto.DueDate,
                CreatedById = userId,
            };
            _db.GroupDeadlines.Add(deadline);
            await _db.SaveChangesAsync();
            await _db.Entry(deadline).Reference(d => d.CreatedBy).LoadAsync();

            // Notify group members
            var members = await _db.GroupMembers
                .Where(m => m.CapstoneGroupId == groupId)
                .Select(m => new { m.UserId, m.User.Email })
                .ToListAsync();

            var memberIds = members.Select(m => m.UserId).ToList();

            var notifMsg = $"New deadline: \"{dto.Title}\" — due {dto.DueDate:MMM dd, yyyy}";
            foreach (var uid in memberIds)
                await _notifications.SendAsync(uid, notifMsg, NotificationType.DeadlinePosted, groupId: groupId);

            // Email group members
            var postedByName = $"{deadline.CreatedBy.FirstName} {deadline.CreatedBy.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(postedByName)) postedByName = deadline.CreatedBy.Email ?? "Faculty";
            var emailHtml    = DefenseEmailTemplates.DeadlinePosted(group.GroupName, dto.Title, dto.DueDate, dto.Description, postedByName);
            var emailSubject = $"New Deadline: \"{dto.Title}\" — {group.GroupName}";
            var memberEmails = members.Where(m => !string.IsNullOrEmpty(m.Email)).Select(m => m.Email!);
            await Task.WhenAll(memberEmails.Select(to => SendEmailSafeAsync(to, emailSubject, emailHtml)));

            // Optionally post as classroom announcement
            if (dto.PostAsAnnouncement)
            {
                var classroomId = await FindClassroomForGroupAsync(groupId, memberIds);
                if (classroomId.HasValue)
                {
                    var content = $"Due: {dto.DueDate:dddd, MMMM dd, yyyy}";
                    if (!string.IsNullOrWhiteSpace(dto.Description))
                        content += $"\n\n{dto.Description}";

                    var announcement = new ClassroomAnnouncement
                    {
                        ClassroomId   = classroomId.Value,
                        Title         = dto.Title,
                        Content       = content,
                        TargetGroupId = dto.AnnouncementScope == "Class" ? null : groupId,
                        PostedById    = userId,
                    };
                    _db.ClassroomAnnouncements.Add(announcement);
                    await _db.SaveChangesAsync();

                    // Notify class-wide recipients if scope is Class
                    if (dto.AnnouncementScope == "Class")
                    {
                        var classStudents = await _db.ClassroomEnrollments
                            .Where(e => e.ClassroomId == classroomId.Value && e.Status == EnrollmentStatus.Active)
                            .Select(e => e.StudentId)
                            .ToListAsync();

                        foreach (var sid in classStudents.Except(memberIds))
                            await _notifications.SendAsync(sid, $"Announcement: {dto.Title}", NotificationType.ClassroomAnnouncement);

                        // Push the deadline to every other active group in the classroom
                        var otherGroupIds = await _db.GroupMembers
                            .Where(gm => classStudents.Contains(gm.UserId) && gm.CapstoneGroupId != groupId)
                            .Select(gm => gm.CapstoneGroupId)
                            .Distinct()
                            .ToListAsync();

                        foreach (var otherGid in otherGroupIds)
                            _db.GroupDeadlines.Add(new GroupDeadline
                            {
                                GroupId     = otherGid,
                                Title       = dto.Title,
                                Description = dto.Description?.Trim(),
                                DueDate     = dto.DueDate,
                                CreatedById = userId,
                            });

                        if (otherGroupIds.Count > 0)
                        {
                            await _db.SaveChangesAsync();

                            var otherMemberIds = await _db.GroupMembers
                                .Where(gm => otherGroupIds.Contains(gm.CapstoneGroupId))
                                .Select(gm => gm.UserId)
                                .Distinct()
                                .ToListAsync();

                            var broadcastMsg = $"Class deadline: \"{dto.Title}\" — due {dto.DueDate:MMM dd, yyyy}";
                            foreach (var uid in otherMemberIds)
                                await _notifications.SendAsync(uid, broadcastMsg, NotificationType.DeadlinePosted);
                        }
                    }
                }
            }

            return MapDeadline(deadline);
        }

        public async Task<GroupDeadlineResponseDto> UpdateDeadlineAsync(
            string userId, string role, int groupId, int deadlineId, UpdateGroupDeadlineRequestDto dto)
        {
            var deadline = await _db.GroupDeadlines
                .Include(d => d.CreatedBy)
                .FirstOrDefaultAsync(d => d.Id == deadlineId && d.GroupId == groupId && d.IsActive)
                ?? throw new KeyNotFoundException("Deadline not found.");

            if (role == "Faculty")
            {
                var group = await _db.CapstoneGroups.FindAsync(groupId)
                    ?? throw new KeyNotFoundException("Group not found.");
                if (group.AdviserId != userId)
                    throw new UnauthorizedAccessException("Only the group's adviser can edit deadlines.");
            }

            deadline.Title       = dto.Title.Trim();
            deadline.Description = dto.Description?.Trim();
            deadline.DueDate     = dto.DueDate;

            await _db.SaveChangesAsync();
            return MapDeadline(deadline);
        }

        public async Task<bool> DeleteDeadlineAsync(string userId, string role, int groupId, int deadlineId)
        {
            var deadline = await _db.GroupDeadlines
                .FirstOrDefaultAsync(d => d.Id == deadlineId && d.GroupId == groupId && d.IsActive);

            if (deadline is null) return false;

            if (role == "Faculty")
            {
                var group = await _db.CapstoneGroups.FindAsync(groupId);
                if (group?.AdviserId != userId)
                    throw new UnauthorizedAccessException("Only the group's adviser can remove deadlines.");
            }

            deadline.IsActive = false;
            await _db.SaveChangesAsync();
            return true;
        }

        private async Task<int?> FindClassroomForGroupAsync(int groupId, List<string>? memberIds = null)
        {
            memberIds ??= await _db.GroupMembers
                .Where(m => m.CapstoneGroupId == groupId)
                .Select(m => m.UserId)
                .ToListAsync();

            if (memberIds.Count == 0) return null;

            return await _db.ClassroomEnrollments
                .Where(e => memberIds.Contains(e.StudentId) && e.Status == EnrollmentStatus.Active)
                .Select(e => (int?)e.ClassroomId)
                .FirstOrDefaultAsync();
        }

        private static GroupDeadlineResponseDto MapDeadline(GroupDeadline d) => new()
        {
            Id          = d.Id,
            GroupId     = d.GroupId,
            Title       = d.Title,
            Description = d.Description,
            DueDate     = d.DueDate,
            CreatedAt   = d.CreatedAt,
            CreatedBy   = new UserSummaryDto
            {
                Id       = d.CreatedBy.Id,
                FullName = $"{d.CreatedBy.FirstName} {d.CreatedBy.LastName}".Trim(),
                Email    = d.CreatedBy.Email ?? string.Empty,
            },
        };

        public async Task<IEnumerable<CapstoneGroupResponseDto>> GetGroupsByPanelistAsync(string panelistId)
        {
            var groupIds = await _db.PanelAssignments
                .Include(pa => pa.DefenseSchedule)
                .Where(pa => pa.PanelistId == panelistId)
                .Select(pa => pa.DefenseSchedule.CapstoneGroupId)
                .Distinct()
                .ToListAsync();

            var groups = await _db.CapstoneGroups
                .Include(g => g.Adviser)
                .Include(g => g.Members).ThenInclude(m => m.User)
                .Include(g => g.ChapterSubmissions)
                .Include(g => g.DefenseSchedules)
                .Where(g => groupIds.Contains(g.Id))
                .OrderByDescending(g => g.CreatedAt)
                .ToListAsync();

            return groups.Select(g =>
            {
                var dto = _mapper.Map<CapstoneGroupResponseDto>(g);
                dto.MilestoneProgress = ComputeMilestone(g);
                dto.SystemLogoUrl = g.SystemLogoPath != null ? $"/api/groups/{g.Id}/logo" : null;
                return dto;
            });
        }

        public async Task<CapstoneGroupResponseDto> SetDefenseOutcomeAsync(int groupId, SetGroupDefenseOutcomeRequestDto dto)
        {
            var group = await _db.CapstoneGroups
                .Include(g => g.Adviser)
                .Include(g => g.Members).ThenInclude(m => m.User)
                .Include(g => g.ChapterSubmissions)
                .Include(g => g.DefenseSchedules)
                .FirstOrDefaultAsync(g => g.Id == groupId)
                ?? throw new KeyNotFoundException("Group not found.");

            if (dto.DefenseOutcome.HasValue) group.DefenseOutcome = dto.DefenseOutcome.Value;
            if (dto.RevisionLevel.HasValue) group.RevisionLevel = dto.RevisionLevel.Value;
            if (dto.RequiresReDefense.HasValue) group.RequiresReDefense = dto.RequiresReDefense.Value;

            await _db.SaveChangesAsync();

            var result = _mapper.Map<CapstoneGroupResponseDto>(group);
            result.MilestoneProgress = ComputeMilestone(group);
            result.SystemLogoUrl = group.SystemLogoPath != null ? $"/api/groups/{group.Id}/logo" : null;
            return result;
        }

        private async Task SendEmailSafeAsync(string to, string subject, string html)
        {
            try   { await _email.SendEmailAsync(to, subject, html); }
            catch (Exception ex) { _logger.LogError(ex, "Failed to send deadline email to {To}", to); }
        }

        private static MilestoneProgressDto ComputeMilestone(CapstoneGroup group)
        {
            var approvedChapters = group.ChapterSubmissions
                .GroupBy(cs => cs.ChapterNumber)
                .Count(g => g.Any(cs => cs.Status == ChapterStatus.Approved));

            var defenseCompleted = group.DefenseSchedules
                .Any(ds => ds.Status == DefenseStatus.Completed);

            var defenseScheduled = group.DefenseSchedules
                .Any(ds => ds.Status == DefenseStatus.Scheduled || ds.Status == DefenseStatus.Rescheduled);

            return new MilestoneProgressDto
            {
                ApprovedChapters = approvedChapters,
                DefenseScheduled = defenseScheduled || defenseCompleted,
                DefenseCompleted = defenseCompleted,
                CompletionPercentage = Math.Min(Math.Round((approvedChapters / 5m) * 100, 2), 100)
            };
        }
    }
}
