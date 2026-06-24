using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IMonitoringService
    {
        Task<MonitoringSummaryDto> GetSummaryAsync(string userId, string role);
        Task<GroupHealthDto?> GetGroupHealthAsync(int groupId, string userId, string role);
        Task<GroupHealthDto?> GetMyGroupHealthAsync(string studentId);
    }
}
