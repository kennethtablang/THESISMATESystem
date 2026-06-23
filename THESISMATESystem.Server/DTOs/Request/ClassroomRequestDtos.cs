using System.ComponentModel.DataAnnotations;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class CreateClassroomRequestDto
    {
        [Required] public string ClassName { get; set; } = string.Empty;
        [Required] public string AcademicYear { get; set; } = string.Empty;
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
}
