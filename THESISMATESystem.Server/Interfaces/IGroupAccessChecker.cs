using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IGroupAccessChecker
    {
        /// <summary>
        /// True when the caller may view a group's submissions/files:
        /// Admin/SuperAdmin always; Faculty when adviser, panelist, or Faculty-in-Charge
        /// of a classroom containing a group member; Student when a group member.
        /// </summary>
        Task<bool> CanAccessGroupAsync(string userId, string role, int groupId);

        /// <summary>
        /// Narrows a group query to the ones <see cref="CanAccessGroupAsync"/> would allow.
        /// Use this instead of re-deriving the rule when listing groups, so a per-group check
        /// and a list stay in agreement.
        /// </summary>
        IQueryable<CapstoneGroup> FilterAccessible(IQueryable<CapstoneGroup> groups, string userId, string role);
    }
}
