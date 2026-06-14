using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class AuditLog
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser User { get; set; } = null!;

        public string Action { get; set; } = string.Empty;
        public string EntityName { get; set; } = string.Empty;
        public string? EntityId { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public bool Success { get; set; } = true;
        public DateTime Timestamp { get; set; } = PhilippineTime.Now;
        public string? IpAddress { get; set; }
    }
}
