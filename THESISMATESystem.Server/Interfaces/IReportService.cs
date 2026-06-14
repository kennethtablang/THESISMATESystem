namespace THESISMATESystem.Server.Interfaces
{
    public interface IReportService
    {
        Task<byte[]> GenerateGroupProgressReportAsync(int groupId);
        Task<byte[]> GenerateMilestoneCompletionReportAsync(string academicYear);
        Task<byte[]> GenerateDefenseOutcomeReportAsync(int scheduleId);
        Task<byte[]> GenerateAllGroupsReportAsync(string? adviserId, string? academicYear, DateTime? from, DateTime? to);
    }
}
