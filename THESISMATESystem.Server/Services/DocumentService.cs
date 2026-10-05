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
        private readonly IManuscriptService _manuscript;

        public DocumentService(AppDbContext db, IWebHostEnvironment env, UserManager<ApplicationUser> userManager, INotificationService notifications, IGroupAccessChecker groupAccess,
            IManuscriptService manuscript)
        {
            _manuscript = manuscript;
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

            return await AttachReviewsAsync(BuildLatestPerChain(all));
        }

        // The staff document list: every group the caller may open — for an Admin the groups of
        // their own block(s), for Faculty the groups they advise, sit on the panel of, or teach.
        // It used to be adviser-only for Faculty, so a panelist saw "No documents yet" for a
        // group whose files they could open one by one.
        public async Task<IEnumerable<DocumentSubmissionResponseDto>> GetAccessibleDocumentsAsync(string callerId, string callerRole)
        {
            var groupIds = _groupAccess.FilterAccessible(_db.CapstoneGroups, callerId, callerRole).Select(g => g.Id);

            var all = await _db.DocumentSubmissions
                .Include(d => d.SubmittedBy)
                .Include(d => d.CapstoneGroup)
                .Include(d => d.Comments)
                .Where(d => groupIds.Contains(d.CapstoneGroupId))
                .OrderByDescending(d => d.Version)
                .ToListAsync();

            return await AttachReviewsAsync(BuildLatestPerChain(all));
        }

        private static List<DocumentSubmissionResponseDto> BuildLatestPerChain(List<DocumentSubmission> all)
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
                .Select(d => MapToDtoWithMeta(d, versionCounts.GetValueOrDefault(d.OriginalDocumentId ?? d.Id, 1)))
                .ToList();
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

            return (await AttachReviewsAsync([MapToDtoWithMeta(doc, totalVersions)]))[0];
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

            var quote = string.IsNullOrWhiteSpace(dto.Quote) ? null : dto.Quote;
            var comment = new DocumentComment
            {
                DocumentSubmissionId = documentId,
                AuthorId = authorId,
                Content = dto.Content,
                Quote = quote,
                Prefix = quote is null ? null : dto.Prefix,
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
                    Quote = c.Quote,
                    Prefix = c.Prefix,
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
            bool isPrivileged = callerRole is "Admin"
                && await _groupAccess.CanAccessGroupAsync(userId, callerRole, doc.CapstoneGroupId);
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

            return (await AttachReviewsAsync([MapToDtoWithMeta(submission, totalVersions)]))[0];
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
                Quote = comment.Quote,
                Prefix = comment.Prefix,
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

            // The latest version was exported but never submitted: replace its file instead of
            // stacking another version with the same content. Exporting and then submitting used
            // to add two versions for one change (revision round 6).
            if (existingRoot is not null)
            {
                var latest = await LatestInChainAsync(existingRoot.Id);
                if (latest.SubmissionStatus == DocumentSubmissionStatus.Draft)
                {
                    if (File.Exists(latest.FilePath)) File.Delete(latest.FilePath);
                    latest.FilePath = destPath;
                    latest.FileName = fileName;
                    latest.FileSize = fileInfo.Length;
                    latest.MimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                    latest.SubmittedById = userId;
                    latest.SubmittedAt = PhilippineTime.Now;
                    await _db.SaveChangesAsync();
                    return await BuildDocumentResponseAsync(latest);
                }
            }

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

        // ── Review workflow (revision round 6) ──────────────────────────────────
        // A submission goes to the adviser and every standing panel member at once; each gives
        // their own Approve / Request Revision. Approvals carry over to later versions, so a
        // resubmission is only sent back to whoever asked for the revision.

        public async Task<DocumentSubmissionResponseDto> SubmitForReviewAsync(int documentId, string userId)
        {
            var doc = await _db.DocumentSubmissions
                .Include(d => d.CapstoneGroup)
                .FirstOrDefaultAsync(d => d.Id == documentId)
                ?? throw new KeyNotFoundException("Document not found.");

            var isMember = await _db.GroupMembers
                .AnyAsync(gm => gm.CapstoneGroupId == doc.CapstoneGroupId && gm.UserId == userId);
            if (!isMember)
                throw new UnauthorizedAccessException("You are not a member of this group.");

            var rootId = doc.OriginalDocumentId ?? doc.Id;
            var latest = await LatestInChainAsync(rootId);
            if (latest.Id != doc.Id)
                throw new InvalidOperationException("Only the latest version can be submitted.");
            if (latest.SubmissionStatus == DocumentSubmissionStatus.SubmittedForReview)
                throw new InvalidOperationException("This document is already waiting for review.");

            var reviewers = await _manuscript.GetReviewersAsync(doc.CapstoneGroupId);
            if (reviewers.Count == 0)
                throw new InvalidOperationException("Your group has no adviser or panel yet, so there is no one to submit to.");

            var rows = await _db.DocumentReviewDecisions.Where(r => r.DocumentSubmissionId == rootId).ToListAsync();
            var hadDecisions = rows.Count > 0;
            var askedNow = new List<string>();
            foreach (var reviewer in reviewers)
            {
                var row = rows.FirstOrDefault(r => r.ReviewerId == reviewer.UserId);
                if (row is null)
                {
                    row = new DocumentReviewDecision { DocumentSubmissionId = rootId, ReviewerId = reviewer.UserId };
                    _db.DocumentReviewDecisions.Add(row);
                    rows.Add(row);
                }
                else if (row.Status == DocumentReviewStatus.Approved)
                {
                    continue;   // already approved — not asked again
                }
                else if (row.Status == DocumentReviewStatus.Pending)
                {
                    row.ReviewedVersion = latest.Version;   // still waiting; now looks at the newer version
                    continue;
                }

                row.Status = DocumentReviewStatus.Pending;
                row.ReviewedVersion = latest.Version;
                row.RequestedAt = PhilippineTime.Now;
                row.DecidedAt = null;
                askedNow.Add(reviewer.UserId);
            }

            var current = reviewers.Select(r => r.UserId).ToHashSet();
            var status = AggregateStatus(rows.Where(r => current.Contains(r.ReviewerId)));
            if (status == DocumentSubmissionStatus.Approved)
                throw new InvalidOperationException("This document is already approved by your adviser and panel.");

            latest.SubmissionStatus = status;
            await _db.SaveChangesAsync();

            var groupName = doc.CapstoneGroup?.GroupName ?? "A group";
            foreach (var reviewerId in askedNow)
            {
                await _notifications.SendAsync(
                    reviewerId,
                    hadDecisions
                        ? $"{groupName} resubmitted \"{doc.Title}\" (v{latest.Version}) with the revisions you requested."
                        : $"{groupName} submitted \"{doc.Title}\" (v{latest.Version}) for your review.",
                    NotificationType.DocumentSubmitted,
                    groupId: doc.CapstoneGroupId);
            }

            return (await GetDocumentByIdAsync(latest.Id, userId, "Student"))!;
        }

        // Only the group's adviser and its standing panel decide; the Admin (subject teacher) can
        // read and comment but not approve or send a document back.
        // newStatus: Approved, NeedsRevision, or SubmittedForReview to take one's decision back.
        public async Task<DocumentSubmissionResponseDto> UpdateDocumentStatusAsync(int documentId, string callerId, string callerRole, DocumentSubmissionStatus newStatus)
        {
            if (callerRole != "Faculty")
                throw new UnauthorizedAccessException("Only the adviser and the panel can approve or request a revision.");

            var doc = await _db.DocumentSubmissions
                .Include(d => d.CapstoneGroup)
                .FirstOrDefaultAsync(d => d.Id == documentId)
                ?? throw new KeyNotFoundException("Document not found.");

            var reviewers = await _manuscript.GetReviewersAsync(doc.CapstoneGroupId);
            var me = reviewers.FirstOrDefault(r => r.UserId == callerId)
                ?? throw new UnauthorizedAccessException("You are not the adviser or a panel member of this group.");

            var rootId = doc.OriginalDocumentId ?? doc.Id;
            var latest = await LatestInChainAsync(rootId);
            var rows = await _db.DocumentReviewDecisions.Where(r => r.DocumentSubmissionId == rootId).ToListAsync();
            var row = rows.FirstOrDefault(r => r.ReviewerId == callerId);

            if (row is null && latest.SubmissionStatus == DocumentSubmissionStatus.Draft)
                throw new InvalidOperationException("The students have not submitted this document yet.");

            // Submitted before per-reviewer decisions existed, or a reviewer joined the panel
            // after the submission: everyone without a row is still owed a decision, so they get
            // a pending one — otherwise the first approval alone would read as fully approved.
            if (latest.SubmissionStatus != DocumentSubmissionStatus.Draft)
            {
                foreach (var missing in reviewers.Where(r => rows.All(x => x.ReviewerId != r.UserId)))
                {
                    var pending = new DocumentReviewDecision
                    {
                        DocumentSubmissionId = rootId,
                        ReviewerId = missing.UserId,
                        ReviewedVersion = latest.Version,
                    };
                    _db.DocumentReviewDecisions.Add(pending);
                    rows.Add(pending);
                }
            }
            row ??= rows.First(r => r.ReviewerId == callerId);

            row.Status = newStatus switch
            {
                DocumentSubmissionStatus.Approved           => DocumentReviewStatus.Approved,
                DocumentSubmissionStatus.NeedsRevision      => DocumentReviewStatus.NeedsRevision,
                DocumentSubmissionStatus.SubmittedForReview => DocumentReviewStatus.Pending,
                _ => throw new InvalidOperationException("Choose Approve or Request Revision."),
            };
            row.ReviewedVersion = latest.Version;
            row.DecidedAt = row.Status == DocumentReviewStatus.Pending ? null : PhilippineTime.Now;

            var current = reviewers.Select(r => r.UserId).ToHashSet();
            // A new version the students have not sent yet stays a draft.
            if (latest.SubmissionStatus != DocumentSubmissionStatus.Draft)
                latest.SubmissionStatus = AggregateStatus(rows.Where(r => current.Contains(r.ReviewerId)));
            await _db.SaveChangesAsync();

            if (row.Status != DocumentReviewStatus.Pending)
            {
                var who = me.Label == "Adviser" ? "Your adviser" : $"Panel member {me.FullName}";
                var what = row.Status == DocumentReviewStatus.Approved ? "approved" : "requested a revision on";
                var tail = latest.SubmissionStatus == DocumentSubmissionStatus.Approved
                    ? " It is now approved by your adviser and the whole panel."
                    : string.Empty;
                await _notifications.SendToGroupMembersAsync(
                    doc.CapstoneGroupId,
                    $"{who} {what} \"{doc.Title}\" (v{latest.Version}).{tail}",
                    NotificationType.DocumentStatusUpdated);
            }

            return (await GetDocumentByIdAsync(documentId, callerId, callerRole))!;
        }

        // Any revision request → the students must revise; otherwise anyone still pending →
        // under review; everyone approved → approved.
        private static DocumentSubmissionStatus AggregateStatus(IEnumerable<DocumentReviewDecision> rows)
        {
            var list = rows.ToList();
            if (list.Any(r => r.Status == DocumentReviewStatus.NeedsRevision)) return DocumentSubmissionStatus.NeedsRevision;
            if (list.Count == 0 || list.Any(r => r.Status == DocumentReviewStatus.Pending)) return DocumentSubmissionStatus.SubmittedForReview;
            return DocumentSubmissionStatus.Approved;
        }

        private Task<DocumentSubmission> LatestInChainAsync(int rootId) =>
            _db.DocumentSubmissions
                .Where(d => d.Id == rootId || d.OriginalDocumentId == rootId)
                .OrderByDescending(d => d.Version)
                .FirstAsync();

        // Fills in each document's reviewer list: the group's adviser and standing panel (same
        // order, labels and colours as the manuscript highlights) with their decision rows.
        private async Task<List<DocumentSubmissionResponseDto>> AttachReviewsAsync(List<DocumentSubmissionResponseDto> dtos)
        {
            if (dtos.Count == 0) return dtos;

            var reviewersByGroup = new Dictionary<int, List<ManuscriptReviewerDto>>();
            foreach (var groupId in dtos.Select(d => d.CapstoneGroupId).Distinct())
                reviewersByGroup[groupId] = await _manuscript.GetReviewersAsync(groupId);

            var rootIds = dtos.Select(d => d.OriginalDocumentId ?? d.Id).Distinct().ToList();
            var rows = await _db.DocumentReviewDecisions
                .Where(r => rootIds.Contains(r.DocumentSubmissionId))
                .ToListAsync();

            foreach (var dto in dtos)
            {
                var rootId = dto.OriginalDocumentId ?? dto.Id;
                dto.Reviews = reviewersByGroup[dto.CapstoneGroupId].Select(r =>
                {
                    var row = rows.FirstOrDefault(x => x.DocumentSubmissionId == rootId && x.ReviewerId == r.UserId);
                    return new DocumentReviewerDecisionDto
                    {
                        ReviewerId = r.UserId,
                        FullName = r.FullName,
                        Label = r.Label,
                        IsAdviser = r.Label == "Adviser",
                        Color = r.Color,
                        Status = row?.Status,
                        ReviewedVersion = row?.ReviewedVersion,
                        DecidedAt = row?.DecidedAt,
                    };
                }).ToList();
            }
            return dtos;
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
