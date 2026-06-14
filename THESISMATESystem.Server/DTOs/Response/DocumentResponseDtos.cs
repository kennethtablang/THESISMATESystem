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
    }

    public class DocumentCommentResponseDto
    {
        public int Id { get; set; }
        public int DocumentSubmissionId { get; set; }
        public UserSummaryDto Author { get; set; } = null!;
        public string AuthorRole { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
