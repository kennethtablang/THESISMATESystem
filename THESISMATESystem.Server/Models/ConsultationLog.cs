using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class ConsultationLog
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public CapstoneGroup CapstoneGroup { get; set; } = null!;

        public int? ChapterSubmissionId { get; set; }
        public ChapterSubmission? ChapterSubmission { get; set; }

        public DateTime ConsultationDate { get; set; }
        public ConsultationMode Mode { get; set; }
        public string DiscussionContent { get; set; } = string.Empty;
        public string Outcome { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;

        public string AdviserId { get; set; } = string.Empty;
        public ApplicationUser Adviser { get; set; } = null!;
    }
}
