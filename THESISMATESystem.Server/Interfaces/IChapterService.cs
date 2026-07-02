using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IChapterService
    {
        Task<ChapterSubmissionResponseDto> SubmitChapterAsync(int groupId, string submittedById, SubmitChapterRequestDto dto);
        Task<IEnumerable<ChapterSubmissionResponseDto>> GetChaptersByGroupAsync(int groupId, string callerId, string callerRole);
        Task<IEnumerable<ChapterSubmissionResponseDto>> GetChapterHistoryAsync(int groupId, int chapterNumber, string callerId, string callerRole);
        Task<ChapterSubmissionResponseDto?> GetChapterByIdAsync(int id, string callerId, string callerRole);
        Task<ChapterSubmissionResponseDto> UpdateChapterStatusAsync(int id, ChapterStatus status, string adviserId, string callerRole);
        Task<RevisionNoteResponseDto> AddRevisionNoteAsync(int chapterId, string adviserId, string callerRole, AddRevisionNoteRequestDto dto);
        Task<string> GetDownloadPathAsync(int chapterId, string callerId, string callerRole);
    }
}
