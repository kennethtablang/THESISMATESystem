using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class Classroom
    {
        public int Id { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public string JoinCode { get; set; } = string.Empty;  // 6-char uppercase alphanumeric, unique
        public string FacultyICId { get; set; } = string.Empty;
        public ApplicationUser FacultyIC { get; set; } = null!;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;
        public ICollection<ClassroomEnrollment> Enrollments { get; set; } = [];
        public ICollection<ClassroomAnnouncement> Announcements { get; set; } = [];
    }
}
