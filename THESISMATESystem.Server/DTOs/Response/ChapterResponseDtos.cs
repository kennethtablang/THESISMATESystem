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
        // Where the panel stands on this submission. The adviser still owns Status.
        public List<ChapterPanelReviewDto> PanelReviews { get; set; } = [];
    }

    public class ChapterPanelReviewDto
    {
        public int Id { get; set; }
        public bool Approved { get; set; }
        public string? Comment { get; set; }
        public DateTime DecidedAt { get; set; }
        public UserSummaryDto Panelist { get; set; } = null!;
    }

    public class RevisionNoteResponseDto
    {
        public int Id { get; set; }
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public UserSummaryDto CreatedBy { get; set; } = null!;
    }
}
