using System.ComponentModel.DataAnnotations;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class CreateDefenseScheduleRequestDto
    {
        [Required] public int CapstoneGroupId { get; set; }
        [Required] public DateTime ScheduledDateTime { get; set; }
        public int DurationMinutes { get; set; } = 60;
        [Required] public string Venue { get; set; } = string.Empty;
        public DefensePhase Phase { get; set; } = DefensePhase.TitleDefense;
        public List<string> PanelistIds { get; set; } = [];
    }

    public class UpdateDefenseScheduleRequestDto
    {
        public DateTime? ScheduledDateTime { get; set; }
        public int? DurationMinutes { get; set; }
        public string? Venue { get; set; }
        public DefensePhase? Phase { get; set; }
        public List<string>? PanelistIds { get; set; }
    }

    public class SubmitRatingRequestDto
    {
        [Required] public int DefenseScheduleId { get; set; }
        [Required] public int DefenseCriterionId { get; set; }
        [Required, Range(0, 100)] public decimal Score { get; set; }
        public string? Comments { get; set; }
    }

    public class CreateCriterionRequestDto
    {
        [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
        [MaxLength(500)]           public string? Description { get; set; }
        [Required, Range(0.01, 100)] public decimal Weight { get; set; }
        [Required, Range(1, 100)] public int MaxScore { get; set; } = 100;
        [Required] public DefensePhase Phase { get; set; } = DefensePhase.TitleDefense;
    }

    public class UpdateCriterionRequestDto
    {
        [MaxLength(200)]           public string? Name { get; set; }
        [MaxLength(500)]           public string? Description { get; set; }
        [Range(0.01, 100)]         public decimal? Weight { get; set; }
        [Range(1, 100)]            public int? MaxScore { get; set; }
        public DefensePhase?       Phase { get; set; }
    }
}
