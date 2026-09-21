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
        private readonly IGroupAccessChecker _groupAccess;

        public GroupService(
            AppDbContext db,
            IMapper mapper,
            IWebHostEnvironment env,
            INotificationService notifications,
            IEmailService email,
            ILogger<GroupService> logger,
            IGroupAccessChecker groupAccess)
        {
            _groupAccess = groupAccess;
            _db = db;
            _mapper = mapper;
            _env = env;
            _notifications = notifications;
            _email = email;
            _logger = logger;
        }

        public async Task<CapstoneGroupResponseDto> CreateGroupAsync(CreateGroupRequestDto dto)
        {
            // Everything is validated before anything is written, and the group, its members and
            // its panel are saved in one SaveChanges so a rejected request leaves nothing behind.
            var memberIds = dto.MemberIds.Distinct().ToList();
            await EnsureNotInAnotherActiveGroupAsync(memberIds, excludingGroupId: -1);
            await EnsureMembersShareSectionAsync(memberIds);
            await EnsureIsFacultyAsync([dto.AdviserId], "The adviser must be a Faculty member.");
            var panel = await BuildPanelAsync(dto.PanelistIds, dto.PanelChairId, dto.AdviserId);

            var group = new CapstoneGroup
            {
                GroupName = dto.GroupName.Trim(),
                AdviserId = dto.AdviserId,
                AcademicYear = dto.AcademicYear.Trim(),
            };
            foreach (var uid in memberIds) group.Members.Add(new GroupMember { UserId = uid });
            foreach (var p in panel) group.PanelMembers.Add(p);

            _db.CapstoneGroups.Add(group);
            await _db.SaveChangesAsync();

            await NotifyPanelAsync(group, panel.Select(p => p.PanelistId));

            return await GetGroupByIdAsync(group.Id)
                ?? throw new InvalidOperationException("Failed to load created group.");
        }

        /// <summary>
        /// Validates a panel and returns it as unsaved rows. Panelists must be Faculty, distinct,
        /// and must not include the group's own adviser. The chair defaults to the first panelist.
        /// </summary>
        private async Task<List<GroupPanelMember>> BuildPanelAsync(IEnumerable<string> panelistIds, string? chairId, string adviserId)
        {
            var ids = panelistIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
            if (ids.Count == 0)
                throw new InvalidOperationException("Select at least one panel member.");
            if (ids.Contains(adviserId))
                throw new InvalidOperationException("The group's adviser cannot also sit on its panel.");

            await EnsureIsFacultyAsync(ids, "Panel members must be Faculty.");

            var chair = string.IsNullOrWhiteSpace(chairId) ? ids[0] : chairId;
            if (!ids.Contains(chair))
                throw new InvalidOperationException("The panel chair must be one of the selected panel members.");

            return ids.Select(id => new GroupPanelMember { PanelistId = id, IsChair = id == chair }).ToList();
        }

        private async Task EnsureIsFacultyAsync(IReadOnlyCollection<string> userIds, string message)
        {
            var facultyCount = await _db.Users
                .Where(u => userIds.Contains(u.Id) && u.IsActive)
                .Where(u => _db.UserRoles.Any(ur => ur.UserId == u.Id
                    && _db.Roles.Any(r => r.Id == ur.RoleId && r.Name == "Faculty")))
                .CountAsync();
            if (facultyCount != userIds.Distinct().Count())
                throw new InvalidOperationException(message);
        }

        // A group is formed within one block/section, so its members must all belong to the same one.
        private async Task EnsureMembersShareSectionAsync(IReadOnlyCollection<string> memberIds)
        {
            if (memberIds.Count == 0) return;

            var sections = await _db.Users
                .Where(u => memberIds.Contains(u.Id))
                .Select(u => new { u.FirstName, u.LastName, u.SectionId })
                .ToListAsync();

            var unassigned = sections.Where(m => m.SectionId == null).Select(m => $"{m.FirstName} {m.LastName}".Trim()).ToList();
            if (unassigned.Count > 0)
                throw new InvalidOperationException(
                    $"{string.Join(", ", unassigned)} {(unassigned.Count == 1 ? "has" : "have")} no block/section yet. Assign one on the Sections page first.");

            if (sections.Select(m => m.SectionId).Distinct().Count() > 1)
                throw new InvalidOperationException("All members of a group must belong to the same block/section.");
        }

        private async Task NotifyPanelAsync(CapstoneGroup group, IEnumerable<string> panelistIds)
        {
            // Best-effort: the group is already saved.
            try
            {
                foreach (var id in panelistIds)
                    await _notifications.SendAsync(id,
                        $"You have been assigned to the panel of {group.GroupName}. You can now monitor its progress.",
                        NotificationType.PanelAssigned, groupId: group.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to notify panel of group {GroupId}", group.Id);
            }
        }

        private IQueryable<CapstoneGroup> GroupQuery() =>
            _db.CapstoneGroups
                .Include(g => g.Adviser)
                .Include(g => g.Members).ThenInclude(m => m.User)
                .Include(g => g.PanelMembers).ThenInclude(p => p.Panelist)
                .Include(g => g.ChapterSubmissions)
                .Include(g => g.DefenseSchedules)
                // The collection includes multiply out in one query: a group with 4 members,
                // 20 chapters and 3 defenses returns 240 rows instead of 27. Split them.
                .AsSplitQuery();

        public async Task<CapstoneGroupResponseDto?> GetGroupByIdAsync(int id)
        {
            var group = await GroupQuery()
                .FirstOrDefaultAsync(g => g.Id == id);

            if (group is null) return null;

            var dto = _mapper.Map<CapstoneGroupResponseDto>(group);
            dto.MilestoneProgress = ComputeMilestone(group);
            dto.SystemLogoUrl = group.SystemLogoPath != null ? $"/api/groups/{group.Id}/logo" : null;
            return dto;
        }

        public async Task<IEnumerable<CapstoneGroupResponseDto>> GetAllGroupsAsync(GroupStatus? status = null)
        {
            var query = GroupQuery()
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
            var groups = await GroupQuery()
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
                .Include(gm => gm.CapstoneGroup).ThenInclude(g => g.PanelMembers).ThenInclude(p => p.Panelist)
                .Include(gm => gm.CapstoneGroup).ThenInclude(g => g.ChapterSubmissions)
                .Include(gm => gm.CapstoneGroup).ThenInclude(g => g.DefenseSchedules)
                .AsSplitQuery()
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
                .Include(g => g.PanelMembers)
                .FirstOrDefaultAsync(g => g.Id == id)
                ?? throw new KeyNotFoundException($"Group {id} not found.");

            if (dto.AdviserId is not null && dto.AdviserId != group.AdviserId)
                await EnsureIsFacultyAsync([dto.AdviserId], "The adviser must be a Faculty member.");

            var adviserId = dto.AdviserId ?? group.AdviserId;
            List<GroupPanelMember>? newPanel = null;
            if (dto.PanelistIds is not null)
                newPanel = await BuildPanelAsync(dto.PanelistIds, dto.PanelChairId, adviserId);
            else if (dto.AdviserId is not null && group.PanelMembers.Any(p => p.PanelistId == dto.AdviserId))
                throw new InvalidOperationException("The new adviser is on this group's panel. Remove them from the panel first.");

            if (dto.MemberIds is not null)
            {
                var ids = dto.MemberIds.Distinct().ToList();
                await EnsureNotInAnotherActiveGroupAsync(ids, id);
                await EnsureMembersShareSectionAsync(ids);
            }

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

            var addedPanelists = new List<string>();
            if (newPanel is not null)
            {
                var previous = group.PanelMembers.Select(p => p.PanelistId).ToHashSet();
                addedPanelists = newPanel.Select(p => p.PanelistId).Where(pid => !previous.Contains(pid)).ToList();
                _db.GroupPanelMembers.RemoveRange(group.PanelMembers);
                foreach (var p in newPanel) { p.CapstoneGroupId = group.Id; _db.GroupPanelMembers.Add(p); }
            }

            await _db.SaveChangesAsync();
            if (addedPanelists.Count > 0) await NotifyPanelAsync(group, addedPanelists);
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

            await EnsureNotInAnotherActiveGroupAsync([userId], groupId);

            var memberIds = await _db.GroupMembers
                .Where(gm => gm.CapstoneGroupId == groupId)
                .Select(gm => gm.UserId)
                .ToListAsync();
            memberIds.Add(userId);
            await EnsureMembersShareSectionAsync(memberIds);

            _db.GroupMembers.Add(new GroupMember { CapstoneGroupId = groupId, UserId = userId });
            await _db.SaveChangesAsync();
            return await GetGroupByIdAsync(groupId)
                ?? throw new InvalidOperationException("Failed to reload group.");
        }

        /// <summary>
        /// A student belongs to at most one active capstone group. Completed and archived groups
        /// are ignored, so last year's members stay free to join a new group. Enforced here because
        /// the UI can only hide candidates it knows about — two admins adding the same student to
        /// different groups would otherwise both succeed.
        /// </summary>
        private async Task EnsureNotInAnotherActiveGroupAsync(IReadOnlyCollection<string> userIds, int excludingGroupId)
        {
            if (userIds.Count == 0) return;

            var conflicts = await _db.GroupMembers
                .Where(gm => userIds.Contains(gm.UserId)
                          && gm.CapstoneGroupId != excludingGroupId
                          && gm.CapstoneGroup.Status == GroupStatus.Active)
                .Select(gm => new
                {
                    Name = gm.User.FirstName + " " + gm.User.LastName,
                    gm.CapstoneGroup.GroupName,
                })
                .ToListAsync();

            if (conflicts.Count == 0) return;

            // Grouped by student, not by row: data predating this rule can put one student in two
            // active groups, and counting rows made a single person read as "these students".
            var byStudent = conflicts
                .GroupBy(c => c.Name.Trim())
                .Select(g => $"{g.Key} is in {string.Join(" and ", g.Select(c => c.GroupName).Distinct())}")
                .ToList();

            throw new InvalidOperationException(
                $"{string.Join("; ", byStudent)}. A student can only belong to one active group — " +
                "remove them there first.");
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

        public async Task<CapstoneGroupResponseDto> SetDeadlinesAsync(int groupId, string callerId, string callerRole, SetGroupDeadlinesRequestDto dto)
        {
            var group = await _db.CapstoneGroups.FindAsync(groupId)
                ?? throw new KeyNotFoundException("Group not found.");

            if (callerRole == "Faculty" && group.AdviserId != callerId)
                throw new UnauthorizedAccessException("Only the group's adviser can set deadlines.");

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

        // Delegates to the canonical rule so adviser, panel and Faculty-in-Charge access
        // agree with every other group-scoped endpoint.
        public Task<bool> CanAccessGroupAsync(string userId, string role, int groupId)
            => _groupAccess.CanAccessGroupAsync(userId, role, groupId);

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
            var groupIds = await _db.GroupPanelMembers
                .Where(p => p.PanelistId == panelistId)
                .Select(p => p.CapstoneGroupId)
                .Union(_db.PanelAssignments
                    .Where(pa => pa.PanelistId == panelistId)
                    .Select(pa => pa.DefenseSchedule.CapstoneGroupId))
                .ToListAsync();

            var groups = await GroupQuery()
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
            var group = await GroupQuery()
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
