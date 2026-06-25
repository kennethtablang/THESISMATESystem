using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IConsultationService
    {
        Task<ConsultationLogResponseDto> CreateConsultationAsync(string adviserId, CreateConsultationRequestDto dto);
        Task<IEnumerable<ConsultationLogResponseDto>> GetConsultationsByGroupAsync(int groupId);
        Task<IEnumerable<ConsultationLogResponseDto>> GetConsultationsForUserAsync(string userId, string role);
        Task<ConsultationLogResponseDto?> GetConsultationByIdAsync(int id);
        Task<ConsultationLogResponseDto> UpdateConsultationAsync(int id, string adviserId, UpdateConsultationRequestDto dto);
        Task<bool> DeleteConsultationAsync(int id, string adviserId);
    }
}
