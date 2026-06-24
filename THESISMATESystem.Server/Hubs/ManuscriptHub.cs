using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Hubs
{
    [Authorize]
    public class ManuscriptHub : Hub
    {
        private static readonly Dictionary<string, List<string>> _pendingUpdates = new();
        private static readonly object _lock = new();

        private static readonly HashSet<string> _validSectionKeys =
            ["chapter1", "chapter2", "chapter3", "chapter4", "chapter5", "references"];

        private readonly IServiceScopeFactory _scopeFactory;

        public ManuscriptHub(IServiceScopeFactory scopeFactory) => _scopeFactory = scopeFactory;

        public async Task JoinSection(int groupId, string sectionKey)
        {
            await RequireGroupAccessAsync(groupId, sectionKey);

            var roomKey = RoomKey(groupId, sectionKey);
            await Groups.AddToGroupAsync(Context.ConnectionId, roomKey);

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var section = await db.ManuscriptSections
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.CapstoneGroupId == groupId && s.SectionKey == sectionKey);

            if (section?.YjsState != null)
                await Clients.Caller.SendAsync("ReceiveFullState", Convert.ToBase64String(section.YjsState));

            List<string> pending;
            lock (_lock)
            {
                _pendingUpdates.TryGetValue(roomKey, out var q);
                pending = q != null ? [.. q] : [];
            }

            foreach (var update in pending)
                await Clients.Caller.SendAsync("ReceiveDocUpdate", update);
        }

        public async Task LeaveSection(int groupId, string sectionKey)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, RoomKey(groupId, sectionKey));
        }

        public async Task SendDocUpdate(int groupId, string sectionKey, string base64Update)
        {
            // Only students who belong to this group may push updates
            await RequireStudentInGroupAsync(groupId, sectionKey);

            var roomKey = RoomKey(groupId, sectionKey);
            lock (_lock)
            {
                if (!_pendingUpdates.TryGetValue(roomKey, out var list))
                    _pendingUpdates[roomKey] = list = [];
                list.Add(base64Update);
            }
            await Clients.OthersInGroup(roomKey).SendAsync("ReceiveDocUpdate", base64Update);
        }

        public async Task SendAwareness(int groupId, string sectionKey, string base64Update)
        {
            await RequireGroupAccessAsync(groupId, sectionKey);
            await Clients.OthersInGroup(RoomKey(groupId, sectionKey)).SendAsync("ReceiveAwareness", base64Update);
        }

        public Task AckSave(int groupId, string sectionKey)
        {
            // AckSave is low-risk (only clears in-memory queue), but still gate it
            var userId = UserId();
            if (string.IsNullOrEmpty(userId)) throw new HubException("Unauthorized.");

            var roomKey = RoomKey(groupId, sectionKey);
            lock (_lock) { _pendingUpdates.Remove(roomKey); }
            return Task.CompletedTask;
        }

        // ── Auth helpers ──────────────────────────────────────────────────────

        /// <summary>Allows any role that has read access to the group (Adviser, Panel, FIC, Admin, or group member Student).</summary>
        private async Task RequireGroupAccessAsync(int groupId, string sectionKey)
        {
            ValidateSectionKey(sectionKey);

            var userId = UserId();
            var role = UserRole();
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(role))
                throw new HubException("Unauthorized.");

            if (role is "Admin" or "SuperAdmin") return;

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            bool authorized = role switch
            {
                "Adviser" => await db.CapstoneGroups
                    .AnyAsync(g => g.Id == groupId && g.AdviserId == userId),

                "Panel" => await db.PanelAssignments
                    .AnyAsync(pa => pa.PanelistId == userId &&
                        pa.DefenseSchedule.CapstoneGroupId == groupId),

                "FacultyIC" => await db.ClassroomEnrollments
                    .AnyAsync(ce => ce.Classroom.FacultyICId == userId &&
                        ce.StudentId != null &&
                        db.GroupMembers.Any(gm => gm.CapstoneGroupId == groupId && gm.UserId == ce.StudentId)),

                "Student" => await db.GroupMembers
                    .AnyAsync(gm => gm.CapstoneGroupId == groupId &&
                        gm.UserId == userId &&
                        gm.CapstoneGroup.Status == GroupStatus.Active),

                _ => false
            };

            if (!authorized) throw new HubException("Not authorized for this group.");
        }

        /// <summary>Only students who are active members of this group may send document updates.</summary>
        private async Task RequireStudentInGroupAsync(int groupId, string sectionKey)
        {
            ValidateSectionKey(sectionKey);

            var userId = UserId();
            var role = UserRole();
            if (string.IsNullOrEmpty(userId) || role != "Student")
                throw new HubException("Only group members may send document updates.");

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var isMember = await db.GroupMembers
                .AnyAsync(gm => gm.CapstoneGroupId == groupId &&
                    gm.UserId == userId &&
                    gm.CapstoneGroup.Status == GroupStatus.Active);

            if (!isMember) throw new HubException("Not authorized for this group.");

            // Also check the manuscript is not locked
            var isLocked = await db.CapstoneGroups
                .Where(g => g.Id == groupId)
                .Select(g => g.ManuscriptLocked)
                .FirstOrDefaultAsync();

            if (isLocked) throw new HubException("The manuscript is locked and cannot be edited.");
        }

        private static void ValidateSectionKey(string sectionKey)
        {
            if (!_validSectionKeys.Contains(sectionKey?.ToLower() ?? ""))
                throw new HubException($"Invalid section key: {sectionKey}");
        }

        private static string RoomKey(int groupId, string sectionKey) => $"{groupId}-{sectionKey}";
        private string? UserId() => Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        private string? UserRole() => Context.User?.FindFirstValue(ClaimTypes.Role);
    }
}
