using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface ISystemFeatureService
    {
        Task<SystemFeatureResponseDto> CreateFeatureAsync(string createdById, CreateSystemFeatureRequestDto dto);
        Task<IEnumerable<SystemFeatureResponseDto>> GetFeaturesByGroupAsync(int groupId);
        Task<SystemFeatureResponseDto?> GetFeatureByIdAsync(int id);
        Task<SystemFeatureResponseDto> UpdateFeatureAsync(int id, UpdateSystemFeatureRequestDto dto);
        Task<bool> DeleteFeatureAsync(int id);
        Task<SystemFeatureCommentResponseDto> AddCommentAsync(int featureId, string authorId, AddSystemFeatureCommentRequestDto dto);
        Task<IEnumerable<SystemFeatureCommentResponseDto>> GetCommentsAsync(int featureId);
    }
}
