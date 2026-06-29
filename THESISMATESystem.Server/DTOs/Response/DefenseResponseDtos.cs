using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Response
{
    public class DefenseScheduleResponseDto
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public DateTime ScheduledDateTime { get; set; }
        public int DurationMinutes { get; set; }
        public string Venue { get; set; } = string.Empty;
        public DefensePhase Phase { get; set; }
        public DefenseStatus Status { get; set; }
        public bool IsRatingOpen { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<UserSummaryDto> Panelists { get; set; } = [];
        public ConsolidatedRatingDto? ConsolidatedRating { get; set; }
    }

    public class DefenseCriterionResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Weight { get; set; }
        public int MaxScore { get; set; }
        public DefensePhase Phase { get; set; }
    }

    public class DefenseRatingResponseDto
    {
        public int Id { get; set; }
        public int DefenseScheduleId { get; set; }
        public DefenseCriterionResponseDto Criterion { get; set; } = null!;
        public UserSummaryDto Panelist { get; set; } = null!;
        public decimal Score { get; set; }
        public decimal WeightedScore { get; set; }
        public string? Comments { get; set; }
        public bool IsFinalized { get; set; }
        public DateTime SubmittedAt { get; set; }
    }

    public class ConsolidatedRatingDto
    {
        public decimal TotalWeightedScore { get; set; }
        public bool AllRatingsSubmitted { get; set; }
        public List<CriterionAggregateDto> CriterionBreakdown { get; set; } = [];
    }

    public class CriterionAggregateDto
    {
        public string CriterionName { get; set; } = string.Empty;
        public decimal Weight { get; set; }
        public decimal AverageScore { get; set; }
        public decimal WeightedContribution { get; set; }
    }
}
