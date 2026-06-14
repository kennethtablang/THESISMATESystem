using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class CreateConsultationScheduleRequestDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Location { get; set; } = string.Empty;
        public ConsultationMode Mode { get; set; } = ConsultationMode.InPerson;
        public DateTime ScheduledStartAt { get; set; }
        public DateTime ScheduledEndAt { get; set; }
        public int MaxGroups { get; set; } = 5;
    }

    public class UpdateConsultationScheduleRequestDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? Location { get; set; }
        public ConsultationMode? Mode { get; set; }
        public DateTime? ScheduledStartAt { get; set; }
        public DateTime? ScheduledEndAt { get; set; }
        public int? MaxGroups { get; set; }
    }

    public class UpdateScheduleStatusRequestDto
    {
        public ConsultationScheduleStatus Status { get; set; }
    }

    public class RequestConsultationSlotDto
    {
        public int ConsultationScheduleId { get; set; }
        public int CapstoneGroupId { get; set; }
        public string? Notes { get; set; }
    }

    public class RespondToConsultationRequestDto
    {
        public ConsultationRequestStatus Status { get; set; }
        public string? ResponseNotes { get; set; }
    }
}
