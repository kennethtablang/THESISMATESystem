using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IGroupAccessChecker
    {
        /// <summary>
        /// True when the caller may view a group's submissions/files:
        /// Admin when the group belongs to a block they handle; Faculty when adviser, panelist, or Faculty-in-Charge
        /// of a classroom containing a group member; Student when a group member.
        /// </summary>
        Task<bool> CanAccessGroupAsync(string userId, string role, int groupId);

        /// <summary>
        /// Narrows a group query to the ones <see cref="CanAccessGroupAsync"/> would allow.
        /// Use this instead of re-deriving the rule when listing groups, so a per-group check
        /// and a list stay in agreement.
        /// </summary>
        IQueryable<CapstoneGroup> FilterAccessible(IQueryable<CapstoneGroup> groups, string userId, string role);

        /// <summary>The blocks (section ids) an Admin/subject teacher handles.</summary>
        Task<List<int>> HandledSectionIdsAsync(string adminId);
    }
}
