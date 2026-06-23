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
        public DateTime JoinedAt { get; set; } = PhilippineTime.Now;
    }
}
