using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;

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
        public DateTime? PlannedStartDate { get; set; }
        public DateTime? PlannedEndDate { get; set; }
        public DateTime? ActualStartDate { get; set; }
        public DateTime? ActualEndDate { get; set; }
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;
        public DateTime? UpdatedAt { get; set; }

        public FeatureUrgency Urgency { get; set; } = FeatureUrgency.Low;

        public StudentTestStatus StudentTestStatus { get; set; } = StudentTestStatus.NotTested;
        public string? StudentTestNote { get; set; }
        public DateTime? StudentTestedAt { get; set; }

        public ICollection<SystemFeatureComment> Comments { get; set; } = [];
        public ICollection<SystemFeatureScreenshot> Screenshots { get; set; } = [];
    }
}
