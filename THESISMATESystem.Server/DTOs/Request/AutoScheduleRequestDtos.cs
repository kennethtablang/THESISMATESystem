using System.ComponentModel.DataAnnotations;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class AutoScheduleRequestDto
    {
        [Required] public DefensePhase Phase { get; set; }

        // Groups to schedule. Empty means every active group without a defense for this phase.
        public List<int> GroupIds { get; set; } = [];

        // Calendar dates in Philippine time, "yyyy-MM-dd".
        [Required] public DateOnly StartDate { get; set; }
        [Required] public DateOnly EndDate { get; set; }

        // Daily window in Philippine time, "HH:mm". Must sit inside 6:00 AM – 7:00 PM.
        [Required] public string DayStart { get; set; } = "08:00";
        [Required] public string DayEnd { get; set; } = "17:00";

        [Range(15, 480)] public int DurationMinutes { get; set; } = 60;
        [Range(0, 120)]  public int BreakMinutes { get; set; } = 15;

        [Required, MinLength(1, ErrorMessage = "Add at least one venue.")]
        public List<string> Venues { get; set; } = [];

        public bool SkipWeekends { get; set; } = true;
        [Range(1, 12)] public int MaxDefensesPerFacultyPerDay { get; set; } = 4;

        // Leave out groups that have not reached the milestone the phase needs
        // (3 approved chapters for Proposal, all 5 for Final).
        public bool RequireReadiness { get; set; } = true;
    }

    public class ConfirmAutoScheduleItemDto
    {
        [Required] public int GroupId { get; set; }
        [Required] public DateTime ScheduledDateTime { get; set; }
        [Range(15, 480)] public int DurationMinutes { get; set; } = 60;
        [Required] public string Venue { get; set; } = string.Empty;
        [Required] public DefensePhase Phase { get; set; }
        public List<string> PanelistIds { get; set; } = [];
    }

    public class ConfirmAutoScheduleRequestDto
    {
        [Required, MinLength(1)] public List<ConfirmAutoScheduleItemDto> Items { get; set; } = [];
    }
}
