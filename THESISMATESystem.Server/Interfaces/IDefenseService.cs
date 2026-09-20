using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IDefenseService
    {
        Task<DefenseScheduleResponseDto> CreateScheduleAsync(CreateDefenseScheduleRequestDto dto);
        Task<DefenseScheduleResponseDto?> GetScheduleByIdAsync(int id);
        Task<IEnumerable<DefenseScheduleResponseDto>> GetSchedulesByGroupAsync(int groupId);
        Task<IEnumerable<DefenseScheduleResponseDto>> GetSchedulesByPanelistAsync(string panelistId);
        // facultyId limits the list to that Faculty member's advised/paneled groups; null returns all.
        Task<IEnumerable<DefenseScheduleResponseDto>> GetAllSchedulesAsync(string? facultyId = null);
        Task<DefenseScheduleResponseDto> UpdateScheduleAsync(int id, UpdateDefenseScheduleRequestDto dto);
        Task<bool> CancelScheduleAsync(int id);
        Task<bool> SetRatingOpenAsync(int id, bool isOpen);

        // Which groups still have no defense scheduled, per phase, for the given academic year.
        Task<DefenseCoverageDto> GetCoverageAsync(string academicYear);

        Task<DefenseRatingResponseDto> SubmitRatingAsync(string panelistId, SubmitRatingRequestDto dto);
        Task<IEnumerable<DefenseRatingResponseDto>> GetRatingsByScheduleAsync(int scheduleId);
        Task<ConsolidatedRatingDto> GetConsolidatedRatingAsync(int scheduleId);
        Task<bool> FinalizeRatingsAsync(int scheduleId, string adminId);

        Task<IEnumerable<DefenseCriterionResponseDto>> GetCriteriaAsync(DefensePhase? phase = null);
        Task<DefenseCriterionResponseDto> CreateCriterionAsync(CreateCriterionRequestDto dto);
        Task<DefenseCriterionResponseDto> UpdateCriterionAsync(int id, UpdateCriterionRequestDto dto);
        Task<bool> DeleteCriterionAsync(int id);
    }
}
