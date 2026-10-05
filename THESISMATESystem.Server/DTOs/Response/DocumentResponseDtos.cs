using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Response
{
    public class DocumentSubmissionResponseDto
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public UserSummaryDto SubmittedBy { get; set; } = null!;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string MimeType { get; set; } = string.Empty;
        public int Version { get; set; }
        public DateTime SubmittedAt { get; set; }
        public int CommentCount { get; set; }
        public int? OriginalDocumentId { get; set; }
        public bool IsRevised { get; set; }
        public int TotalVersions { get; set; }
        public bool IsChanged { get; set; }
        public DocumentSection? Section { get; set; }
        public bool IsAutoFinalized { get; set; }
        public DocumentSubmissionStatus SubmissionStatus { get; set; }

        // The adviser and every standing panel member of the group, each with their standing on
        // this document chain. Status is null for a reviewer who has not been asked yet.
        public List<DocumentReviewerDecisionDto> Reviews { get; set; } = [];
    }

    public class DocumentReviewerDecisionDto
    {
        public string ReviewerId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        // "Adviser", "Panel Chair" or "Panel N" — same labels and colours as manuscript highlights.
        public string Label { get; set; } = string.Empty;
        public bool IsAdviser { get; set; }
        public string Color { get; set; } = string.Empty;
        public DocumentReviewStatus? Status { get; set; }
        public int? ReviewedVersion { get; set; }
        public DateTime? DecidedAt { get; set; }
    }

    public class DocumentVersionDto
    {
        public int Id { get; set; }
        public int Version { get; set; }
        public string FileName { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public DateTime SubmittedAt { get; set; }
        public UserSummaryDto SubmittedBy { get; set; } = null!;
    }

    public class DocumentCommentResponseDto
    {
        public int Id { get; set; }
        public int DocumentSubmissionId { get; set; }
        public UserSummaryDto Author { get; set; } = null!;
        public string AuthorRole { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? Quote { get; set; }
        public string? Prefix { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
