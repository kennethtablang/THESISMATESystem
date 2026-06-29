using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class DocumentSubmission
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public CapstoneGroup CapstoneGroup { get; set; } = null!;

        public string SubmittedById { get; set; } = string.Empty;
        public ApplicationUser SubmittedBy { get; set; } = null!;

        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string MimeType { get; set; } = string.Empty;
        public int Version { get; set; } = 1;
        public DateTime SubmittedAt { get; set; } = PhilippineTime.Now;

        public DocumentSection? Section { get; set; }

        public bool IsAutoFinalized { get; set; } = false;

        public DocumentSubmissionStatus SubmissionStatus { get; set; } = DocumentSubmissionStatus.Draft;

        public int? OriginalDocumentId { get; set; }
        public DocumentSubmission? OriginalDocument { get; set; }

        public ICollection<DocumentComment> Comments { get; set; } = [];
    }
}
