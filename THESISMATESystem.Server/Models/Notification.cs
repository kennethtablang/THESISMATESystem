using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Models
{
    public class Notification
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser User { get; set; } = null!;

        public string Message { get; set; } = string.Empty;
        public NotificationType Type { get; set; }
        public bool IsRead { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int? RelatedGroupId { get; set; }
        public int? RelatedDefenseId { get; set; }
        public int? RelatedChapterId { get; set; }
    }
}
