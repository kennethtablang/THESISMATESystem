using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Services
{
    public class GroupAccessChecker : IGroupAccessChecker
    {
        private readonly AppDbContext _db;

        public GroupAccessChecker(AppDbContext db) => _db = db;

        public async Task<bool> CanAccessGroupAsync(string userId, string role, int groupId)
        {
            if (role is "Admin" or "SuperAdmin") return true;

            if (role == "Faculty")
            {
                // Adviser assignment
                if (await _db.CapstoneGroups
                    .AnyAsync(g => g.Id == groupId && g.AdviserId == userId))
                    return true;

                // Panel assignment via defense schedule
                if (await _db.PanelAssignments
                    .AnyAsync(pa => pa.PanelistId == userId &&
                        pa.DefenseSchedule.CapstoneGroupId == groupId))
                    return true;

                // FacultyIC assignment via classroom enrollment of any group member
                var memberIds = await _db.GroupMembers
                    .Where(gm => gm.CapstoneGroupId == groupId)
                    .Select(gm => gm.UserId)
                    .ToListAsync();

                return await _db.ClassroomEnrollments
                    .AnyAsync(ce => memberIds.Contains(ce.StudentId) &&
                        ce.Classroom.FacultyICId == userId);
            }

            // Student — must be a group member
            return await _db.GroupMembers
                .AnyAsync(gm => gm.CapstoneGroupId == groupId && gm.UserId == userId);
        }
    }
}
