using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class PanelAssignment
    {
        public int Id { get; set; }
        public int DefenseScheduleId { get; set; }
        public DefenseSchedule DefenseSchedule { get; set; } = null!;

        public string PanelistId { get; set; } = string.Empty;
        public ApplicationUser Panelist { get; set; } = null!;

        public DateTime AssignedAt { get; set; } = PhilippineTime.Now;
    }
}
