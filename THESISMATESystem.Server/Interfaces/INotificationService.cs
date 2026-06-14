using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Interfaces
{
    public interface INotificationService
    {
        Task SendAsync(string userId, string message, NotificationType type,
            int? groupId = null, int? defenseId = null, int? chapterId = null);
        Task SendToGroupMembersAsync(int groupId, string message, NotificationType type,
            int? chapterId = null, int? defenseId = null);
        Task<IEnumerable<NotificationResponseDto>> GetForUserAsync(string userId);
        Task<int> GetUnreadCountAsync(string userId);
        Task MarkAsReadAsync(int notificationId, string userId);
        Task MarkAllAsReadAsync(string userId);
    }
}
