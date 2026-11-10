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

        // The "approved" / "sent back for revisions" line posted with a reviewer's decision. It is
        // not something to revise, so it never counts as a revision item.
        public bool IsStatusNote { get; set; }

        // A highlight or comment from a reviewer who requested a revision on this version: one of
        // the items the students have to address ("2/10 revised"). The students tick it off once
        // done; the reviewer sees the same tick when the resubmission comes back.
        public bool IsRevisionItem { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string? ResolvedById { get; set; }
        public ApplicationUser? ResolvedBy { get; set; }

        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;
        public DateTime? UpdatedAt { get; set; }
    }
}
