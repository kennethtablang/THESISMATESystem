using System.ComponentModel.DataAnnotations;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class UploadDocumentRequestDto
    {
        public int CapstoneGroupId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public IFormFile File { get; set; } = null!;
        public DocumentSection? Section { get; set; }
    }

    public class AddDocumentCommentRequestDto
    {
        // Rich-text HTML from the review editor, hence the larger cap.
        [Required, MaxLength(20000)] public string Content { get; set; } = string.Empty;

        // Set when the comment is attached to highlighted text in the document preview.
        [MaxLength(2000)] public string? Quote { get; set; }
        [MaxLength(200)] public string? Prefix { get; set; }
    }

    public class UpdateDocumentCommentRequestDto
    {
        public string Content { get; set; } = string.Empty;
    }

    public class UpdateDocumentStatusRequestDto
    {
        public DocumentSubmissionStatus Status { get; set; }
    }
}
