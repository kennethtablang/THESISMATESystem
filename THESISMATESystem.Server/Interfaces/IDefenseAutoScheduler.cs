using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IDefenseAutoScheduler
    {
        // Builds a conflict-free proposal. Nothing is saved.
        Task<AutoScheduleProposalDto> ProposeAsync(AutoScheduleRequestDto dto);
        // Saves the (possibly edited) proposal, re-checking every conflict against the database.
        Task<AutoScheduleConfirmResultDto> ConfirmAsync(ConfirmAutoScheduleRequestDto dto);
    }
}
