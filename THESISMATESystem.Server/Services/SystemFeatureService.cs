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
    public class SystemFeatureService : ISystemFeatureService
    {
        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;

        public SystemFeatureService(AppDbContext db, UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _userManager = userManager;
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
            return MapToDto(feature);
        }

        public async Task<IEnumerable<SystemFeatureResponseDto>> GetFeaturesByGroupAsync(int groupId)
        {
            var features = await _db.SystemFeatures
                .Include(f => f.CapstoneGroup)
                .Include(f => f.Comments)
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
                .FirstOrDefaultAsync(f => f.Id == id);

            return feature is null ? null : MapToDto(feature);
        }

        public async Task<SystemFeatureResponseDto> UpdateFeatureAsync(int id, UpdateSystemFeatureRequestDto dto)
        {
            var feature = await _db.SystemFeatures
                .Include(f => f.CapstoneGroup)
                .Include(f => f.Comments)
                .FirstOrDefaultAsync(f => f.Id == id)
                ?? throw new KeyNotFoundException("Feature not found.");

            if (dto.Name is not null) feature.Name = dto.Name;
            if (dto.Description is not null) feature.Description = dto.Description;
            if (dto.Status.HasValue) feature.Status = dto.Status.Value;
            if (dto.SortOrder.HasValue) feature.SortOrder = dto.SortOrder.Value;
            if (dto.PlannedStartDate.HasValue) feature.PlannedStartDate = dto.PlannedStartDate;
            if (dto.PlannedEndDate.HasValue) feature.PlannedEndDate = dto.PlannedEndDate;
            if (dto.ActualStartDate.HasValue) feature.ActualStartDate = dto.ActualStartDate;
            if (dto.ActualEndDate.HasValue) feature.ActualEndDate = dto.ActualEndDate;
            feature.UpdatedAt = PhilippineTime.Now;

            await _db.SaveChangesAsync();
            return MapToDto(feature);
        }

        public async Task<bool> DeleteFeatureAsync(int id)
        {
            var feature = await _db.SystemFeatures.FindAsync(id);
            if (feature is null) return false;
            _db.SystemFeatures.Remove(feature);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<SystemFeatureCommentResponseDto> AddCommentAsync(int featureId, string authorId, AddSystemFeatureCommentRequestDto dto)
        {
            _ = await _db.SystemFeatures.FindAsync(featureId)
                ?? throw new KeyNotFoundException("Feature not found.");

            var comment = new SystemFeatureComment
            {
                SystemFeatureId = featureId,
                AuthorId = authorId,
                Content = dto.Content
            };

            _db.SystemFeatureComments.Add(comment);
            await _db.SaveChangesAsync();
            await _db.Entry(comment).Reference(c => c.Author).LoadAsync();

            var roles = await _userManager.GetRolesAsync(comment.Author);
            return new SystemFeatureCommentResponseDto
            {
                Id = comment.Id,
                SystemFeatureId = comment.SystemFeatureId,
                Author = new UserSummaryDto { Id = comment.Author.Id, FullName = $"{comment.Author.FirstName} {comment.Author.LastName}" },
                AuthorRole = roles.FirstOrDefault() ?? string.Empty,
                Content = comment.Content,
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
                    CreatedAt = c.CreatedAt
                });
            }
            return result;
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
            CommentCount = f.Comments.Count
        };
    }
}
