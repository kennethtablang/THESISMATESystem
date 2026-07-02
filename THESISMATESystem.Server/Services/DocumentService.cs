using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
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
    public class DocumentService : IDocumentService
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly INotificationService _notifications;
        private readonly IGroupAccessChecker _groupAccess;

        public DocumentService(AppDbContext db, IWebHostEnvironment env, UserManager<ApplicationUser> userManager, INotificationService notifications, IGroupAccessChecker groupAccess)
        {
            _db = db;
            _env = env;
            _userManager = userManager;
            _notifications = notifications;
            _groupAccess = groupAccess;
        }

        public async Task<DocumentSubmissionResponseDto> UploadDocumentAsync(string uploadedById, UploadDocumentRequestDto dto)
        {
            // Uploader must be a member of the target group — prevents IDOR write
            var isMember = await _db.GroupMembers
                .AnyAsync(gm => gm.CapstoneGroupId == dto.CapstoneGroupId && gm.UserId == uploadedById);
            if (!isMember)
                throw new UnauthorizedAccessException("You are not a member of this group.");

            var uploadDir = Path.Combine(_env.WebRootPath, "uploads", "documents", dto.CapstoneGroupId.ToString());
            Directory.CreateDirectory(uploadDir);

            var ext = Path.GetExtension(dto.File.FileName);
            var storedName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadDir, storedName);

            using (var stream = File.Create(filePath))
                await dto.File.CopyToAsync(stream);

            var submission = new DocumentSubmission
            {
                CapstoneGroupId = dto.CapstoneGroupId,
                SubmittedById = uploadedById,
                Title = dto.Title,
                Description = dto.Description,
                FileName = dto.File.FileName,
                FilePath = filePath,
                FileSize = dto.File.Length,
                MimeType = dto.File.ContentType,
                Section = dto.Section,
            };

            _db.DocumentSubmissions.Add(submission);
            await _db.SaveChangesAsync();

            return await BuildDocumentResponseAsync(submission);
        }

        public async Task<DocumentSubmissionResponseDto> UploadNewVersionAsync(int originalId, string uploadedById, IFormFile file)
        {
            var original = await _db.DocumentSubmissions.FindAsync(originalId)
                ?? throw new KeyNotFoundException("Document not found.");

            // Resolve chain root
            var rootId = original.OriginalDocumentId ?? original.Id;
            var root = rootId == original.Id
                ? original
                : await _db.DocumentSubmissions.FindAsync(rootId)
                    ?? throw new KeyNotFoundException("Original document not found.");

            // Verify the uploader is a member of the document's group — prevents IDOR write
            var isMember = await _db.GroupMembers
                .AnyAsync(gm => gm.CapstoneGroupId == root.CapstoneGroupId && gm.UserId == uploadedById);
            if (!isMember)
                throw new UnauthorizedAccessException("You are not a member of this group.");

            var maxVersion = await _db.DocumentSubmissions
                .Where(d => d.Id == rootId || d.OriginalDocumentId == rootId)
                .MaxAsync(d => (int?)d.Version) ?? 1;

            var uploadDir = Path.Combine(_env.WebRootPath, "uploads", "documents", root.CapstoneGroupId.ToString());
            Directory.CreateDirectory(uploadDir);

            var ext = Path.GetExtension(file.FileName);
            var storedName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadDir, storedName);

            using (var stream = File.Create(filePath))
                await file.CopyToAsync(stream);

            var newVersion = new DocumentSubmission
            {
                CapstoneGroupId = root.CapstoneGroupId,
                SubmittedById = uploadedById,
                Title = root.Title,
                Description = root.Description,
                FileName = file.FileName,
                FilePath = filePath,
                FileSize = file.Length,
                MimeType = file.ContentType,
                OriginalDocumentId = rootId,
                Version = maxVersion + 1,
            };

            _db.DocumentSubmissions.Add(newVersion);
            await _db.SaveChangesAsync();

            return await BuildDocumentResponseAsync(newVersion);
        }

        public async Task<IEnumerable<DocumentVersionDto>> GetVersionsAsync(int id, string callerId, string callerRole)
        {
            var doc = await _db.DocumentSubmissions.FindAsync(id)
                ?? throw new KeyNotFoundException("Document not found.");

            var rootId = doc.OriginalDocumentId ?? doc.Id;

            if (!await _groupAccess.CanAccessGroupAsync(callerId, callerRole, doc.CapstoneGroupId))
                throw new UnauthorizedAccessException();

            var versions = await _db.DocumentSubmissions
                .Include(d => d.SubmittedBy)
                .Where(d => d.Id == rootId || d.OriginalDocumentId == rootId)
                .OrderBy(d => d.Version)
                .ToListAsync();

            return versions.Select(d => new DocumentVersionDto
            {
                Id = d.Id,
                Version = d.Version,
                FileName = d.FileName,
                FileSize = d.FileSize,
                SubmittedAt = d.SubmittedAt,
                SubmittedBy = new UserSummaryDto
                {
                    Id = d.SubmittedBy.Id,
                    FullName = $"{d.SubmittedBy.FirstName} {d.SubmittedBy.LastName}"
                }
            });
        }

        public async Task<IEnumerable<DocumentSubmissionResponseDto>> GetDocumentsByGroupAsync(int groupId, string callerId, string callerRole)
        {
            if (!await _groupAccess.CanAccessGroupAsync(callerId, callerRole, groupId))
                throw new UnauthorizedAccessException();

            var all = await _db.DocumentSubmissions
                .Include(d => d.SubmittedBy)
                .Include(d => d.CapstoneGroup)
                .Include(d => d.Comments)
                .Where(d => d.CapstoneGroupId == groupId)
                .OrderByDescending(d => d.Version)
                .ToListAsync();

            return BuildLatestPerChain(all);
        }

        public async Task<IEnumerable<DocumentSubmissionResponseDto>> GetAllDocumentsAsync()
        {
            var all = await _db.DocumentSubmissions
                .Include(d => d.SubmittedBy)
                .Include(d => d.CapstoneGroup)
                .Include(d => d.Comments)
                .OrderByDescending(d => d.Version)
                .ToListAsync();

            return BuildLatestPerChain(all);
        }

        public async Task<IEnumerable<DocumentSubmissionResponseDto>> GetDocumentsByAdviserAsync(string adviserId)
        {
            var groupIds = await _db.CapstoneGroups
                .Where(g => g.AdviserId == adviserId)
                .Select(g => g.Id)
                .ToListAsync();

            var all = await _db.DocumentSubmissions
                .Include(d => d.SubmittedBy)
                .Include(d => d.CapstoneGroup)
                .Include(d => d.Comments)
                .Where(d => groupIds.Contains(d.CapstoneGroupId))
                .OrderByDescending(d => d.Version)
                .ToListAsync();

            return BuildLatestPerChain(all);
        }

        private static IEnumerable<DocumentSubmissionResponseDto> BuildLatestPerChain(List<DocumentSubmission> all)
        {
            // Count versions per chain (keyed by root id)
            var versionCounts = all
                .GroupBy(d => d.OriginalDocumentId ?? d.Id)
                .ToDictionary(g => g.Key, g => g.Count());

            // Return only latest per chain, ordered by most recently submitted
            return all
                .GroupBy(d => d.OriginalDocumentId ?? d.Id)
                .Select(g => g.OrderByDescending(d => d.Version).First())
                .OrderByDescending(d => d.SubmittedAt)
                .Select(d => MapToDtoWithMeta(d, versionCounts.GetValueOrDefault(d.OriginalDocumentId ?? d.Id, 1)));
        }

        public async Task<DocumentSubmissionResponseDto?> GetDocumentByIdAsync(int id, string callerId, string callerRole)
        {
            var doc = await _db.DocumentSubmissions
                .Include(d => d.SubmittedBy)
                .Include(d => d.CapstoneGroup)
                .Include(d => d.Comments)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doc is null) return null;

            if (!await _groupAccess.CanAccessGroupAsync(callerId, callerRole, doc.CapstoneGroupId))
                throw new UnauthorizedAccessException();

            // Compute total versions for this chain
            var rootId = doc.OriginalDocumentId ?? doc.Id;
            var totalVersions = await _db.DocumentSubmissions
                .CountAsync(d => d.Id == rootId || d.OriginalDocumentId == rootId);

            return MapToDtoWithMeta(doc, totalVersions);
        }

        public async Task<(string Path, string FileName)> GetDownloadInfoAsync(int id, string callerId, string callerRole)
        {
            var doc = await _db.DocumentSubmissions.FindAsync(id)
                ?? throw new KeyNotFoundException("Document not found.");

            if (!await _groupAccess.CanAccessGroupAsync(callerId, callerRole, doc.CapstoneGroupId))
                throw new UnauthorizedAccessException();

            return (doc.FilePath, doc.FileName);
        }

        public async Task<DocumentCommentResponseDto> AddCommentAsync(int documentId, string authorId, string authorRole, AddDocumentCommentRequestDto dto)
        {
            var doc = await _db.DocumentSubmissions.FindAsync(documentId)
                ?? throw new KeyNotFoundException("Document not found.");

            if (!await _groupAccess.CanAccessGroupAsync(authorId, authorRole, doc.CapstoneGroupId))
                throw new UnauthorizedAccessException();

            var comment = new DocumentComment
            {
                DocumentSubmissionId = documentId,
                AuthorId = authorId,
                Content = dto.Content
            };

            _db.DocumentComments.Add(comment);
            await _db.SaveChangesAsync();

            return await BuildCommentResponseAsync(comment);
        }

        public async Task<IEnumerable<DocumentCommentResponseDto>> GetCommentsAsync(int documentId, string callerId, string callerRole)
        {
            var doc = await _db.DocumentSubmissions.FindAsync(documentId)
                ?? throw new KeyNotFoundException("Document not found.");

            if (!await _groupAccess.CanAccessGroupAsync(callerId, callerRole, doc.CapstoneGroupId))
                throw new UnauthorizedAccessException();

            var comments = await _db.DocumentComments
                .Include(c => c.Author)
                .Where(c => c.DocumentSubmissionId == documentId)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();

            var result = new List<DocumentCommentResponseDto>();
            foreach (var c in comments)
            {
                var roles = await _userManager.GetRolesAsync(c.Author);
                result.Add(new DocumentCommentResponseDto
                {
                    Id = c.Id,
                    DocumentSubmissionId = c.DocumentSubmissionId,
                    Author = new UserSummaryDto { Id = c.Author.Id, FullName = $"{c.Author.FirstName} {c.Author.LastName}" },
                    AuthorRole = roles.FirstOrDefault() ?? string.Empty,
                    Content = c.Content,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                });
            }
            return result;
        }

        public async Task<bool> DeleteDocumentAsync(int id, string userId, string callerRole)
        {
            var doc = await _db.DocumentSubmissions.FindAsync(id);
            if (doc is null) return false;
            bool isPrivileged = callerRole is "Admin" or "SuperAdmin";
            if (!isPrivileged && doc.SubmittedById != userId) return false;

            // Deleting a chain root would violate the OriginalDocumentId FK of its
            // newer versions, so remove the entire version chain together.
            var toDelete = doc.OriginalDocumentId is null
                ? await _db.DocumentSubmissions
                    .Where(d => d.Id == doc.Id || d.OriginalDocumentId == doc.Id)
                    .ToListAsync()
                : new List<DocumentSubmission> { doc };

            foreach (var d in toDelete)
                if (File.Exists(d.FilePath)) File.Delete(d.FilePath);

            _db.DocumentSubmissions.RemoveRange(toDelete);
            await _db.SaveChangesAsync();
            return true;
        }

        // ── Helpers ───────────────────────────────────────────────────────────────

        private async Task<DocumentSubmissionResponseDto> BuildDocumentResponseAsync(DocumentSubmission submission)
        {
            await _db.Entry(submission).Reference(d => d.SubmittedBy).LoadAsync();
            await _db.Entry(submission).Reference(d => d.CapstoneGroup).LoadAsync();
            await _db.Entry(submission).Collection(d => d.Comments).LoadAsync();

            var rootId = submission.OriginalDocumentId ?? submission.Id;
            var totalVersions = await _db.DocumentSubmissions
                .CountAsync(d => d.Id == rootId || d.OriginalDocumentId == rootId);

            return MapToDtoWithMeta(submission, totalVersions);
        }

        private async Task<DocumentCommentResponseDto> BuildCommentResponseAsync(DocumentComment comment)
        {
            await _db.Entry(comment).Reference(c => c.Author).LoadAsync();
            var roles = await _userManager.GetRolesAsync(comment.Author);
            return new DocumentCommentResponseDto
            {
                Id = comment.Id,
                DocumentSubmissionId = comment.DocumentSubmissionId,
                Author = new UserSummaryDto { Id = comment.Author.Id, FullName = $"{comment.Author.FirstName} {comment.Author.LastName}" },
                AuthorRole = roles.FirstOrDefault() ?? string.Empty,
                Content = comment.Content,
                CreatedAt = comment.CreatedAt,
                UpdatedAt = comment.UpdatedAt
            };
        }

        public async Task<DocumentSubmissionResponseDto> FinalizeChapterToDocumentAsync(int groupId, int chapterNumber, string userId)
        {
            var isMember = await _db.GroupMembers
                .AnyAsync(gm => gm.CapstoneGroupId == groupId && gm.UserId == userId);
            if (!isMember)
                throw new UnauthorizedAccessException("You are not a member of this group.");

            var chapter = await _db.ChapterSubmissions
                .Where(c => c.CapstoneGroupId == groupId && c.ChapterNumber == chapterNumber)
                .OrderByDescending(c => c.Version)
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException($"No submission found for Chapter {chapterNumber}.");

            var section = chapterNumber switch
            {
                1 => DocumentSection.Chapter1,
                2 => DocumentSection.Chapter2,
                3 => DocumentSection.Chapter3,
                4 => DocumentSection.Chapter4,
                5 => DocumentSection.Chapter5,
                _ => throw new ArgumentOutOfRangeException(nameof(chapterNumber))
            };

            // Copy the chapter file to the documents uploads directory
            var uploadDir = Path.Combine(_env.WebRootPath, "uploads", "documents", groupId.ToString());
            Directory.CreateDirectory(uploadDir);

            var ext = Path.GetExtension(chapter.FileName);
            var storedName = $"{Guid.NewGuid()}{ext}";
            var destPath = Path.Combine(uploadDir, storedName);

            if (!File.Exists(chapter.FilePath))
                throw new FileNotFoundException("Chapter file not found on disk. Please re-submit the chapter file.");

            File.Copy(chapter.FilePath, destPath, overwrite: true);

            // Find existing root document for this section (if any) to create a new version
            var existingRoot = await _db.DocumentSubmissions
                .Where(d => d.CapstoneGroupId == groupId && d.Section == section && d.OriginalDocumentId == null)
                .FirstOrDefaultAsync();

            DocumentSubmission submission;
            if (existingRoot is not null)
            {
                var maxVersion = await _db.DocumentSubmissions
                    .Where(d => d.Id == existingRoot.Id || d.OriginalDocumentId == existingRoot.Id)
                    .MaxAsync(d => (int?)d.Version) ?? 1;

                submission = new DocumentSubmission
                {
                    CapstoneGroupId = groupId,
                    SubmittedById = userId,
                    Title = existingRoot.Title,
                    Description = existingRoot.Description,
                    FileName = chapter.FileName,
                    FilePath = destPath,
                    FileSize = new FileInfo(destPath).Length,
                    MimeType = "application/octet-stream",
                    OriginalDocumentId = existingRoot.Id,
                    Version = maxVersion + 1,
                    Section = section,
                    IsAutoFinalized = true,
                };
            }
            else
            {
                var sectionLabel = section.ToString() switch
                {
                    "Chapter1" => "Chapter 1",
                    "Chapter2" => "Chapter 2",
                    "Chapter3" => "Chapter 3",
                    "Chapter4" => "Chapter 4",
                    "Chapter5" => "Chapter 5",
                    _ => section.ToString()
                };

                submission = new DocumentSubmission
                {
                    CapstoneGroupId = groupId,
                    SubmittedById = userId,
                    Title = sectionLabel,
                    FileName = chapter.FileName,
                    FilePath = destPath,
                    FileSize = new FileInfo(destPath).Length,
                    MimeType = "application/octet-stream",
                    Section = section,
                    IsAutoFinalized = true,
                };
            }

            _db.DocumentSubmissions.Add(submission);
            await _db.SaveChangesAsync();

            return await BuildDocumentResponseAsync(submission);
        }

        public async Task<DocumentSubmissionResponseDto> FinalizeSectionToDocumentAsync(int groupId, string sectionKey, string userId, IFormFile file)
        {
            var isMember = await _db.GroupMembers
                .AnyAsync(gm => gm.CapstoneGroupId == groupId && gm.UserId == userId);
            if (!isMember)
                throw new UnauthorizedAccessException("You are not a member of this group.");

            var docSection = sectionKey switch
            {
                "chapter1"   => DocumentSection.Chapter1,
                "chapter2"   => DocumentSection.Chapter2,
                "chapter3"   => DocumentSection.Chapter3,
                "chapter4"   => DocumentSection.Chapter4,
                "chapter5"   => DocumentSection.Chapter5,
                "references" => DocumentSection.References,
                _ => throw new ArgumentOutOfRangeException(nameof(sectionKey), $"Section '{sectionKey}' has no document slot.")
            };

            var sectionLabel = sectionKey switch
            {
                "chapter1"   => "Chapter 1",
                "chapter2"   => "Chapter 2",
                "chapter3"   => "Chapter 3",
                "chapter4"   => "Chapter 4",
                "chapter5"   => "Chapter 5",
                "references" => "References",
                _            => sectionKey
            };

            var uploadDir = Path.Combine(_env.WebRootPath, "uploads", "documents", groupId.ToString());
            Directory.CreateDirectory(uploadDir);

            var storedName = $"{Guid.NewGuid()}.docx";
            var destPath = Path.Combine(uploadDir, storedName);
            var fileName = $"{sectionLabel}.docx";

            using (var stream = new FileStream(destPath, FileMode.Create, FileAccess.Write))
                await file.CopyToAsync(stream);

            var fileInfo = new FileInfo(destPath);

            var existingRoot = await _db.DocumentSubmissions
                .Where(d => d.CapstoneGroupId == groupId && d.Section == docSection && d.OriginalDocumentId == null)
                .FirstOrDefaultAsync();

            DocumentSubmission submission;
            if (existingRoot is not null)
            {
                var maxVersion = await _db.DocumentSubmissions
                    .Where(d => d.Id == existingRoot.Id || d.OriginalDocumentId == existingRoot.Id)
                    .MaxAsync(d => (int?)d.Version) ?? 1;

                submission = new DocumentSubmission
                {
                    CapstoneGroupId = groupId,
                    SubmittedById   = userId,
                    Title           = existingRoot.Title,
                    Description     = existingRoot.Description,
                    FileName        = fileName,
                    FilePath        = destPath,
                    FileSize        = fileInfo.Length,
                    MimeType        = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    OriginalDocumentId = existingRoot.Id,
                    Version         = maxVersion + 1,
                    Section         = docSection,
                    IsAutoFinalized = true,
                };
            }
            else
            {
                submission = new DocumentSubmission
                {
                    CapstoneGroupId = groupId,
                    SubmittedById   = userId,
                    Title           = sectionLabel,
                    FileName        = fileName,
                    FilePath        = destPath,
                    FileSize        = fileInfo.Length,
                    MimeType        = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    Section         = docSection,
                    IsAutoFinalized = true,
                };
            }

            _db.DocumentSubmissions.Add(submission);
            await _db.SaveChangesAsync();

            return await BuildDocumentResponseAsync(submission);
        }

        public async Task<DocumentSubmissionResponseDto> SubmitForReviewAsync(int documentId, string userId)
        {
            var doc = await _db.DocumentSubmissions
                .Include(d => d.SubmittedBy)
                .Include(d => d.CapstoneGroup)
                .Include(d => d.Comments)
                .FirstOrDefaultAsync(d => d.Id == documentId)
                ?? throw new KeyNotFoundException("Document not found.");

            var isMember = await _db.GroupMembers
                .AnyAsync(gm => gm.CapstoneGroupId == doc.CapstoneGroupId && gm.UserId == userId);
            if (!isMember)
                throw new UnauthorizedAccessException("You are not a member of this group.");

            doc.SubmissionStatus = DocumentSubmissionStatus.SubmittedForReview;
            await _db.SaveChangesAsync();

            // Notify the group's adviser
            var group = await _db.CapstoneGroups.FindAsync(doc.CapstoneGroupId);
            if (group is not null && !string.IsNullOrEmpty(group.AdviserId))
            {
                await _notifications.SendAsync(
                    group.AdviserId,
                    $"{doc.CapstoneGroup?.GroupName ?? "A group"} submitted \"{doc.Title}\" (v{doc.Version}) for your review.",
                    NotificationType.DocumentSubmitted,
                    groupId: doc.CapstoneGroupId);
            }

            var rootId = doc.OriginalDocumentId ?? doc.Id;
            var totalVersions = await _db.DocumentSubmissions
                .CountAsync(d => d.Id == rootId || d.OriginalDocumentId == rootId);

            return MapToDtoWithMeta(doc, totalVersions);
        }

        public async Task<DocumentSubmissionResponseDto> UpdateDocumentStatusAsync(int documentId, string callerId, string callerRole, DocumentSubmissionStatus newStatus)
        {
            var doc = await _db.DocumentSubmissions
                .Include(d => d.SubmittedBy)
                .Include(d => d.CapstoneGroup)
                .Include(d => d.Comments)
                .FirstOrDefaultAsync(d => d.Id == documentId)
                ?? throw new KeyNotFoundException("Document not found.");

            // Admins can update any document. Faculty must be the group's adviser.
            if (callerRole == "Faculty")
            {
                var advises = await _db.CapstoneGroups
                    .AnyAsync(g => g.Id == doc.CapstoneGroupId && g.AdviserId == callerId);
                if (!advises)
                    throw new UnauthorizedAccessException("You are not the adviser of this group.");
            }
            else if (callerRole is not ("Admin" or "SuperAdmin"))
            {
                throw new UnauthorizedAccessException("Insufficient permissions.");
            }

            doc.SubmissionStatus = newStatus;
            await _db.SaveChangesAsync();

            // Notify group members
            var statusLabel = newStatus switch
            {
                DocumentSubmissionStatus.Approved      => "approved",
                DocumentSubmissionStatus.NeedsRevision => "marked for revision",
                _                                      => newStatus.ToString().ToLower(),
            };
            await _notifications.SendToGroupMembersAsync(
                doc.CapstoneGroupId,
                $"Your document \"{doc.Title}\" has been {statusLabel} by your adviser.",
                NotificationType.DocumentStatusUpdated);

            var rootId = doc.OriginalDocumentId ?? doc.Id;
            var totalVersions = await _db.DocumentSubmissions
                .CountAsync(d => d.Id == rootId || d.OriginalDocumentId == rootId);

            return MapToDtoWithMeta(doc, totalVersions);
        }

        private static DocumentSubmissionResponseDto MapToDtoWithMeta(DocumentSubmission d, int totalVersions) => new()
        {
            Id = d.Id,
            CapstoneGroupId = d.CapstoneGroupId,
            GroupName = d.CapstoneGroup?.GroupName ?? string.Empty,
            SubmittedBy = new UserSummaryDto { Id = d.SubmittedBy.Id, FullName = $"{d.SubmittedBy.FirstName} {d.SubmittedBy.LastName}" },
            Title = d.Title,
            Description = d.Description,
            FileName = d.FileName,
            FileSize = d.FileSize,
            MimeType = d.MimeType,
            Version = d.Version,
            SubmittedAt = d.SubmittedAt,
            CommentCount = d.Comments.Count,
            OriginalDocumentId = d.OriginalDocumentId,
            IsRevised = d.Version > 1,
            TotalVersions = totalVersions,
            IsChanged = d.Version > 1 && d.SubmittedAt >= PhilippineTime.Now.AddDays(-7),
            Section = d.Section,
            IsAutoFinalized = d.IsAutoFinalized,
            SubmissionStatus = d.SubmissionStatus,
        };
    }
}
