using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    /// <summary>
    /// One row of a defense's compliance matrix: a recommendation from the Admin/subject teacher,
    /// the adviser or a panelist, where it applies (Preliminaries, a chapter, the system, …) and
    /// the initials of whoever gave it. Kept for Proposal, Pre-Final and Final defenses (and their
    /// re-defenses).
    /// </summary>
    public class DefenseRecommendation
    {
        public int Id { get; set; }
        public int DefenseScheduleId { get; set; }
        public DefenseSchedule DefenseSchedule { get; set; } = null!;

        public string AuthorId { get; set; } = string.Empty;
        public ApplicationUser Author { get; set; } = null!;

        public string Recommendation { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Initials { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;
    }
}
