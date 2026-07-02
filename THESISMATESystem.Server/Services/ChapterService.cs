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
    public class ChapterService : IChapterService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;
        private readonly INotificationService _notifications;
        private readonly IWebHostEnvironment _env;
        private readonly IGroupAccessChecker _groupAccess;

        public ChapterService(AppDbContext db, IMapper mapper,
            INotificationService notifications, IWebHostEnvironment env,
            IGroupAccessChecker groupAccess)
        {
            _db = db;
            _mapper = mapper;
            _notifications = notifications;
            _env = env;
            _groupAccess = groupAccess;
        }

        public async Task<ChapterSubmissionResponseDto> SubmitChapterAsync(
            int groupId, string submittedById, SubmitChapterRequestDto dto)
        {
            var isMember = await _db.GroupMembers
                .AnyAsync(gm => gm.CapstoneGroupId == groupId && gm.UserId == submittedById);
            if (!isMember)
                throw new UnauthorizedAccessException("You are not a member of this group.");

            var latestVersion = await _db.ChapterSubmissions
                .Where(cs => cs.CapstoneGroupId == groupId && cs.ChapterNumber == dto.ChapterNumber)
                .MaxAsync(cs => (int?)cs.Version) ?? 0;

            var uploadDir = Path.Combine(_env.WebRootPath, "uploads", "chapters", groupId.ToString());
            Directory.CreateDirectory(uploadDir);

            var fileName = $"Ch{dto.ChapterNumber}_v{latestVersion + 1}_{Path.GetFileName(dto.File.FileName)}";
            var filePath = Path.Combine(uploadDir, fileName);

            using (var stream = File.Create(filePath))
                await dto.File.CopyToAsync(stream);

            var submission = new ChapterSubmission
            {
                CapstoneGroupId = groupId,
                ChapterNumber = dto.ChapterNumber,
                Version = latestVersion + 1,
                FileName = dto.File.FileName,
                FilePath = filePath,
                SubmittedById = submittedById
            };

            _db.ChapterSubmissions.Add(submission);
            await _db.SaveChangesAsync();

            // Notify the adviser
            var group = await _db.CapstoneGroups.FindAsync(groupId);
            if (group is not null)
            {
                await _notifications.SendAsync(
                    group.AdviserId,
                    $"Chapter {dto.ChapterNumber} (v{submission.Version}) submitted by group '{group.GroupName}'.",
                    NotificationType.ChapterSubmitted,
                    groupId: groupId,
                    chapterId: submission.Id);
            }

            return await LoadChapterDtoAsync(submission.Id)
                ?? throw new InvalidOperationException("Failed to load submission.");
        }

        public async Task<IEnumerable<ChapterSubmissionResponseDto>> GetChaptersByGroupAsync(int groupId, string callerId, string callerRole)
        {
            if (!await _groupAccess.CanAccessGroupAsync(callerId, callerRole, groupId))
                throw new UnauthorizedAccessException();

            // Fetch all first, then group in memory — EF Core drops Include() through GroupBy/Select/First in SQL.
            var all = await _db.ChapterSubmissions
                .Include(cs => cs.SubmittedBy)
                .Include(cs => cs.RevisionNotes).ThenInclude(rn => rn.CreatedBy)
                .Where(cs => cs.CapstoneGroupId == groupId)
                .ToListAsync();

            var latest = all
                .GroupBy(cs => cs.ChapterNumber)
                .Select(g => g.OrderByDescending(cs => cs.Version).First())
                .ToList();

            return _mapper.Map<IEnumerable<ChapterSubmissionResponseDto>>(latest);
        }

        public async Task<IEnumerable<ChapterSubmissionResponseDto>> GetChapterHistoryAsync(int groupId, int chapterNumber, string callerId, string callerRole)
        {
            if (!await _groupAccess.CanAccessGroupAsync(callerId, callerRole, groupId))
                throw new UnauthorizedAccessException();

            var submissions = await _db.ChapterSubmissions
                .Include(cs => cs.SubmittedBy)
                .Include(cs => cs.RevisionNotes).ThenInclude(rn => rn.CreatedBy)
                .Where(cs => cs.CapstoneGroupId == groupId && cs.ChapterNumber == chapterNumber)
                .OrderByDescending(cs => cs.Version)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ChapterSubmissionResponseDto>>(submissions);
        }

        public async Task<ChapterSubmissionResponseDto?> GetChapterByIdAsync(int id, string callerId, string callerRole)
        {
            var submission = await _db.ChapterSubmissions
                .Include(cs => cs.SubmittedBy)
                .Include(cs => cs.RevisionNotes).ThenInclude(rn => rn.CreatedBy)
                .FirstOrDefaultAsync(cs => cs.Id == id);

            if (submission is null) return null;

            if (!await _groupAccess.CanAccessGroupAsync(callerId, callerRole, submission.CapstoneGroupId))
                throw new UnauthorizedAccessException();

            return _mapper.Map<ChapterSubmissionResponseDto>(submission);
        }

        private async Task<ChapterSubmissionResponseDto?> LoadChapterDtoAsync(int id)
        {
            var submission = await _db.ChapterSubmissions
                .Include(cs => cs.SubmittedBy)
                .Include(cs => cs.RevisionNotes).ThenInclude(rn => rn.CreatedBy)
                .FirstOrDefaultAsync(cs => cs.Id == id);

            return submission is null ? null : _mapper.Map<ChapterSubmissionResponseDto>(submission);
        }

        public async Task<ChapterSubmissionResponseDto> UpdateChapterStatusAsync(
            int id, ChapterStatus status, string adviserId, string callerRole)
        {
            var submission = await _db.ChapterSubmissions
                .Include(cs => cs.CapstoneGroup)
                .FirstOrDefaultAsync(cs => cs.Id == id)
                ?? throw new KeyNotFoundException($"Submission {id} not found.");

            // Only the group's adviser may change status; admins bypass
            if (callerRole == "Faculty" && submission.CapstoneGroup.AdviserId != adviserId)
                throw new UnauthorizedAccessException("Only the group's adviser can update chapter status.");

            submission.Status = status;
            await _db.SaveChangesAsync();

            await _notifications.SendToGroupMembersAsync(
                submission.CapstoneGroupId,
                $"Chapter {submission.ChapterNumber} status updated to '{status}'.",
                NotificationType.ChapterStatusUpdated,
                chapterId: id);

            return await LoadChapterDtoAsync(id)
                ?? throw new InvalidOperationException("Failed to reload submission.");
        }

        public async Task<RevisionNoteResponseDto> AddRevisionNoteAsync(
            int chapterId, string adviserId, string callerRole, AddRevisionNoteRequestDto dto)
        {
            var submission = await _db.ChapterSubmissions
                .Include(cs => cs.CapstoneGroup)
                .FirstOrDefaultAsync(cs => cs.Id == chapterId)
                ?? throw new KeyNotFoundException($"Submission {chapterId} not found.");

            // Only the group's adviser may add revision notes; admins bypass
            if (callerRole == "Faculty" && submission.CapstoneGroup.AdviserId != adviserId)
                throw new UnauthorizedAccessException("Only the group's adviser can add revision notes.");

            var note = new RevisionNote
            {
                ChapterSubmissionId = chapterId,
                Notes = dto.Notes,
                CreatedById = adviserId
            };

            _db.RevisionNotes.Add(note);
            await _db.SaveChangesAsync();

            await _notifications.SendToGroupMembersAsync(
                submission.CapstoneGroupId,
                $"Revision notes added to Chapter {submission.ChapterNumber}.",
                NotificationType.RevisionNoteAdded,
                chapterId: chapterId);

            var loaded = await _db.RevisionNotes
                .Include(rn => rn.CreatedBy)
                .FirstAsync(rn => rn.Id == note.Id);

            return _mapper.Map<RevisionNoteResponseDto>(loaded);
        }

        public async Task<string> GetDownloadPathAsync(int chapterId, string callerId, string callerRole)
        {
            var submission = await _db.ChapterSubmissions.FindAsync(chapterId)
                ?? throw new KeyNotFoundException($"Submission {chapterId} not found.");

            if (!await _groupAccess.CanAccessGroupAsync(callerId, callerRole, submission.CapstoneGroupId))
                throw new UnauthorizedAccessException();

            return submission.FilePath;
        }
    }
}
