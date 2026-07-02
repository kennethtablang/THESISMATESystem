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
    }
}
