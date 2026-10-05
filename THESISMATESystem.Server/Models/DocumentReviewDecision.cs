using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    /// <summary>
    /// One reviewer's standing on a document chain — the group's adviser and every member of its
    /// standing panel each get a row when the students submit. Keyed by the chain root, so an
    /// approval carries over to later versions: a resubmission only goes back to the reviewers
    /// whose row says <see cref="DocumentReviewStatus.NeedsRevision"/>.
    /// The chain's <see cref="DocumentSubmission.SubmissionStatus"/> is derived from these rows.
    /// </summary>
    public class DocumentReviewDecision
    {
        public int Id { get; set; }

        // Always the chain root (OriginalDocumentId ?? Id).
        public int DocumentSubmissionId { get; set; }
        public DocumentSubmission DocumentSubmission { get; set; } = null!;

        public string ReviewerId { get; set; } = string.Empty;
        public ApplicationUser Reviewer { get; set; } = null!;

        public DocumentReviewStatus Status { get; set; } = DocumentReviewStatus.Pending;

        // The chain version the reviewer was asked about / decided on.
        public int ReviewedVersion { get; set; }
        public DateTime RequestedAt { get; set; } = PhilippineTime.Now;
        public DateTime? DecidedAt { get; set; }
    }
}
