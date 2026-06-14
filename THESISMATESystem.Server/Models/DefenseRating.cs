using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class DefenseRating
    {
        public int Id { get; set; }
        public int DefenseScheduleId { get; set; }
        public DefenseSchedule DefenseSchedule { get; set; } = null!;

        public int DefenseCriterionId { get; set; }
        public DefenseCriterion DefenseCriterion { get; set; } = null!;

        public string PanelistId { get; set; } = string.Empty;
        public ApplicationUser Panelist { get; set; } = null!;

        public decimal Score { get; set; }
        public string? Comments { get; set; }
        public bool IsFinalized { get; set; } = false;
        public DateTime SubmittedAt { get; set; } = PhilippineTime.Now;
        public DateTime? FinalizedAt { get; set; }
    }
}
