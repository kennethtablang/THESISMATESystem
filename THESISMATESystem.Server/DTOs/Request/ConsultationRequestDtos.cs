using System.ComponentModel.DataAnnotations;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class CreateConsultationRequestDto
    {
        [Required] public int CapstoneGroupId { get; set; }
        public int? ChapterSubmissionId { get; set; }
        [Required] public DateTime ConsultationDate { get; set; }
        [Required] public ConsultationMode Mode { get; set; }
        [Required] public string DiscussionContent { get; set; } = string.Empty;
        [Required] public string Outcome { get; set; } = string.Empty;
    }

    public class UpdateConsultationRequestDto
    {
        public DateTime? ConsultationDate { get; set; }
        public ConsultationMode? Mode { get; set; }
        public string? DiscussionContent { get; set; }
        public string? Outcome { get; set; }
    }
}
