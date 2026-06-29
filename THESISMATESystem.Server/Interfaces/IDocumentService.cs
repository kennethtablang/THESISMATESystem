using Microsoft.AspNetCore.Http;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;

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
        Task<DocumentSubmissionResponseDto> FinalizeChapterToDocumentAsync(int groupId, int chapterNumber, string userId);
        Task<DocumentSubmissionResponseDto> FinalizeSectionToDocumentAsync(int groupId, string sectionKey, string userId, IFormFile file);
        Task<DocumentSubmissionResponseDto> SubmitForReviewAsync(int documentId, string userId);
        Task<DocumentSubmissionResponseDto> UpdateDocumentStatusAsync(int documentId, string callerId, string callerRole, DocumentSubmissionStatus newStatus);
    }
}
