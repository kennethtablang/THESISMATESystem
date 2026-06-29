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
        private readonly IEmailService _email;
        private readonly IConfiguration _config;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(AppDbContext db, IMapper mapper, IEmailService email,
            IConfiguration config, ILogger<NotificationService> logger)
        {
            _db = db;
            _mapper = mapper;
            _email = email;
            _config = config;
            _logger = logger;
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

            _db.Notifications.AddRange(memberIds.Select(uid => new Notification
            {
                UserId = uid,
                Message = message,
                Type = type,
                RelatedGroupId = groupId,
                RelatedChapterId = chapterId,
                RelatedDefenseId = defenseId
            }));
            await _db.SaveChangesAsync();
        }

        public async Task SendSystemFeatureNotificationAsync(IEnumerable<string> recipientIds,
            string senderName, string featureName, string message, NotificationType type,
            int featureId, int groupId, string? commentContent = null)
        {
            var ids = recipientIds.ToList();
            if (ids.Count == 0) return;

            // Create in-app notifications for all recipients
            _db.Notifications.AddRange(ids.Select(uid => new Notification
            {
                UserId = uid,
                Message = message,
                Type = type,
                RelatedGroupId = groupId,
                RelatedSystemFeatureId = featureId,
            }));
            await _db.SaveChangesAsync();

            // Email users who have been inactive for more than 15 minutes
            var offlineThreshold = DateTime.UtcNow.AddMinutes(-15);
            var frontendUrl = _config["ClientBaseUrl"] ?? "https://localhost:62535";
            var trackerUrl = $"{frontendUrl}/system-features";

            var users = await _db.Users
                .Where(u => ids.Contains(u.Id))
                .Select(u => new { u.Id, u.Email, u.FirstName, u.LastName, u.LastActiveAt })
                .ToListAsync();

            var subject = type == NotificationType.SystemFeatureCommented
                ? $"[ThesisMate] New comment on: {featureName}"
                : $"[ThesisMate] Feature update: {featureName}";

            foreach (var user in users)
            {
                if (user.Email is null) continue;
                if (user.LastActiveAt is not null && user.LastActiveAt > offlineThreshold) continue;

                var body = BuildEmailBody(
                    $"{user.FirstName} {user.LastName}",
                    senderName,
                    featureName,
                    message,
                    commentContent,
                    trackerUrl);

                var emailCopy = user.Email;
                _ = _email.SendEmailAsync(emailCopy, subject, body)
                    .ContinueWith(t => _logger.LogWarning(t.Exception,
                        "Failed to send system-feature notification email to {Email}", emailCopy),
                        TaskContinuationOptions.OnlyOnFaulted);
            }
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
            => await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

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

        private static string BuildEmailBody(string recipientName, string senderName,
            string featureName, string message, string? commentContent, string trackerUrl)
        {
            var commentBlock = commentContent is not null
                ? $"""
                  <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #c9a84c;
                      background:#fffbf0;border-radius:4px;color:#374151;font-size:14px;font-style:italic">
                    {System.Net.WebUtility.HtmlEncode(commentContent)}
                  </blockquote>
                  """
                : string.Empty;

            return $"""
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td align="center" style="padding:32px 16px">
                      <table width="100%" style="max-width:540px">
                        <tr><td style="background:linear-gradient(135deg,#0a1628,#162544);border-radius:12px 12px 0 0;padding:24px 32px">
                          <h1 style="margin:0;color:#c9a84c;font-size:22px;font-weight:700;letter-spacing:-0.5px">ThesisMate</h1>
                          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px">Capstone Management System — PSU Lingayen</p>
                        </td></tr>
                        <tr><td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
                          <p style="margin:0 0 8px;color:#374151;font-size:15px">Hi <strong>{System.Net.WebUtility.HtmlEncode(recipientName)}</strong>,</p>
                          <p style="margin:0 0 8px;color:#374151;font-size:15px">
                            <strong>{System.Net.WebUtility.HtmlEncode(senderName)}</strong> updated
                            <strong>"{System.Net.WebUtility.HtmlEncode(featureName)}"</strong>:
                          </p>
                          <p style="margin:0 0 4px;color:#374151;font-size:14px">{System.Net.WebUtility.HtmlEncode(message)}</p>
                          {commentBlock}
                          <p style="margin:24px 0 0">
                            <a href="{trackerUrl}"
                               style="display:inline-block;background:#c9a84c;color:#0a1628;text-decoration:none;
                                      padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px">
                              View in ThesisMate →
                            </a>
                          </p>
                          <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 20px">
                          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6">
                            You received this because you are a member or adviser of this capstone group.<br>
                            Log in to ThesisMate to see all activity.
                          </p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """;
        }
    }
}
