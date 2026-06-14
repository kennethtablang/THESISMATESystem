using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IChapterService
    {
        Task<ChapterSubmissionResponseDto> SubmitChapterAsync(int groupId, string submittedById, SubmitChapterRequestDto dto);
        Task<IEnumerable<ChapterSubmissionResponseDto>> GetChaptersByGroupAsync(int groupId);
        Task<IEnumerable<ChapterSubmissionResponseDto>> GetChapterHistoryAsync(int groupId, int chapterNumber);
        Task<ChapterSubmissionResponseDto?> GetChapterByIdAsync(int id);
        Task<ChapterSubmissionResponseDto> UpdateChapterStatusAsync(int id, ChapterStatus status, string adviserId);
        Task<RevisionNoteResponseDto> AddRevisionNoteAsync(int chapterId, string adviserId, AddRevisionNoteRequestDto dto);
        Task<string> GetDownloadPathAsync(int chapterId);
    }
}
