using Microsoft.AspNetCore.Http;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IManuscriptService
    {
        Task<IEnumerable<ManuscriptSectionResponseDto>> GetSectionsAsync(int groupId);
        Task<IEnumerable<ManuscriptSectionResponseDto>?> GetSectionsByStudentAsync(string studentId);
        Task<ManuscriptSectionResponseDto> SaveSectionAsync(string studentId, string sectionKey, SaveSectionRequestDto dto);
        Task<bool> IsAuthorizedForGroupAsync(string userId, string role, int groupId);

        // Finalization voting
        Task<ManuscriptVoteStatusDto> GetVoteStatusAsync(string studentId);
        Task<ManuscriptVoteStatusDto> CastVoteAsync(string studentId);
        Task<ManuscriptVoteStatusDto> RevokeVoteAsync(string studentId);

        // Comments (Adviser/FIC/Panel on locked manuscripts)
        Task<IEnumerable<ManuscriptCommentDto>> GetCommentsAsync(int groupId, string? sectionKey, int? revision);
        Task<IEnumerable<ManuscriptCommentDto>?> GetCommentsByStudentAsync(string studentId, string? sectionKey, int? revision);
        Task<ManuscriptCommentDto> AddCommentAsync(string userId, int groupId, string sectionKey, AddManuscriptCommentRequestDto dto);

        // Open next revision (Adviser/FIC)
        Task OpenRevisionAsync(string userId, int groupId);

        // Revision review summary (section-level completion based on comments)
        Task<RevisionSummaryDto> GetRevisionSummaryAsync(int groupId, string userId, string role);
        Task<RevisionSummaryDto?> GetMyRevisionSummaryAsync(string studentId);

        // Image upload
        Task<ImageUploadResponseDto> UploadImageAsync(string studentId, IFormFile file);
    }
}
