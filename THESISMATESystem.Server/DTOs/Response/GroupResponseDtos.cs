using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Response
{
    public class CapstoneGroupResponseDto
    {
        public int Id { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string? ProjectTitle { get; set; }
        public bool TitleApproved { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public GroupStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? ManuscriptVersion { get; set; }
        public string? SystemVersion { get; set; }
        public string? SystemLogoUrl { get; set; }
        public DateTime? ManuscriptDueDate { get; set; }
        public DateTime? SystemFeaturesDueDate { get; set; }
        public UserSummaryDto Adviser { get; set; } = null!;
        public List<UserSummaryDto> Members { get; set; } = [];
        public MilestoneProgressDto? MilestoneProgress { get; set; }
    }

    public class UserSummaryDto
    {
        public string Id { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? StudentId { get; set; }
    }

    public class MilestoneProgressDto
    {
        public int TotalChapters { get; set; } = 5;
        public int ApprovedChapters { get; set; }
        public bool DefenseScheduled { get; set; }
        public bool DefenseCompleted { get; set; }
        public decimal CompletionPercentage { get; set; }
    }
}
