using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class CreateSystemFeatureRequestDto
    {
        public int CapstoneGroupId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public FeatureType FeatureType { get; set; }
        public int SortOrder { get; set; }
    }

    public class UpdateSystemFeatureRequestDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public SystemFeatureStatus? Status { get; set; }
        public int? SortOrder { get; set; }
    }

    public class AddSystemFeatureCommentRequestDto
    {
        public string Content { get; set; } = string.Empty;
    }
}
