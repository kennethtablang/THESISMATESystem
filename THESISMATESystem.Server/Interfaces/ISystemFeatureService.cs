using Microsoft.AspNetCore.Http;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface ISystemFeatureService
    {
        Task<SystemFeatureResponseDto> CreateFeatureAsync(string createdById, CreateSystemFeatureRequestDto dto);
        Task<IEnumerable<SystemFeatureResponseDto>> GetFeaturesByGroupAsync(int groupId);
        Task<SystemFeatureResponseDto?> GetFeatureByIdAsync(int id);
        Task<SystemFeatureResponseDto> UpdateFeatureAsync(int id, string updatedById, UpdateSystemFeatureRequestDto dto);
        Task<bool> DeleteFeatureAsync(int id);
        Task<SystemFeatureCommentResponseDto> AddCommentAsync(int featureId, string authorId, AddSystemFeatureCommentRequestDto dto);
        Task<IEnumerable<SystemFeatureCommentResponseDto>> GetCommentsAsync(int featureId);
        Task<bool> DeleteCommentAsync(int commentId, string userId);
        Task<SystemFeatureResponseDto> SubmitStudentTestAsync(int featureId, string userId, SubmitStudentTestRequestDto dto);
        Task<SystemFeatureResponseDto> UploadScreenshotAsync(int featureId, string userId, IFormFile file, string webRootPath);
    }
}
