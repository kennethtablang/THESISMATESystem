using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;

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
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;
        public string? ManuscriptVersion { get; set; }
        public string? SystemVersion { get; set; }
        public bool ManuscriptLocked { get; set; } = false;
        public int ManuscriptRevision { get; set; } = 1;

        public string AdviserId { get; set; } = string.Empty;
        public ApplicationUser Adviser { get; set; } = null!;

        public ICollection<GroupMember> Members { get; set; } = [];
        public ICollection<ChapterSubmission> ChapterSubmissions { get; set; } = [];
        public ICollection<ConsultationLog> ConsultationLogs { get; set; } = [];
        public ICollection<DefenseSchedule> DefenseSchedules { get; set; } = [];
    }
}
