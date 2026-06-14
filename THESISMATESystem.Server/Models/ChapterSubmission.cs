using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class ChapterSubmission
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public CapstoneGroup CapstoneGroup { get; set; } = null!;

        public int ChapterNumber { get; set; } // 1–5
        public int Version { get; set; } = 1;
        public string FileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public ChapterStatus Status { get; set; } = ChapterStatus.PendingReview;
        public DateTime SubmittedAt { get; set; } = PhilippineTime.Now;

        public string SubmittedById { get; set; } = string.Empty;
        public ApplicationUser SubmittedBy { get; set; } = null!;

        public ICollection<RevisionNote> RevisionNotes { get; set; } = [];
    }
}
