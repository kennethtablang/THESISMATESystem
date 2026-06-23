namespace THESISMATESystem.Server.DTOs.Response
{
    public class ClassroomResponseDto
    {
        public int Id { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public string JoinCode { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public UserSummaryDto FacultyIC { get; set; } = null!;
        public int EnrollmentCount { get; set; }
    }

    public class ClassroomEnrollmentResponseDto
    {
        public int Id { get; set; }
        public UserSummaryDto Student { get; set; } = null!;
        public DateTime JoinedAt { get; set; }
        public int? GroupId { get; set; }
        public string? GroupName { get; set; }
    }

    public class AnnouncementResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public int? TargetGroupId { get; set; }
        public string? TargetGroupName { get; set; }
        public UserSummaryDto PostedBy { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public bool IsClassWide => TargetGroupId == null;
    }
}
