using Microsoft.AspNetCore.Http;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IDocumentService
    {
        Task<DocumentSubmissionResponseDto> UploadDocumentAsync(string uploadedById, UploadDocumentRequestDto dto);
        Task<IEnumerable<DocumentSubmissionResponseDto>> GetDocumentsByGroupAsync(int groupId);
        Task<IEnumerable<DocumentSubmissionResponseDto>> GetDocumentsByAdviserAsync(string adviserId);
        Task<IEnumerable<DocumentSubmissionResponseDto>> GetAllDocumentsAsync();
        Task<DocumentSubmissionResponseDto?> GetDocumentByIdAsync(int id);
        Task<string> GetDownloadPathAsync(int id);
        Task<DocumentCommentResponseDto> AddCommentAsync(int documentId, string authorId, AddDocumentCommentRequestDto dto);
        Task<IEnumerable<DocumentCommentResponseDto>> GetCommentsAsync(int documentId);
        Task<bool> DeleteDocumentAsync(int id, string userId, string callerRole);
        Task<DocumentSubmissionResponseDto> UploadNewVersionAsync(int originalId, string uploadedById, IFormFile file);
        Task<IEnumerable<DocumentVersionDto>> GetVersionsAsync(int id, string callerId, string callerRole);
    }
}
