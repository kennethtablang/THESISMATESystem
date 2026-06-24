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
    }
}
