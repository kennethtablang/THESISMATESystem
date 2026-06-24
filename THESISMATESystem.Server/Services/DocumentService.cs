using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
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

        public DocumentService(AppDbContext db, IWebHostEnvironment env, UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _env = env;
            _userManager = userManager;
        }

        public async Task<DocumentSubmissionResponseDto> UploadDocumentAsync(string uploadedById, UploadDocumentRequestDto dto)
        {
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
                MimeType = dto.File.ContentType
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

            // Admins and staff with broad access can view any version history
            var isPrivileged = callerRole is "Admin" or "SuperAdmin" or "FacultyIC";
            if (!isPrivileged)
            {
                // Adviser — must advise this group
                var groupId = doc.CapstoneGroupId;
                if (callerRole == "Adviser")
                {
                    var advises = await _db.CapstoneGroups
                        .AnyAsync(g => g.Id == groupId && g.AdviserId == callerId);
                    if (!advises) throw new UnauthorizedAccessException();
                }
                else
                {
                    // Student / Panel — must be a group member
                    var isMember = await _db.GroupMembers
                        .AnyAsync(gm => gm.CapstoneGroupId == groupId && gm.UserId == callerId);
                    if (!isMember) throw new UnauthorizedAccessException();
                }
            }

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

        public async Task<IEnumerable<DocumentSubmissionResponseDto>> GetDocumentsByGroupAsync(int groupId)
        {
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

        public async Task<DocumentSubmissionResponseDto?> GetDocumentByIdAsync(int id)
        {
            var doc = await _db.DocumentSubmissions
                .Include(d => d.SubmittedBy)
                .Include(d => d.CapstoneGroup)
                .Include(d => d.Comments)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doc is null) return null;

            // Compute total versions for this chain
            var rootId = doc.OriginalDocumentId ?? doc.Id;
            var totalVersions = await _db.DocumentSubmissions
                .CountAsync(d => d.Id == rootId || d.OriginalDocumentId == rootId);

            return MapToDtoWithMeta(doc, totalVersions);
        }

        public async Task<string> GetDownloadPathAsync(int id)
        {
            var doc = await _db.DocumentSubmissions.FindAsync(id)
                ?? throw new KeyNotFoundException("Document not found.");
            return doc.FilePath;
        }

        public async Task<DocumentCommentResponseDto> AddCommentAsync(int documentId, string authorId, AddDocumentCommentRequestDto dto)
        {
            var doc = await _db.DocumentSubmissions.FindAsync(documentId)
                ?? throw new KeyNotFoundException("Document not found.");

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

        public async Task<IEnumerable<DocumentCommentResponseDto>> GetCommentsAsync(int documentId)
        {
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

            if (File.Exists(doc.FilePath)) File.Delete(doc.FilePath);
            _db.DocumentSubmissions.Remove(doc);
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
        };
    }
}
