using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class AuditLog
    {
        public int Id { get; set; }
        public string? UserId { get; set; }            // null for failed logins with unknown email
        public ApplicationUser? User { get; set; }

        public string Action { get; set; } = string.Empty;
        public string EntityName { get; set; } = string.Empty;
        public string? EntityId { get; set; }           // email address for login events
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public bool Success { get; set; } = true;
        public DateTime Timestamp { get; set; } = PhilippineTime.Now;
        public string? IpAddress { get; set; }
    }
}
