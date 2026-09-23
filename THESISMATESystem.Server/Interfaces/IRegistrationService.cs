using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IRegistrationService
    {
        // Scoped to the blocks the calling Admin handles — an Admin only reviews their own blocks.
        Task<IEnumerable<PendingRegistrationDto>> GetPendingAsync(string adminId);
        Task ApproveAsync(string userId, string adminId);
        Task RejectAsync(string userId, string adminId, string? reason);
        // Deletes pending registrations past their expiry. Returns how many were removed.
        Task<int> PurgeExpiredAsync(CancellationToken ct = default);
    }
}
