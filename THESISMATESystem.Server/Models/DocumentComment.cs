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
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;
        public DateTime? UpdatedAt { get; set; }
    }
}
