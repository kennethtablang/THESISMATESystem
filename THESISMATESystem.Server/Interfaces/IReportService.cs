namespace THESISMATESystem.Server.Interfaces
{
    public interface IReportService
    {
        Task<byte[]> GenerateGroupProgressReportAsync(int groupId);
        Task<byte[]> GenerateMilestoneCompletionReportAsync(string academicYear, string adminId);
        Task<byte[]> GenerateDefenseOutcomeReportAsync(int scheduleId);
        Task<byte[]> GenerateAllGroupsReportAsync(string adminId, string? adviserId, string? academicYear, DateTime? from, DateTime? to);
    }
}
