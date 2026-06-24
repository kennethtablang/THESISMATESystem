using System.ComponentModel.DataAnnotations;

namespace THESISMATESystem.Server.DTOs.Request
{
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
}
