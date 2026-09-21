using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Response
{
    public class ProposedDefenseDto
    {
        public int GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string? ProjectTitle { get; set; }
        public DateTime ScheduledDateTime { get; set; }
        public int DurationMinutes { get; set; }
        public string Venue { get; set; } = string.Empty;
        public DefensePhase Phase { get; set; }
        public List<string> PanelistIds { get; set; } = [];
        public List<string> PanelistNames { get; set; } = [];
        public string AdviserName { get; set; } = string.Empty;
    }

    public class UnscheduledGroupDto
    {
        public int GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
    }

    public class AutoScheduleProposalDto
    {
        public List<ProposedDefenseDto> Proposals { get; set; } = [];
        public List<UnscheduledGroupDto> Unscheduled { get; set; } = [];
        public int DaysUsed { get; set; }
        public int SlotsConsidered { get; set; }
    }

    public class AutoScheduleConfirmResultDto
    {
        public List<DefenseScheduleResponseDto> Created { get; set; } = [];
        public List<UnscheduledGroupDto> Failed { get; set; } = [];
    }
}
