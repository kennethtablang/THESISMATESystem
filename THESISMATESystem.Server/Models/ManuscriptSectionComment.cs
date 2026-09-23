using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class ManuscriptSectionComment
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public CapstoneGroup CapstoneGroup { get; set; } = null!;
        public string SectionKey { get; set; } = string.Empty;
        public int Revision { get; set; }
        public string AuthorId { get; set; } = string.Empty;
        public ApplicationUser Author { get; set; } = null!;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;

        // Anchor for an in-text highlight left by an adviser/panelist. Null on older,
        // section-level comments. Field is the chapter sub-topic (Yjs fragment) the text is in;
        // Quote is the highlighted text and Prefix the text just before it, which together
        // locate the highlight again even after the students edit around it.
        public string? Field { get; set; }
        public string? Quote { get; set; }
        public string? Prefix { get; set; }
    }
}
