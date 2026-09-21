using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.Interfaces;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Services
{
    public class GroupAccessChecker : IGroupAccessChecker
    {
        private readonly AppDbContext _db;

        public GroupAccessChecker(AppDbContext db) => _db = db;

        public async Task<bool> CanAccessGroupAsync(string userId, string role, int groupId)
        {
            if (role is "Admin" or "SuperAdmin") return true;

            return await _db.CapstoneGroups
                .Where(g => g.Id == groupId)
                .AnyAsync(AccessPredicate(userId, role));
        }

        public IQueryable<CapstoneGroup> FilterAccessible(
            IQueryable<CapstoneGroup> groups, string userId, string role)
            => role is "Admin" or "SuperAdmin"
                ? groups
                : groups.Where(AccessPredicate(userId, role));

        /// <summary>
        /// The single definition of "may see this group", shared by the per-group check and the
        /// list filter so the two can never drift apart. Admin/SuperAdmin are handled by the
        /// callers above and never reach here.
        /// </summary>
        private Expression<Func<CapstoneGroup, bool>> AccessPredicate(string userId, string role)
        {
            if (role == "Faculty")
            {
                return g =>
                    // Adviser assignment
                    g.AdviserId == userId
                    // Standing panel set when the group was created
                    || _db.GroupPanelMembers.Any(p =>
                        p.CapstoneGroupId == g.Id && p.PanelistId == userId)
                    // Panel assignment via defense schedule
                    || _db.PanelAssignments.Any(pa =>
                        pa.PanelistId == userId &&
                        pa.DefenseSchedule.CapstoneGroupId == g.Id)
                    // FacultyIC assignment via classroom enrollment of any group member
                    || _db.GroupMembers.Any(gm =>
                        gm.CapstoneGroupId == g.Id &&
                        _db.ClassroomEnrollments.Any(ce =>
                            ce.StudentId == gm.UserId &&
                            ce.Classroom.FacultyICId == userId));
            }

            // Student — must be a group member
            return g => _db.GroupMembers.Any(gm =>
                gm.CapstoneGroupId == g.Id && gm.UserId == userId);
        }
    }
}
