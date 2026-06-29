using System.ComponentModel.DataAnnotations;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class SetGroupDefenseOutcomeRequestDto
    {
        public DefenseOutcome? DefenseOutcome { get; set; }
        public RevisionLevel? RevisionLevel { get; set; }
        public bool? RequiresReDefense { get; set; }
    }


    public class CreateGroupRequestDto
    {
        [Required] public string GroupName { get; set; } = string.Empty;
        [Required] public string AdviserId { get; set; } = string.Empty;
        [Required] public string AcademicYear { get; set; } = string.Empty;
        public List<string> MemberIds { get; set; } = [];
    }

    public class UpdateGroupRequestDto
    {
        public string? GroupName { get; set; }
        public string? AdviserId { get; set; }
        public string? ProjectTitle { get; set; }
        public bool? TitleApproved { get; set; }
        public List<string>? MemberIds { get; set; }
    }

    public class UpdateVersionRequestDto
    {
        public string? ManuscriptVersion { get; set; }
        public string? SystemVersion { get; set; }
    }

    public class AddMemberRequestDto
    {
        [Required] public string UserId { get; set; } = string.Empty;
    }

    public class SetGroupDeadlinesRequestDto
    {
        public DateTime? ManuscriptDueDate { get; set; }
        public DateTime? SystemFeaturesDueDate { get; set; }
    }

    public class CreateGroupDeadlineRequestDto
    {
        [Required, MaxLength(200)] public string Title { get; set; } = string.Empty;
        [MaxLength(1000)]          public string? Description { get; set; }
        [Required]                 public DateTime DueDate { get; set; }
        public bool   PostAsAnnouncement { get; set; } = false;
        // "Group" = target group only; "Class" = entire classroom
        public string AnnouncementScope  { get; set; } = "Group";
    }

    public class UpdateGroupDeadlineRequestDto
    {
        [Required, MaxLength(200)] public string Title { get; set; } = string.Empty;
        [MaxLength(1000)]          public string? Description { get; set; }
        [Required]                 public DateTime DueDate { get; set; }
    }
}
