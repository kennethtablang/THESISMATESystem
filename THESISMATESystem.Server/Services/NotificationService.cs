using AutoMapper;
using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Interfaces;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Services
{
    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _db;
        private readonly IMapper _mapper;

        public NotificationService(AppDbContext db, IMapper mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task SendAsync(string userId, string message, NotificationType type,
            int? groupId = null, int? defenseId = null, int? chapterId = null)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = userId,
                Message = message,
                Type = type,
                RelatedGroupId = groupId,
                RelatedDefenseId = defenseId,
                RelatedChapterId = chapterId
            });
            await _db.SaveChangesAsync();
        }

        public async Task SendToGroupMembersAsync(int groupId, string message, NotificationType type,
            int? chapterId = null, int? defenseId = null)
        {
            var memberIds = await _db.GroupMembers
                .Where(gm => gm.CapstoneGroupId == groupId)
                .Select(gm => gm.UserId)
                .ToListAsync();

            var notifications = memberIds.Select(uid => new Notification
            {
                UserId = uid,
                Message = message,
                Type = type,
                RelatedGroupId = groupId,
                RelatedChapterId = chapterId,
                RelatedDefenseId = defenseId
            });

            _db.Notifications.AddRange(notifications);
            await _db.SaveChangesAsync();
        }

        public async Task<IEnumerable<NotificationResponseDto>> GetForUserAsync(string userId)
        {
            var notifications = await _db.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return _mapper.Map<IEnumerable<NotificationResponseDto>>(notifications);
        }

        public async Task<int> GetUnreadCountAsync(string userId)
        {
            return await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
        }

        public async Task MarkAsReadAsync(int notificationId, string userId)
        {
            var notification = await _db.Notifications
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

            if (notification is null) return;
            notification.IsRead = true;
            await _db.SaveChangesAsync();
        }

        public async Task MarkAllAsReadAsync(string userId)
        {
            await _db.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        }
    }
}
