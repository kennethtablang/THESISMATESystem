using System.ComponentModel.DataAnnotations;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class CreateClassroomRequestDto
    {
        [Required] public string ClassName { get; set; } = string.Empty;
        [Required] public string AcademicYear { get; set; } = string.Empty;
        // The section the class is offered to, and the faculty member teaching it.
        [Required, Range(1, int.MaxValue, ErrorMessage = "Select a block/section.")]
        public int SectionId { get; set; }
        [Required(ErrorMessage = "Select the subject teacher.")]
        public string FacultyId { get; set; } = string.Empty;
    }

    public class JoinClassroomRequestDto
    {
        [Required] public string JoinCode { get; set; } = string.Empty;
    }

    public class PostAnnouncementRequestDto
    {
        [Required] public string Title { get; set; } = string.Empty;
        [Required] public string Content { get; set; } = string.Empty;
        public int? TargetGroupId { get; set; }
    }

    public class AssignStudentsToGroupRequestDto
    {
        [Required] public int GroupId { get; set; }
        [Required] public List<string> StudentIds { get; set; } = [];
    }

    public class InviteStudentsRequestDto
    {
        [Required] public List<string> StudentIds { get; set; } = [];
    }

    public class CreateGroupInClassroomRequestDto
    {
        [Required] public string GroupName { get; set; } = string.Empty;
        [Required] public string AdviserId { get; set; } = string.Empty;
        public List<string> MemberIds { get; set; } = [];
        [MinLength(1, ErrorMessage = "Select at least one panel member.")]
        public List<string> PanelistIds { get; set; } = [];
        public string? PanelChairId { get; set; }
    }
}
