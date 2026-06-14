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
    public class GroupService : IGroupService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public GroupService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
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
                CompletionPercentage = Math.Round((approvedChapters / 5m) * 100, 2)
            };
        }
    }
}
