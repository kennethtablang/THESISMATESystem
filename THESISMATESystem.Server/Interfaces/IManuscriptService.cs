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

        // Lock / revision status (finalization voting was removed)
        Task<ManuscriptVoteStatusDto> GetVoteStatusAsync(string studentId);

        // Comments (Adviser/FIC/Panel on locked manuscripts)
        Task<IEnumerable<ManuscriptCommentDto>> GetCommentsAsync(int groupId, string? sectionKey, int? revision);
        Task<IEnumerable<ManuscriptCommentDto>?> GetCommentsByStudentAsync(string studentId, string? sectionKey, int? revision);
        Task<ManuscriptCommentDto> AddCommentAsync(string userId, int groupId, string sectionKey, AddManuscriptCommentRequestDto dto);
        // Returns the section key of the removed comment.
        Task<string> DeleteCommentAsync(string userId, int groupId, int commentId);
        // Adviser + standing panel with the highlight colour each one uses.
        Task<List<ManuscriptReviewerDto>> GetReviewersAsync(int groupId);

        // Open next revision (Adviser/FIC)
        Task OpenRevisionAsync(string userId, int groupId);

        // Revision review summary (section-level completion based on comments)
        Task<RevisionSummaryDto> GetRevisionSummaryAsync(int groupId, string userId, string role);
        Task<RevisionSummaryDto?> GetMyRevisionSummaryAsync(string studentId);

        // Image upload
        Task<ImageUploadResponseDto> UploadImageAsync(string studentId, IFormFile file);
    }
}
