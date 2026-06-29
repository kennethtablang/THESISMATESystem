using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class SystemFeatureScreenshot
    {
        public int Id { get; set; }
        public int SystemFeatureId { get; set; }
        public SystemFeature SystemFeature { get; set; } = null!;
        public string Path { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; } = PhilippineTime.Now;
    }
}
