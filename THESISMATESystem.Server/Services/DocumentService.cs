using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
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

        public async Task<IEnumerable<DocumentSubmissionResponseDto>> GetDocumentsByGroupAsync(int groupId)
        {
            var docs = await _db.DocumentSubmissions
                .Include(d => d.SubmittedBy)
                .Include(d => d.CapstoneGroup)
                .Include(d => d.Comments)
                .Where(d => d.CapstoneGroupId == groupId)
                .OrderByDescending(d => d.SubmittedAt)
                .ToListAsync();

            return docs.Select(MapToDto);
        }

        public async Task<IEnumerable<DocumentSubmissionResponseDto>> GetDocumentsByAdviserAsync(string adviserId)
        {
            var groupIds = await _db.CapstoneGroups
                .Where(g => g.AdviserId == adviserId)
                .Select(g => g.Id)
                .ToListAsync();

            var docs = await _db.DocumentSubmissions
                .Include(d => d.SubmittedBy)
                .Include(d => d.CapstoneGroup)
                .Include(d => d.Comments)
                .Where(d => groupIds.Contains(d.CapstoneGroupId))
                .OrderByDescending(d => d.SubmittedAt)
                .ToListAsync();

            return docs.Select(MapToDto);
        }

        public async Task<DocumentSubmissionResponseDto?> GetDocumentByIdAsync(int id)
        {
            var doc = await _db.DocumentSubmissions
                .Include(d => d.SubmittedBy)
                .Include(d => d.CapstoneGroup)
                .Include(d => d.Comments)
                .FirstOrDefaultAsync(d => d.Id == id);

            return doc is null ? null : MapToDto(doc);
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

        public async Task<bool> DeleteDocumentAsync(int id, string userId)
        {
            var doc = await _db.DocumentSubmissions.FindAsync(id);
            if (doc is null) return false;
            if (doc.SubmittedById != userId) return false;

            if (File.Exists(doc.FilePath)) File.Delete(doc.FilePath);
            _db.DocumentSubmissions.Remove(doc);
            await _db.SaveChangesAsync();
            return true;
        }

        private async Task<DocumentSubmissionResponseDto> BuildDocumentResponseAsync(DocumentSubmission submission)
        {
            await _db.Entry(submission).Reference(d => d.SubmittedBy).LoadAsync();
            await _db.Entry(submission).Reference(d => d.CapstoneGroup).LoadAsync();
            await _db.Entry(submission).Collection(d => d.Comments).LoadAsync();
            return MapToDto(submission);
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

        private static DocumentSubmissionResponseDto MapToDto(DocumentSubmission d) => new()
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
            CommentCount = d.Comments.Count
        };
    }
}
