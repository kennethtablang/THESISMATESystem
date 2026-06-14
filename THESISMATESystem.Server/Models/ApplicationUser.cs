using Microsoft.AspNetCore.Identity;

namespace THESISMATESystem.Server.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<GroupMember> GroupMemberships { get; set; } = [];
        public ICollection<CapstoneGroup> AdvisedGroups { get; set; } = [];
        public ICollection<PanelAssignment> PanelAssignments { get; set; } = [];
        public ICollection<ConsultationLog> ConsultationLogs { get; set; } = [];
        public ICollection<Notification> Notifications { get; set; } = [];
        public ICollection<AuditLog> AuditLogs { get; set; } = [];

        public ICollection<DocumentSubmission> DocumentSubmissions { get; set; } = [];
        public ICollection<DocumentComment> DocumentComments { get; set; } = [];
        public ICollection<SystemFeatureComment> SystemFeatureComments { get; set; } = [];
        public ICollection<ConsultationSchedule> ConsultationSchedules { get; set; } = [];
        public ICollection<ConsultationRequest> ConsultationRequests { get; set; } = [];
    }
}
