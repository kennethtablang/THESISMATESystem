using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IRegistrationService
    {
        Task<IEnumerable<PendingRegistrationDto>> GetPendingAsync();
        Task ApproveAsync(string userId, string adminId);
        Task RejectAsync(string userId, string adminId, string? reason);
        // Deletes pending registrations past their expiry. Returns how many were removed.
        Task<int> PurgeExpiredAsync(CancellationToken ct = default);
    }
}
