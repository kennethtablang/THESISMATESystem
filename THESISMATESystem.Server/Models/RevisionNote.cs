namespace THESISMATESystem.Server.Models
{
    public class RevisionNote
    {
        public int Id { get; set; }
        public int ChapterSubmissionId { get; set; }
        public ChapterSubmission ChapterSubmission { get; set; } = null!;

        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string CreatedById { get; set; } = string.Empty;
        public ApplicationUser CreatedBy { get; set; } = null!;
    }
}
