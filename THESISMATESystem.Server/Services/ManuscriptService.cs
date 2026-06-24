using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.RegularExpressions;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;
using THESISMATESystem.Server.Interfaces;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Services
{
    public class ManuscriptService : IManuscriptService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;
        private readonly INotificationService _notifications;
        private readonly IWebHostEnvironment _env;

        private static readonly HashSet<string> ValidKeys =
        [
            "chapter1", "chapter2", "chapter3", "chapter4", "chapter5", "references"
        ];

        public ManuscriptService(AppDbContext db, IMapper mapper, INotificationService notifications, IWebHostEnvironment env)
        {
            _db = db;
            _mapper = mapper;
            _notifications = notifications;
            _env = env;
        }

        public async Task<bool> IsAuthorizedForGroupAsync(string userId, string role, int groupId)
        {
            if (role is "Admin" or "SuperAdmin") return true;

            if (role == "Adviser")
                return await _db.CapstoneGroups
                    .AnyAsync(g => g.Id == groupId && g.AdviserId == userId);

            if (role == "Panel")
                return await _db.PanelAssignments
                    .AnyAsync(pa => pa.PanelistId == userId &&
                        pa.DefenseSchedule.CapstoneGroupId == groupId);

            if (role == "FacultyIC")
            {
                var memberIds = await _db.GroupMembers
                    .Where(gm => gm.CapstoneGroupId == groupId)
                    .Select(gm => gm.UserId)
                    .ToListAsync();

                return await _db.ClassroomEnrollments
                    .AnyAsync(ce => memberIds.Contains(ce.StudentId) &&
                        ce.Classroom.FacultyICId == userId);
            }

            return false;
        }

        public async Task<IEnumerable<ManuscriptSectionResponseDto>?> GetSectionsByStudentAsync(string studentId)
        {
            var membership = await _db.GroupMembers
                .FirstOrDefaultAsync(gm => gm.UserId == studentId &&
                    gm.CapstoneGroup.Status == GroupStatus.Active);

            if (membership is null) return null;
            return await GetSectionsAsync(membership.CapstoneGroupId);
        }

        public async Task<IEnumerable<ManuscriptSectionResponseDto>> GetSectionsAsync(int groupId)
        {
            var sections = await _db.ManuscriptSections
                .Include(s => s.UpdatedBy)
                .Where(s => s.CapstoneGroupId == groupId)
                .OrderBy(s => s.SectionKey)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ManuscriptSectionResponseDto>>(sections);
        }

        public async Task<ManuscriptSectionResponseDto> SaveSectionAsync(string studentId, string sectionKey, SaveSectionRequestDto dto)
        {
            if (!ValidKeys.Contains(sectionKey))
                throw new ArgumentException($"Invalid section key: {sectionKey}");

            var membership = await _db.GroupMembers
                .Include(gm => gm.CapstoneGroup).ThenInclude(g => g.Adviser)
                .FirstOrDefaultAsync(gm => gm.UserId == studentId &&
                    gm.CapstoneGroup.Status == GroupStatus.Active)
                ?? throw new KeyNotFoundException("No active group found for this student.");

            var group = membership.CapstoneGroup;

            if (group.ManuscriptLocked)
                throw new InvalidOperationException("The manuscript is locked. Voting has been finalized.");

            var section = await _db.ManuscriptSections
                .FirstOrDefaultAsync(s => s.CapstoneGroupId == group.Id && s.SectionKey == sectionKey);

            var wordCount = CountWords(dto.Content);
            var yjsBytes = dto.YjsState != null ? Convert.FromBase64String(dto.YjsState) : null;

            if (section is null)
            {
                section = new ManuscriptSection
                {
                    CapstoneGroupId = group.Id,
                    SectionKey = sectionKey,
                    Content = dto.Content,
                    WordCount = wordCount,
                    UpdatedById = studentId,
                    UpdatedAt = PhilippineTime.Now,
                    YjsState = yjsBytes
                };
                _db.ManuscriptSections.Add(section);
            }
            else
            {
                section.Content = dto.Content;
                section.WordCount = wordCount;
                section.UpdatedById = studentId;
                section.UpdatedAt = PhilippineTime.Now;
                if (yjsBytes != null) section.YjsState = yjsBytes;
            }

            await _db.SaveChangesAsync();
            await SendUpdateNotificationsAsync(group, sectionKey, studentId);

            await _db.Entry(section).Reference(s => s.UpdatedBy).LoadAsync();
            return _mapper.Map<ManuscriptSectionResponseDto>(section);
        }

        // Finalization voting

        public async Task<ManuscriptVoteStatusDto> GetVoteStatusAsync(string studentId)
        {
            var membership = await _db.GroupMembers
                .Include(gm => gm.CapstoneGroup)
                .FirstOrDefaultAsync(gm => gm.UserId == studentId &&
                    gm.CapstoneGroup.Status == GroupStatus.Active)
                ?? throw new KeyNotFoundException("No active group.");

            var group = membership.CapstoneGroup;
            return await BuildVoteStatusAsync(group, studentId);
        }

        public async Task<ManuscriptVoteStatusDto> CastVoteAsync(string studentId)
        {
            var membership = await _db.GroupMembers
                .Include(gm => gm.CapstoneGroup)
                .FirstOrDefaultAsync(gm => gm.UserId == studentId &&
                    gm.CapstoneGroup.Status == GroupStatus.Active)
                ?? throw new KeyNotFoundException("No active group.");

            var group = membership.CapstoneGroup;

            if (group.ManuscriptLocked)
                throw new InvalidOperationException("Already locked for this revision.");

            // Validate references count
            var refSection = await _db.ManuscriptSections
                .FirstOrDefaultAsync(s => s.CapstoneGroupId == group.Id && s.SectionKey == "references");
            var refCount = CountReferences(refSection?.Content ?? string.Empty);
            if (refCount < 30)
                throw new InvalidOperationException($"The References section must contain at least 30 entries. Currently has {refCount}.");

            var already = await _db.ManuscriptFinalizationVotes
                .AnyAsync(v => v.CapstoneGroupId == group.Id && v.UserId == studentId && v.Revision == group.ManuscriptRevision);

            if (!already)
            {
                _db.ManuscriptFinalizationVotes.Add(new ManuscriptFinalizationVote
                {
                    CapstoneGroupId = group.Id,
                    UserId = studentId,
                    Revision = group.ManuscriptRevision
                });
                await _db.SaveChangesAsync();
            }

            // Check if all members have voted
            var totalMembers = await _db.GroupMembers.CountAsync(gm => gm.CapstoneGroupId == group.Id);
            var voteCount = await _db.ManuscriptFinalizationVotes
                .CountAsync(v => v.CapstoneGroupId == group.Id && v.Revision == group.ManuscriptRevision);

            if (voteCount >= totalMembers && totalMembers > 0)
            {
                group.ManuscriptLocked = true;
                await _db.SaveChangesAsync();
                await NotifyLockAsync(group);
            }

            return await BuildVoteStatusAsync(group, studentId);
        }

        public async Task<ManuscriptVoteStatusDto> RevokeVoteAsync(string studentId)
        {
            var membership = await _db.GroupMembers
                .Include(gm => gm.CapstoneGroup)
                .FirstOrDefaultAsync(gm => gm.UserId == studentId &&
                    gm.CapstoneGroup.Status == GroupStatus.Active)
                ?? throw new KeyNotFoundException("No active group.");

            var group = membership.CapstoneGroup;

            if (group.ManuscriptLocked)
                throw new InvalidOperationException("Cannot revoke a vote after locking.");

            var vote = await _db.ManuscriptFinalizationVotes
                .FirstOrDefaultAsync(v => v.CapstoneGroupId == group.Id && v.UserId == studentId && v.Revision == group.ManuscriptRevision);

            if (vote != null)
            {
                _db.ManuscriptFinalizationVotes.Remove(vote);
                await _db.SaveChangesAsync();
            }

            return await BuildVoteStatusAsync(group, studentId);
        }

        private async Task<ManuscriptVoteStatusDto> BuildVoteStatusAsync(CapstoneGroup group, string currentUserId)
        {
            var totalMembers = await _db.GroupMembers.CountAsync(gm => gm.CapstoneGroupId == group.Id);

            var votes = await _db.ManuscriptFinalizationVotes
                .Include(v => v.User)
                .Where(v => v.CapstoneGroupId == group.Id && v.Revision == group.ManuscriptRevision)
                .ToListAsync();

            return new ManuscriptVoteStatusDto
            {
                IsLocked = group.ManuscriptLocked,
                Revision = group.ManuscriptRevision,
                TotalMembers = totalMembers,
                VoteCount = votes.Count,
                CurrentUserVoted = votes.Any(v => v.UserId == currentUserId),
                Voters = votes.Select(v => new VoterSummaryDto
                {
                    FullName = $"{v.User.FirstName} {v.User.LastName}".Trim(),
                    VotedAt = v.VotedAt
                }).ToList()
            };
        }

        // Section comments

        public async Task<IEnumerable<ManuscriptCommentDto>?> GetCommentsByStudentAsync(string studentId, string? sectionKey, int? revision)
        {
            var membership = await _db.GroupMembers
                .FirstOrDefaultAsync(gm => gm.UserId == studentId &&
                    gm.CapstoneGroup.Status == GroupStatus.Active);
            if (membership is null) return null;
            return await GetCommentsAsync(membership.CapstoneGroupId, sectionKey, revision);
        }

        public async Task<ManuscriptCommentDto> AddCommentAsync(string userId, int groupId, string sectionKey, AddManuscriptCommentRequestDto dto)
        {
            if (!ValidKeys.Contains(sectionKey))
                throw new ArgumentException($"Invalid section key: {sectionKey}");

            var group = await _db.CapstoneGroups.FindAsync(groupId)
                ?? throw new KeyNotFoundException("Group not found.");

            var comment = new ManuscriptSectionComment
            {
                CapstoneGroupId = groupId,
                SectionKey      = sectionKey,
                Revision        = group.ManuscriptRevision,
                AuthorId        = userId,
                Content         = dto.Content,
                CreatedAt       = PhilippineTime.Now
            };
            _db.ManuscriptSectionComments.Add(comment);
            await _db.SaveChangesAsync();

            await _db.Entry(comment).Reference(c => c.Author).LoadAsync();

            // Attach role and return
            var result = await AttachRolesToCommentsAsync([comment]);
            return result[0];
        }

        public async Task<IEnumerable<ManuscriptCommentDto>> GetCommentsAsync(int groupId, string? sectionKey, int? revision)
        {
            var query = _db.ManuscriptSectionComments
                .Include(c => c.Author)
                .Where(c => c.CapstoneGroupId == groupId);

            if (sectionKey != null) query = query.Where(c => c.SectionKey == sectionKey);
            if (revision.HasValue) query = query.Where(c => c.Revision == revision.Value);

            var comments = await query.OrderBy(c => c.CreatedAt).ToListAsync();
            return await AttachRolesToCommentsAsync(comments);
        }

        // Revision summary

        private static readonly string[] AllSectionKeys =
            ["chapter1", "chapter2", "chapter3", "chapter4", "chapter5", "references"];

        public async Task<RevisionSummaryDto> GetRevisionSummaryAsync(int groupId, string userId, string role)
        {
            if (!await IsAuthorizedForGroupAsync(userId, role, groupId))
                throw new UnauthorizedAccessException();

            var group = await _db.CapstoneGroups.FindAsync(groupId)
                ?? throw new KeyNotFoundException("Group not found.");

            return await BuildRevisionSummaryAsync(group);
        }

        public async Task<RevisionSummaryDto?> GetMyRevisionSummaryAsync(string studentId)
        {
            var membership = await _db.GroupMembers
                .Include(gm => gm.CapstoneGroup)
                .FirstOrDefaultAsync(gm => gm.UserId == studentId &&
                    gm.CapstoneGroup.Status == GroupStatus.Active);

            return membership is null ? null : await BuildRevisionSummaryAsync(membership.CapstoneGroup);
        }

        private async Task<RevisionSummaryDto> BuildRevisionSummaryAsync(CapstoneGroup group)
        {
            var allComments = await _db.ManuscriptSectionComments
                .Where(c => c.CapstoneGroupId == group.Id)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();

            // Current-revision section statuses
            var currentComments = allComments.Where(c => c.Revision == group.ManuscriptRevision).ToList();
            var sectionStatuses = AllSectionKeys.Select(key =>
            {
                var sc = currentComments.Where(c => c.SectionKey == key).ToList();
                return new SectionReviewStatusDto
                {
                    SectionKey     = key,
                    CommentCount   = sc.Count,
                    IsReviewed     = sc.Count > 0,
                    LastCommentAt  = sc.Count > 0 ? sc.Last().CreatedAt : null,
                };
            }).ToList();

            // Past revisions (from snapshots; union with revisions that have comments)
            var snapshots = await _db.ManuscriptSnapshots
                .Where(s => s.CapstoneGroupId == group.Id)
                .OrderByDescending(s => s.Revision)
                .ToListAsync();

            var pastRevNums = snapshots.Select(s => s.Revision)
                .Union(allComments.Select(c => c.Revision))
                .Where(r => r != group.ManuscriptRevision)
                .Distinct()
                .OrderByDescending(r => r)
                .ToList();

            var history = pastRevNums.Select(rev =>
            {
                var rc = allComments.Where(c => c.Revision == rev).ToList();
                var reviewed = AllSectionKeys.Count(key => rc.Any(c => c.SectionKey == key));
                var snap = snapshots.FirstOrDefault(s => s.Revision == rev);
                return new RevisionHistoryItemDto
                {
                    Revision        = rev,
                    TotalComments   = rc.Count,
                    ReviewedSections = reviewed,
                    IsComplete      = reviewed == AllSectionKeys.Length,
                    SnapshotAt      = snap?.SnapshotAt,
                };
            }).ToList();

            return new RevisionSummaryDto
            {
                CurrentRevision           = group.ManuscriptRevision,
                IsLocked                  = group.ManuscriptLocked,
                Sections                  = sectionStatuses,
                IsCurrentRevisionReviewed = sectionStatuses.All(s => s.IsReviewed),
                History                   = history,
            };
        }

        // Open next revision (Adviser or FIC)

        public async Task OpenRevisionAsync(string userId, int groupId)
        {
            var group = await _db.CapstoneGroups.FindAsync(groupId)
                ?? throw new KeyNotFoundException("Group not found.");

            if (!group.ManuscriptLocked)
                throw new InvalidOperationException("Manuscript is not locked yet.");

            // Snapshot current sections
            var sections = await _db.ManuscriptSections
                .Where(s => s.CapstoneGroupId == groupId)
                .ToListAsync();

            var snapshotData = sections.ToDictionary(s => s.SectionKey, s => s.Content);
            _db.ManuscriptSnapshots.Add(new ManuscriptSnapshot
            {
                CapstoneGroupId = groupId,
                Revision = group.ManuscriptRevision,
                SnapshotJson = JsonSerializer.Serialize(snapshotData),
                SnapshotAt = PhilippineTime.Now
            });

            group.ManuscriptRevision++;
            group.ManuscriptLocked = false;

            // Clear votes for the new revision (old ones remain by revision number)
            await _db.SaveChangesAsync();

            // Notify group members
            var memberIds = await _db.GroupMembers
                .Where(gm => gm.CapstoneGroupId == groupId)
                .Select(gm => gm.UserId)
                .ToListAsync();

            var opener = await _db.Users.FindAsync(userId);
            var openerName = opener is null ? "Your reviewer" : $"{opener.FirstName} {opener.LastName}".Trim();
            var msg = $"{openerName} opened Revision {group.ManuscriptRevision} for \"{group.GroupName}\". You may now edit the manuscript.";

            var notifications = memberIds.Select(mid => new Notification
            {
                UserId = mid,
                Message = msg,
                Type = NotificationType.ManuscriptUpdated,
                RelatedGroupId = groupId
            });
            _db.Notifications.AddRange(notifications);
            await _db.SaveChangesAsync();
        }

        // Image upload

        private static readonly Dictionary<string, byte[][]> _imageMagicBytes = new()
        {
            [".jpg"]  = [[0xFF, 0xD8, 0xFF]],
            [".jpeg"] = [[0xFF, 0xD8, 0xFF]],
            [".png"]  = [[0x89, 0x50, 0x4E, 0x47]],
            [".gif"]  = [[0x47, 0x49, 0x46, 0x38]],
            [".webp"] = [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP)
        };

        public async Task<ImageUploadResponseDto> UploadImageAsync(string studentId, IFormFile file)
        {
            const long MaxBytes = 10 * 1024 * 1024; // 10 MB

            if (file.Length == 0 || file.Length > MaxBytes)
                throw new ArgumentException("Image must be between 1 byte and 10 MB.");

            // Extension must be in the safe allowlist — never derived from Content-Type
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!_imageMagicBytes.ContainsKey(ext))
                throw new ArgumentException("Unsupported image type. Allowed: jpg, jpeg, png, gif, webp.");

            // Validate actual file bytes via magic-number check
            var header = new byte[8];
            using (var peek = file.OpenReadStream())
            {
                await peek.ReadExactlyAsync(header, 0, Math.Min(header.Length, (int)file.Length));
            }

            var expectedSignatures = _imageMagicBytes[ext];
            var isValidBytes = expectedSignatures.Any(sig =>
                header.Length >= sig.Length &&
                header.Take(sig.Length).SequenceEqual(sig));

            if (!isValidBytes)
                throw new ArgumentException("File content does not match the declared image type.");

            var membership = await _db.GroupMembers
                .Include(gm => gm.CapstoneGroup)
                .FirstOrDefaultAsync(gm => gm.UserId == studentId &&
                    gm.CapstoneGroup.Status == GroupStatus.Active)
                ?? throw new KeyNotFoundException("No active group.");

            var groupId = membership.CapstoneGroupId;
            var folder = Path.Combine(_env.WebRootPath, "uploads", "manuscripts", groupId.ToString());
            Directory.CreateDirectory(folder);

            // Use only the sanitized extension — never the original filename
            var fileName = $"{Guid.NewGuid()}{ext}";
            var path = Path.Combine(folder, fileName);

            await using var dest = File.Create(path);
            await file.CopyToAsync(dest);

            return new ImageUploadResponseDto
            {
                Url = $"/uploads/manuscripts/{groupId}/{fileName}"
            };
        }

        // Helpers

        private async Task<List<ManuscriptCommentDto>> AttachRolesToCommentsAsync(List<ManuscriptSectionComment> comments)
        {
            if (comments.Count == 0) return [];

            var authorIds = comments.Select(c => c.AuthorId).Distinct().ToList();
            var roleMap = await (
                from ur in _db.UserRoles
                join r in _db.Roles on ur.RoleId equals r.Id
                where authorIds.Contains(ur.UserId)
                select new { ur.UserId, r.Name }
            ).ToDictionaryAsync(x => x.UserId, x => x.Name);

            var dtos = new List<ManuscriptCommentDto>(comments.Count);
            foreach (var c in comments)
            {
                var dto = _mapper.Map<ManuscriptCommentDto>(c);
                dto.AuthorRole = roleMap.GetValueOrDefault(c.AuthorId, string.Empty);
                dtos.Add(dto);
            }
            return dtos;
        }

        private async Task SendUpdateNotificationsAsync(CapstoneGroup group, string sectionKey, string updatedByUserId)
        {
            var updater = await _db.Users.FindAsync(updatedByUserId);
            var updaterName = updater is null ? "A student" : $"{updater.FirstName} {updater.LastName}".Trim();
            var message = $"{updaterName} updated {SectionLabel(sectionKey)} of the manuscript for \"{group.GroupName}\".";

            var recipientIds = await BuildRecipientSetAsync(group, includeMembers: false);
            recipientIds.Remove(updatedByUserId);

            _db.Notifications.AddRange(recipientIds.Select(uid => new Notification
            {
                UserId = uid,
                Message = message,
                Type = NotificationType.ManuscriptUpdated,
                RelatedGroupId = group.Id
            }));
            await _db.SaveChangesAsync();
        }

        private async Task NotifyLockAsync(CapstoneGroup group)
        {
            var msg = $"The manuscript for \"{group.GroupName}\" has been finalized and locked by all members. It is now ready for review.";
            var recipientIds = await BuildRecipientSetAsync(group, includeMembers: true);

            _db.Notifications.AddRange(recipientIds.Select(uid => new Notification
            {
                UserId = uid,
                Message = msg,
                Type = NotificationType.ManuscriptUpdated,
                RelatedGroupId = group.Id
            }));
            await _db.SaveChangesAsync();
        }

        private async Task<HashSet<string>> BuildRecipientSetAsync(CapstoneGroup group, bool includeMembers)
        {
            var ids = new HashSet<string> { group.AdviserId };

            var panelIds = await _db.PanelAssignments
                .Include(pa => pa.DefenseSchedule)
                .Where(pa => pa.DefenseSchedule.CapstoneGroupId == group.Id)
                .Select(pa => pa.PanelistId)
                .Distinct()
                .ToListAsync();
            foreach (var id in panelIds) ids.Add(id);

            var memberIds = await _db.GroupMembers
                .Where(gm => gm.CapstoneGroupId == group.Id)
                .Select(gm => gm.UserId)
                .ToListAsync();

            var facultyIds = await _db.ClassroomEnrollments
                .Include(ce => ce.Classroom)
                .Where(ce => memberIds.Contains(ce.StudentId))
                .Select(ce => ce.Classroom.FacultyICId)
                .Distinct()
                .ToListAsync();
            foreach (var id in facultyIds) ids.Add(id);

            if (includeMembers)
                foreach (var id in memberIds) ids.Add(id);

            return ids;
        }

        private static int CountWords(string html)
        {
            if (string.IsNullOrWhiteSpace(html)) return 0;
            var text = Regex.Replace(html, "<[^>]+>", " ");
            text = System.Net.WebUtility.HtmlDecode(text);
            return text.Split([' ', '\n', '\r', '\t'], StringSplitOptions.RemoveEmptyEntries).Length;
        }

        private static int CountReferences(string html)
        {
            if (string.IsNullOrWhiteSpace(html)) return 0;
            // Count <li> tags (numbered or bulleted list references)
            var listMatches = Regex.Matches(html, @"<li[\s>]", RegexOptions.IgnoreCase);
            if (listMatches.Count > 0) return listMatches.Count;
            // Fallback: count <p> blocks with substantial text (>10 non-whitespace chars)
            var pMatches = Regex.Matches(html, @"<p[\s>].*?</p>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
            return pMatches.Count(m =>
            {
                var text = Regex.Replace(m.Value, "<[^>]+>", string.Empty).Trim();
                return System.Net.WebUtility.HtmlDecode(text).Length > 10;
            });
        }

        private static string SectionLabel(string key) => key switch
        {
            "chapter1" => "Chapter 1",
            "chapter2" => "Chapter 2",
            "chapter3" => "Chapter 3",
            "chapter4" => "Chapter 4",
            "chapter5" => "Chapter 5",
            "references" => "References",
            _ => key
        };
    }
}
