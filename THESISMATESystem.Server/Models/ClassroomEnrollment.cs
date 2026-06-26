using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class ClassroomEnrollment
    {
        public int Id { get; set; }
        public int ClassroomId { get; set; }
        public Classroom Classroom { get; set; } = null!;
        public string StudentId { get; set; } = string.Empty;
        public ApplicationUser Student { get; set; } = null!;
        public EnrollmentStatus Status { get; set; } = EnrollmentStatus.Active;
        public DateTime JoinedAt { get; set; } = PhilippineTime.Now;
    }
}
