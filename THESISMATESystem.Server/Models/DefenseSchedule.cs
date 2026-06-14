using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class DefenseSchedule
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public CapstoneGroup CapstoneGroup { get; set; } = null!;

        public DateTime ScheduledDateTime { get; set; }
        public string Venue { get; set; } = string.Empty; // room or online link
        public DefenseStatus Status { get; set; } = DefenseStatus.Scheduled;
        public bool IsRatingOpen { get; set; } = false;
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;
        public DateTime? UpdatedAt { get; set; }

        public ICollection<PanelAssignment> PanelAssignments { get; set; } = [];
        public ICollection<DefenseRating> DefenseRatings { get; set; } = [];
    }
}
