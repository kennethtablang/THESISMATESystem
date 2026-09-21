using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    /// <summary>
    /// A faculty member on a group's standing panel, set when the Admin creates the group.
    /// Defense schedules default their panel to these members, and panelists can monitor the
    /// group from creation instead of only after a defense is scheduled.
    /// </summary>
    public class GroupPanelMember
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public CapstoneGroup CapstoneGroup { get; set; } = null!;

        public string PanelistId { get; set; } = string.Empty;
        public ApplicationUser Panelist { get; set; } = null!;

        public bool IsChair { get; set; }
        public DateTime AssignedAt { get; set; } = PhilippineTime.Now;
    }
}
