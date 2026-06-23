using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class ClassroomAnnouncement
    {
        public int Id { get; set; }
        public int ClassroomId { get; set; }
        public Classroom Classroom { get; set; } = null!;
        public int? TargetGroupId { get; set; }  // null = class-wide
        public CapstoneGroup? TargetGroup { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string PostedById { get; set; } = string.Empty;
        public ApplicationUser PostedBy { get; set; } = null!;
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;
    }
}
