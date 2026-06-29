using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class SystemFeatureComment
    {
        public int Id { get; set; }
        public int SystemFeatureId { get; set; }
        public SystemFeature SystemFeature { get; set; } = null!;

        public string AuthorId { get; set; } = string.Empty;
        public ApplicationUser Author { get; set; } = null!;

        public string Content { get; set; } = string.Empty;
        public bool IsSystemComment { get; set; }
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;
    }
}
