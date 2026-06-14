using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Models
{
    public class ConsultationSchedule
    {
        public int Id { get; set; }
        public string FacultyICId { get; set; } = string.Empty;
        public ApplicationUser FacultyIC { get; set; } = null!;

        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Location { get; set; } = string.Empty;
        public ConsultationMode Mode { get; set; } = ConsultationMode.InPerson;
        public DateTime ScheduledStartAt { get; set; }
        public DateTime ScheduledEndAt { get; set; }
        public int MaxGroups { get; set; } = 5;
        public ConsultationScheduleStatus Status { get; set; } = ConsultationScheduleStatus.Open;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ConsultationRequest> Requests { get; set; } = [];
    }
}
