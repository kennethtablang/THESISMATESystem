using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Response
{
    public class ConsultationLogResponseDto
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public int? ChapterSubmissionId { get; set; }
        public DateTime ConsultationDate { get; set; }
        public ConsultationMode Mode { get; set; }
        public string DiscussionContent { get; set; } = string.Empty;
        public string Outcome { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public UserSummaryDto Adviser { get; set; } = null!;
    }
}
