using Microsoft.AspNetCore.Identity;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        public string LastName { get; set; } = string.Empty;
        public string? StudentId { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;
        public DateTime? LastActiveAt { get; set; }

        // Block/section the student belongs to. Null for staff accounts.
        public int? SectionId { get; set; }
        public Section? Section { get; set; }

        // Self-registration approval. Pending accounts cannot sign in and are removed once
        // RegistrationExpiresAt passes without an Admin decision.
        public RegistrationStatus RegistrationStatus { get; set; } = RegistrationStatus.Approved;
        public DateTime? RegistrationExpiresAt { get; set; }
        public string? ReviewedById { get; set; }
        public DateTime? ReviewedAt { get; set; }

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
        public ICollection<ClassroomEnrollment> ClassroomEnrollments { get; set; } = [];
    }
}
