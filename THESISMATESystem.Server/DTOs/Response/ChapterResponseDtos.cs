using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Response
{
    public class ChapterSubmissionResponseDto
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public int ChapterNumber { get; set; }
        public int Version { get; set; }
        public string FileName { get; set; } = string.Empty;
        public ChapterStatus Status { get; set; }
        public DateTime SubmittedAt { get; set; }
        public UserSummaryDto SubmittedBy { get; set; } = null!;
        public List<RevisionNoteResponseDto> RevisionNotes { get; set; } = [];
    }

    public class RevisionNoteResponseDto
    {
        public int Id { get; set; }
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public UserSummaryDto CreatedBy { get; set; } = null!;
    }
}
