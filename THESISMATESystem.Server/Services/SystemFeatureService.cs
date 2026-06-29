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
    public class SystemFeatureService : ISystemFeatureService
    {
        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly INotificationService _notifications;

        public SystemFeatureService(AppDbContext db, UserManager<ApplicationUser> userManager,
            INotificationService notifications)
        {
            _db = db;
            _userManager = userManager;
            _notifications = notifications;
        }

        public async Task<SystemFeatureResponseDto> CreateFeatureAsync(string createdById, CreateSystemFeatureRequestDto dto)
        {
            var feature = new SystemFeature
            {
                CapstoneGroupId = dto.CapstoneGroupId,
                Name = dto.Name,
                Description = dto.Description,
                FeatureType = dto.FeatureType,
                SortOrder = dto.SortOrder
            };

            _db.SystemFeatures.Add(feature);
            await _db.SaveChangesAsync();
            await _db.Entry(feature).Reference(f => f.CapstoneGroup).LoadAsync();
            await _db.Entry(feature).Collection(f => f.Comments).LoadAsync();
            await _db.Entry(feature).Collection(f => f.Screenshots).LoadAsync();
            return MapToDto(feature);
        }

        public async Task<IEnumerable<SystemFeatureResponseDto>> GetFeaturesByGroupAsync(int groupId)
        {
            var features = await _db.SystemFeatures
                .Include(f => f.CapstoneGroup)
                .Include(f => f.Comments)
                .Include(f => f.Screenshots)
                .Where(f => f.CapstoneGroupId == groupId)
                .OrderBy(f => f.FeatureType)
                .ThenBy(f => f.SortOrder)
                .ToListAsync();

            return features.Select(MapToDto);
        }

        public async Task<SystemFeatureResponseDto?> GetFeatureByIdAsync(int id)
        {
            var feature = await _db.SystemFeatures
                .Include(f => f.CapstoneGroup)
                .Include(f => f.Comments)
                .Include(f => f.Screenshots)
                .FirstOrDefaultAsync(f => f.Id == id);

            return feature is null ? null : MapToDto(feature);
        }

        public async Task<SystemFeatureResponseDto> UpdateFeatureAsync(int id, string updatedById, UpdateSystemFeatureRequestDto dto)
        {
            var feature = await _db.SystemFeatures
                .Include(f => f.CapstoneGroup)
                .Include(f => f.Comments)
                .Include(f => f.Screenshots)
                .FirstOrDefaultAsync(f => f.Id == id)
                ?? throw new KeyNotFoundException("Feature not found.");

            var previousStatus = feature.Status;

            if (dto.Name is not null) feature.Name = dto.Name;
            if (dto.Description is not null) feature.Description = dto.Description;
            if (dto.Status.HasValue) feature.Status = dto.Status.Value;
            if (dto.Urgency.HasValue) feature.Urgency = dto.Urgency.Value;
            if (dto.SortOrder.HasValue) feature.SortOrder = dto.SortOrder.Value;
            if (dto.PlannedStartDate.HasValue) feature.PlannedStartDate = dto.PlannedStartDate;
            if (dto.PlannedEndDate.HasValue) feature.PlannedEndDate = dto.PlannedEndDate;
            if (dto.ActualStartDate.HasValue) feature.ActualStartDate = dto.ActualStartDate;
            if (dto.ActualEndDate.HasValue) feature.ActualEndDate = dto.ActualEndDate;
            feature.UpdatedAt = PhilippineTime.Now;

            await _db.SaveChangesAsync();

            // Auto-post a system comment when the status changes
            if (dto.Status.HasValue && dto.Status.Value != previousStatus)
            {
                var label = dto.Status.Value switch
                {
                    SystemFeatureStatus.Completed     => "Approved",
                    SystemFeatureStatus.NeedsRevision => "Needs Revision",
                    SystemFeatureStatus.InProgress    => "In Progress",
                    SystemFeatureStatus.NotStarted    => "Not Started",
                    _ => dto.Status.Value.ToString()
                };

                // Determine the actor label from the user's actual role
                var updater = await _userManager.FindByIdAsync(updatedById);
                var updaterRoles = updater is not null ? await _userManager.GetRolesAsync(updater) : [];
                var actorLabel = updaterRoles.Contains("Faculty") ? "Adviser"
                               : updaterRoles.Contains("Student") ? "Student"
                               : "Admin";
                var updaterName = updater is not null
                    ? $"{updater.FirstName} {updater.LastName}" : actorLabel;

                var autoMessage = $"{actorLabel} marked this feature as {label}.";
                _db.SystemFeatureComments.Add(new SystemFeatureComment
                {
                    SystemFeatureId = id,
                    AuthorId = updatedById,
                    Content = autoMessage,
                    IsSystemComment = true,
                });
                await _db.SaveChangesAsync();

                // Keep the comment count in sync with what MapToDto reads
                await _db.Entry(feature).Collection(f => f.Comments).LoadAsync();

                // Notify group members about the status change
                var memberIds = await _db.GroupMembers
                    .Where(gm => gm.CapstoneGroupId == feature.CapstoneGroupId)
                    .Select(gm => gm.UserId)
                    .ToListAsync();

                if (memberIds.Count > 0)
                {
                    _ = _notifications.SendSystemFeatureNotificationAsync(
                        memberIds, updaterName, feature.Name, autoMessage,
                        NotificationType.SystemFeatureStatusUpdated,
                        id, feature.CapstoneGroupId);
                }
            }

            return MapToDto(feature);
        }

        public async Task<bool> DeleteFeatureAsync(int id)
        {
            var feature = await _db.SystemFeatures
                .Include(f => f.Screenshots)
                .FirstOrDefaultAsync(f => f.Id == id);
            if (feature is null) return false;
            _db.SystemFeatures.Remove(feature);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<SystemFeatureCommentResponseDto> AddCommentAsync(int featureId, string authorId, AddSystemFeatureCommentRequestDto dto)
        {
            var feature = await _db.SystemFeatures
                .Include(f => f.CapstoneGroup)
                .FirstOrDefaultAsync(f => f.Id == featureId)
                ?? throw new KeyNotFoundException("Feature not found.");

            var author = await _userManager.FindByIdAsync(authorId)
                ?? throw new KeyNotFoundException("User not found.");
            var roles = await _userManager.GetRolesAsync(author);
            var isAdminOrSuperAdmin = roles.Any(r => r is "Admin" or "SuperAdmin");

            if (!isAdminOrSuperAdmin)
            {
                var isMember = await _db.GroupMembers
                    .AnyAsync(gm => gm.CapstoneGroupId == feature.CapstoneGroupId && gm.UserId == authorId);
                var isAdviser = feature.CapstoneGroup.AdviserId == authorId;
                var isPanelist = await _db.PanelAssignments
                    .Include(pa => pa.DefenseSchedule)
                    .AnyAsync(pa => pa.PanelistId == authorId && pa.DefenseSchedule.CapstoneGroupId == feature.CapstoneGroupId);
                if (!isMember && !isAdviser && !isPanelist)
                    throw new UnauthorizedAccessException("You do not have access to comment on this feature.");
            }

            var comment = new SystemFeatureComment
            {
                SystemFeatureId = featureId,
                AuthorId = authorId,
                Content = dto.Content
            };

            _db.SystemFeatureComments.Add(comment);
            await _db.SaveChangesAsync();

            // Notify group members + adviser (excluding the commenter)
            var memberIds = await _db.GroupMembers
                .Where(gm => gm.CapstoneGroupId == feature.CapstoneGroupId && gm.UserId != authorId)
                .Select(gm => gm.UserId)
                .ToListAsync();

            var recipientIds = memberIds.ToList();
            if (feature.CapstoneGroup.AdviserId is not null && feature.CapstoneGroup.AdviserId != authorId)
                recipientIds.Add(feature.CapstoneGroup.AdviserId);

            if (recipientIds.Count > 0)
            {
                var authorName = $"{author.FirstName} {author.LastName}";
                _ = _notifications.SendSystemFeatureNotificationAsync(
                    recipientIds, authorName, feature.Name,
                    $"{authorName} commented on \"{feature.Name}\".",
                    NotificationType.SystemFeatureCommented,
                    featureId, feature.CapstoneGroupId,
                    dto.Content);
            }

            return new SystemFeatureCommentResponseDto
            {
                Id = comment.Id,
                SystemFeatureId = comment.SystemFeatureId,
                Author = new UserSummaryDto { Id = author.Id, FullName = $"{author.FirstName} {author.LastName}" },
                AuthorRole = roles.FirstOrDefault() ?? string.Empty,
                Content = comment.Content,
                IsSystemComment = false,
                CreatedAt = comment.CreatedAt
            };
        }

        public async Task<IEnumerable<SystemFeatureCommentResponseDto>> GetCommentsAsync(int featureId)
        {
            var comments = await _db.SystemFeatureComments
                .Include(c => c.Author)
                .Where(c => c.SystemFeatureId == featureId)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();

            var result = new List<SystemFeatureCommentResponseDto>();
            foreach (var c in comments)
            {
                var roles = await _userManager.GetRolesAsync(c.Author);
                result.Add(new SystemFeatureCommentResponseDto
                {
                    Id = c.Id,
                    SystemFeatureId = c.SystemFeatureId,
                    Author = new UserSummaryDto { Id = c.Author.Id, FullName = $"{c.Author.FirstName} {c.Author.LastName}" },
                    AuthorRole = roles.FirstOrDefault() ?? string.Empty,
                    Content = c.Content,
                    IsSystemComment = c.IsSystemComment,
                    CreatedAt = c.CreatedAt
                });
            }
            return result;
        }

        public async Task<bool> DeleteCommentAsync(int commentId, string userId)
        {
            var comment = await _db.SystemFeatureComments.FindAsync(commentId)
                ?? throw new KeyNotFoundException("Comment not found.");

            if (comment.IsSystemComment)
                throw new UnauthorizedAccessException("System comments cannot be deleted.");

            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException("User not found.");
            var roles = await _userManager.GetRolesAsync(user);
            var isAdmin = roles.Any(r => r is "Admin" or "SuperAdmin");

            if (!isAdmin && comment.AuthorId != userId)
                throw new UnauthorizedAccessException("You can only delete your own comments.");

            _db.SystemFeatureComments.Remove(comment);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<SystemFeatureResponseDto> SubmitStudentTestAsync(int featureId, string userId, SubmitStudentTestRequestDto dto)
        {
            var feature = await _db.SystemFeatures
                .Include(f => f.CapstoneGroup)
                .Include(f => f.Comments)
                .Include(f => f.Screenshots)
                .FirstOrDefaultAsync(f => f.Id == featureId)
                ?? throw new KeyNotFoundException("Feature not found.");

            var isMember = await _db.GroupMembers
                .AnyAsync(gm => gm.CapstoneGroupId == feature.CapstoneGroupId && gm.UserId == userId);
            if (!isMember) throw new UnauthorizedAccessException("You are not a member of this group.");

            feature.StudentTestStatus = dto.TestStatus;
            feature.StudentTestNote = dto.Note;
            feature.StudentTestedAt = PhilippineTime.Now;
            feature.UpdatedAt = PhilippineTime.Now;

            await _db.SaveChangesAsync();

            // Auto-post a system comment recording the test result
            var testLabel = dto.TestStatus switch
            {
                StudentTestStatus.Passed => "Working",
                StudentTestStatus.Failed => "Not Working",
                _ => dto.TestStatus.ToString()
            };
            var student = await _userManager.FindByIdAsync(userId);
            var studentName = student is not null ? $"{student.FirstName} {student.LastName}" : "Student";
            _db.SystemFeatureComments.Add(new SystemFeatureComment
            {
                SystemFeatureId = featureId,
                AuthorId = userId,
                Content = $"{studentName} tagged this feature as {testLabel}.",
                IsSystemComment = true,
            });
            await _db.SaveChangesAsync();
            await _db.Entry(feature).Collection(f => f.Comments).LoadAsync();

            return MapToDto(feature);
        }

        public async Task<SystemFeatureResponseDto> UploadScreenshotAsync(int featureId, string userId, IFormFile file, string webRootPath)
        {
            var feature = await _db.SystemFeatures
                .Include(f => f.CapstoneGroup)
                .Include(f => f.Comments)
                .Include(f => f.Screenshots)
                .FirstOrDefaultAsync(f => f.Id == featureId)
                ?? throw new KeyNotFoundException("Feature not found.");

            var isMember = await _db.GroupMembers
                .AnyAsync(gm => gm.CapstoneGroupId == feature.CapstoneGroupId && gm.UserId == userId);
            if (!isMember) throw new UnauthorizedAccessException("You are not a member of this group.");

            var uploadDir = Path.Combine(webRootPath, "uploads", "system-features");
            Directory.CreateDirectory(uploadDir);

            var ext = Path.GetExtension(file.FileName);
            var fileName = $"feature-{featureId}-{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadDir, fileName);

            await using var stream = File.Create(filePath);
            await file.CopyToAsync(stream);

            var screenshot = new SystemFeatureScreenshot
            {
                SystemFeatureId = featureId,
                Path = $"/uploads/system-features/{fileName}",
            };
            _db.SystemFeatureScreenshots.Add(screenshot);

            feature.UpdatedAt = PhilippineTime.Now;
            await _db.SaveChangesAsync();

            return MapToDto(feature);
        }

        private static SystemFeatureResponseDto MapToDto(SystemFeature f) => new()
        {
            Id = f.Id,
            CapstoneGroupId = f.CapstoneGroupId,
            GroupName = f.CapstoneGroup?.GroupName ?? string.Empty,
            Name = f.Name,
            Description = f.Description,
            FeatureType = f.FeatureType,
            FeatureTypeLabel = f.FeatureType.ToString(),
            Status = f.Status,
            StatusLabel = f.Status.ToString(),
            SortOrder = f.SortOrder,
            PlannedStartDate = f.PlannedStartDate,
            PlannedEndDate = f.PlannedEndDate,
            ActualStartDate = f.ActualStartDate,
            ActualEndDate = f.ActualEndDate,
            CreatedAt = f.CreatedAt,
            UpdatedAt = f.UpdatedAt,
            CommentCount = f.Comments.Count,
            Urgency = f.Urgency,
            UrgencyLabel = f.Urgency.ToString(),
            StudentTestStatus = f.StudentTestStatus,
            StudentTestStatusLabel = f.StudentTestStatus.ToString(),
            StudentTestNote = f.StudentTestNote,
            StudentTestedAt = f.StudentTestedAt,
            Screenshots = f.Screenshots
                .OrderBy(s => s.UploadedAt)
                .Select(s => new SystemFeatureScreenshotDto { Id = s.Id, Path = s.Path, UploadedAt = s.UploadedAt })
                .ToList(),
        };
    }
}
