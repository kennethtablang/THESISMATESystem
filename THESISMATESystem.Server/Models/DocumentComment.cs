using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class DocumentComment
    {
        public int Id { get; set; }
        public int DocumentSubmissionId { get; set; }
        public DocumentSubmission DocumentSubmission { get; set; } = null!;

        public string AuthorId { get; set; } = string.Empty;
        public ApplicationUser Author { get; set; } = null!;

        public string Content { get; set; } = string.Empty;

        // A reviewer's highlight: the selected text of the rendered document and up to 40
        // characters before it, so the client can find the passage again (the same quote may
        // appear more than once). Null for a plain comment.
        public string? Quote { get; set; }
        public string? Prefix { get; set; }
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;
        public DateTime? UpdatedAt { get; set; }
    }
}
