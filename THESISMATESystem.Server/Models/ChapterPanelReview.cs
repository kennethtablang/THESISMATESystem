using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    /// <summary>
    /// One panel member's verdict on a chapter submission: endorsed or not, with an optional
    /// remark. Separate from <see cref="ChapterSubmission.Status"/>, which stays the adviser's
    /// call — the panel says whether it approves what the group submitted, the adviser decides
    /// what happens to the chapter.
    /// </summary>
    public class ChapterPanelReview
    {
        public int Id { get; set; }

        public int ChapterSubmissionId { get; set; }
        public ChapterSubmission ChapterSubmission { get; set; } = null!;

        public string PanelistId { get; set; } = string.Empty;
        public ApplicationUser Panelist { get; set; } = null!;

        public bool Approved { get; set; }
        public string? Comment { get; set; }
        public DateTime DecidedAt { get; set; } = PhilippineTime.Now;
    }
}
