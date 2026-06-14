using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Models
{
    public class SystemFeature
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public CapstoneGroup CapstoneGroup { get; set; } = null!;

        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public FeatureType FeatureType { get; set; }
        public SystemFeatureStatus Status { get; set; } = SystemFeatureStatus.NotStarted;
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public ICollection<SystemFeatureComment> Comments { get; set; } = [];
    }
}
