using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Models
{
    public class CapstoneGroup
    {
        public int Id { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string? ProjectTitle { get; set; }
        public bool TitleApproved { get; set; } = false;
        public string AcademicYear { get; set; } = string.Empty;
        public GroupStatus Status { get; set; } = GroupStatus.Active;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string AdviserId { get; set; } = string.Empty;
        public ApplicationUser Adviser { get; set; } = null!;

        public ICollection<GroupMember> Members { get; set; } = [];
        public ICollection<ChapterSubmission> ChapterSubmissions { get; set; } = [];
        public ICollection<ConsultationLog> ConsultationLogs { get; set; } = [];
        public ICollection<DefenseSchedule> DefenseSchedules { get; set; } = [];
    }
}
