using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Models
{
    public class ConsultationRequest
    {
        public int Id { get; set; }
        public int ConsultationScheduleId { get; set; }
        public ConsultationSchedule ConsultationSchedule { get; set; } = null!;

        public int CapstoneGroupId { get; set; }
        public CapstoneGroup CapstoneGroup { get; set; } = null!;

        public string RequestedById { get; set; } = string.Empty;
        public ApplicationUser RequestedBy { get; set; } = null!;

        public ConsultationRequestStatus Status { get; set; } = ConsultationRequestStatus.Pending;
        public string? Notes { get; set; }
        public string? ResponseNotes { get; set; }
        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        public DateTime? RespondedAt { get; set; }
    }
}
