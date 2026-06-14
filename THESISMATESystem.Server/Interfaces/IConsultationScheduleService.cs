using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IConsultationScheduleService
    {
        Task<ConsultationScheduleResponseDto> CreateScheduleAsync(string facultyICId, CreateConsultationScheduleRequestDto dto);
        Task<IEnumerable<ConsultationScheduleResponseDto>> GetAllSchedulesAsync();
        Task<IEnumerable<ConsultationScheduleResponseDto>> GetSchedulesByFacultyICAsync(string facultyICId);
        Task<ConsultationScheduleResponseDto?> GetScheduleByIdAsync(int id);
        Task<ConsultationScheduleResponseDto> UpdateScheduleAsync(int id, string facultyICId, UpdateConsultationScheduleRequestDto dto);
        Task<bool> UpdateScheduleStatusAsync(int id, UpdateScheduleStatusRequestDto dto);
        Task<ConsultationRequestResponseDto> RequestSlotAsync(string requestedById, RequestConsultationSlotDto dto);
        Task<IEnumerable<ConsultationRequestResponseDto>> GetRequestsByScheduleAsync(int scheduleId);
        Task<IEnumerable<ConsultationRequestResponseDto>> GetMyRequestsAsync(int groupId);
        Task<ConsultationRequestResponseDto> RespondToRequestAsync(int requestId, string facultyICId, RespondToConsultationRequestDto dto);
    }
}
