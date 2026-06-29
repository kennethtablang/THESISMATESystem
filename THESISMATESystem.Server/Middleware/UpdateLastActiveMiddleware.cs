using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using System.Security.Claims;
using THESISMATESystem.Server.Data;

namespace THESISMATESystem.Server.Middleware
{
    public class UpdateLastActiveMiddleware(RequestDelegate next, IServiceScopeFactory scopeFactory,
        ILogger<UpdateLastActiveMiddleware> logger)
    {
        // In-memory debounce: avoid hitting the DB on every single request
        private static readonly ConcurrentDictionary<string, DateTime> _cache = new();

        public async Task InvokeAsync(HttpContext context)
        {
            await next(context);

            if (context.User.Identity?.IsAuthenticated != true) return;
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return;

            var now = DateTime.UtcNow;
            if (_cache.TryGetValue(userId, out var last) && last > now.AddMinutes(-5)) return;
            _cache[userId] = now;

            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    await db.Users
                        .Where(u => u.Id == userId)
                        .ExecuteUpdateAsync(s => s.SetProperty(u => u.LastActiveAt, now));
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to update LastActiveAt for {UserId}", userId);
                }
            });
        }
    }
}
