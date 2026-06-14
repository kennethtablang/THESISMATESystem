using System.ComponentModel.DataAnnotations;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class CreateDefenseScheduleRequestDto
    {
        [Required] public int CapstoneGroupId { get; set; }
        [Required] public DateTime ScheduledDateTime { get; set; }
        [Required] public string Venue { get; set; } = string.Empty;
        public List<string> PanelistIds { get; set; } = [];
    }

    public class UpdateDefenseScheduleRequestDto
    {
        public DateTime? ScheduledDateTime { get; set; }
        public string? Venue { get; set; }
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
        [Required] public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        [Required, Range(0.01, 100)] public decimal Weight { get; set; }
        [Required, Range(1, 100)] public int MaxScore { get; set; } = 100;
    }
}
