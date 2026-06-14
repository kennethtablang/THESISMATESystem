using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Response
{
    public class ConsultationScheduleResponseDto
    {
        public int Id { get; set; }
        public UserSummaryDto FacultyIC { get; set; } = null!;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Location { get; set; } = string.Empty;
        public ConsultationMode Mode { get; set; }
        public string ModeLabel { get; set; } = string.Empty;
        public DateTime ScheduledStartAt { get; set; }
        public DateTime ScheduledEndAt { get; set; }
        public int MaxGroups { get; set; }
        public int ApprovedCount { get; set; }
        public ConsultationScheduleStatus Status { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class ConsultationRequestResponseDto
    {
        public int Id { get; set; }
        public int ConsultationScheduleId { get; set; }
        public string ScheduleTitle { get; set; } = string.Empty;
        public DateTime ScheduledStartAt { get; set; }
        public int CapstoneGroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public UserSummaryDto RequestedBy { get; set; } = null!;
        public ConsultationRequestStatus Status { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string? ResponseNotes { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime? RespondedAt { get; set; }
    }
}
