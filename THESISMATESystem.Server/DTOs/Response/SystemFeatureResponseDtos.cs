using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Response
{
    public class SystemFeatureResponseDto
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public FeatureType FeatureType { get; set; }
        public string FeatureTypeLabel { get; set; } = string.Empty;
        public SystemFeatureStatus Status { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public DateTime? PlannedStartDate { get; set; }
        public DateTime? PlannedEndDate { get; set; }
        public DateTime? ActualStartDate { get; set; }
        public DateTime? ActualEndDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int CommentCount { get; set; }
        public FeatureUrgency Urgency { get; set; }
        public string UrgencyLabel { get; set; } = string.Empty;
        public StudentTestStatus StudentTestStatus { get; set; }
        public string StudentTestStatusLabel { get; set; } = string.Empty;
        public string? StudentTestNote { get; set; }
        public DateTime? StudentTestedAt { get; set; }
        public List<SystemFeatureScreenshotDto> Screenshots { get; set; } = [];
    }

    public class SystemFeatureScreenshotDto
    {
        public int Id { get; set; }
        public string Path { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
    }

    public class SystemFeatureCommentResponseDto
    {
        public int Id { get; set; }
        public int SystemFeatureId { get; set; }
        public UserSummaryDto Author { get; set; } = null!;
        public string AuthorRole { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsSystemComment { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
