using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class ManuscriptSection
    {
        public int Id { get; set; }

        public int CapstoneGroupId { get; set; }
        public CapstoneGroup CapstoneGroup { get; set; } = null!;

        // "chapter1" | "chapter2" | "chapter3" | "chapter4" | "chapter5" | "references"
        public string SectionKey { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;
        public int WordCount { get; set; }

        public DateTime UpdatedAt { get; set; } = PhilippineTime.Now;

        public string UpdatedById { get; set; } = string.Empty;
        public ApplicationUser UpdatedBy { get; set; } = null!;

        // Yjs CRDT binary state for real-time collaboration
        public byte[]? YjsState { get; set; }
    }
}
