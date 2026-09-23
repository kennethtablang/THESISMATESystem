using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IDefenseAutoScheduler
    {
        // Builds a conflict-free proposal. Nothing is saved.
        Task<AutoScheduleProposalDto> ProposeAsync(AutoScheduleRequestDto dto);
        // Same, but as a chain behind one saved defense: schedule the first group, the rest follow.
        Task<AutoScheduleProposalDto> ProposeChainAsync(ChainScheduleRequestDto dto);
        // Saves the (possibly edited) proposal, re-checking every conflict against the database.
        Task<AutoScheduleConfirmResultDto> ConfirmAsync(ConfirmAutoScheduleRequestDto dto);
    }
}
