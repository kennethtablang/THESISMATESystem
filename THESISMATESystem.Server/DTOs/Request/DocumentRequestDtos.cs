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
        public string Content { get; set; } = string.Empty;
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
