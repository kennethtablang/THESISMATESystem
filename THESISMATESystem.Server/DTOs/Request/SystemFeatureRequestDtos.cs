using System.ComponentModel.DataAnnotations;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class CreateSystemFeatureRequestDto
    {
        public int CapstoneGroupId { get; set; }
        [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
        [MaxLength(4000)] public string Description { get; set; } = string.Empty;
        public FeatureType FeatureType { get; set; }
        public int SortOrder { get; set; }
    }

    public class UpdateSystemFeatureRequestDto
    {
        [MaxLength(200)] public string? Name { get; set; }
        [MaxLength(4000)] public string? Description { get; set; }
        public SystemFeatureStatus? Status { get; set; }
        public FeatureUrgency? Urgency { get; set; }
        public int? SortOrder { get; set; }
        public DateTime? PlannedStartDate { get; set; }
        public DateTime? PlannedEndDate { get; set; }
        public DateTime? ActualStartDate { get; set; }
        public DateTime? ActualEndDate { get; set; }
    }

    public class AddSystemFeatureCommentRequestDto
    {
        [Required, MaxLength(4000)] public string Content { get; set; } = string.Empty;
    }

    public class SubmitStudentTestRequestDto
    {
        public StudentTestStatus TestStatus { get; set; }
        [MaxLength(4000)] public string? Note { get; set; }
    }
}
