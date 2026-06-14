using Microsoft.EntityFrameworkCore;
using System.Text;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Services
{
    public class ReportService : IReportService
    {
        private readonly AppDbContext _db;

        public ReportService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<byte[]> GenerateGroupProgressReportAsync(int groupId)
        {
            var group = await _db.CapstoneGroups
                .Include(g => g.Adviser)
                .Include(g => g.Members).ThenInclude(m => m.User)
                .Include(g => g.ChapterSubmissions)
                .FirstOrDefaultAsync(g => g.Id == groupId)
                ?? throw new KeyNotFoundException($"Group {groupId} not found.");

            var sb = new StringBuilder();
            sb.AppendLine($"GROUP PROGRESS REPORT");
            sb.AppendLine($"Group: {group.GroupName}");
            sb.AppendLine($"Title: {group.ProjectTitle ?? "Not yet set"}");
            sb.AppendLine($"Adviser: {group.Adviser.FirstName} {group.Adviser.LastName}");
            sb.AppendLine($"Academic Year: {group.AcademicYear}");
            sb.AppendLine($"Members: {string.Join(", ", group.Members.Select(m => $"{m.User.FirstName} {m.User.LastName}"))}");
            sb.AppendLine();
            sb.AppendLine("CHAPTER STATUS:");

            for (int ch = 1; ch <= 5; ch++)
            {
                var latest = group.ChapterSubmissions
                    .Where(cs => cs.ChapterNumber == ch)
                    .OrderByDescending(cs => cs.Version)
                    .FirstOrDefault();

                sb.AppendLine(latest is null
                    ? $"  Chapter {ch}: Not yet submitted"
                    : $"  Chapter {ch}: {latest.Status} (v{latest.Version}, submitted {latest.SubmittedAt:yyyy-MM-dd})");
            }

            sb.AppendLine($"\nGenerated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> GenerateMilestoneCompletionReportAsync(string academicYear)
        {
            var groups = await _db.CapstoneGroups
                .Include(g => g.ChapterSubmissions)
                .Include(g => g.DefenseSchedules)
                .Where(g => g.AcademicYear == academicYear)
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine($"MILESTONE COMPLETION REPORT — {academicYear}");
            sb.AppendLine($"Total Groups: {groups.Count}");
            sb.AppendLine();
            sb.AppendLine($"{"Group",-30} {"Approved Chapters",-20} {"Defense",-15} {"Status"}");
            sb.AppendLine(new string('-', 80));

            foreach (var g in groups)
            {
                var approvedCount = g.ChapterSubmissions
                    .GroupBy(cs => cs.ChapterNumber)
                    .Count(gr => gr.Any(cs => cs.Status == ChapterStatus.Approved));

                var defenseStatus = g.DefenseSchedules.OrderByDescending(d => d.ScheduledDateTime)
                    .FirstOrDefault()?.Status.ToString() ?? "Not Scheduled";

                sb.AppendLine($"{g.GroupName,-30} {approvedCount + "/5",-20} {defenseStatus,-15} {g.Status}");
            }

            sb.AppendLine($"\nGenerated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> GenerateDefenseOutcomeReportAsync(int scheduleId)
        {
            var schedule = await _db.DefenseSchedules
                .Include(s => s.CapstoneGroup)
                .Include(s => s.PanelAssignments).ThenInclude(pa => pa.Panelist)
                .Include(s => s.DefenseRatings).ThenInclude(r => r.DefenseCriterion)
                .Include(s => s.DefenseRatings).ThenInclude(r => r.Panelist)
                .FirstOrDefaultAsync(s => s.Id == scheduleId)
                ?? throw new KeyNotFoundException($"Schedule {scheduleId} not found.");

            var sb = new StringBuilder();
            sb.AppendLine("DEFENSE OUTCOME REPORT");
            sb.AppendLine($"Group: {schedule.CapstoneGroup.GroupName}");
            sb.AppendLine($"Date: {schedule.ScheduledDateTime:MMM dd, yyyy h:mm tt}");
            sb.AppendLine($"Venue: {schedule.Venue}");
            sb.AppendLine($"Status: {schedule.Status}");
            sb.AppendLine();
            sb.AppendLine("PANEL:");
            foreach (var pa in schedule.PanelAssignments)
                sb.AppendLine($"  - {pa.Panelist.FirstName} {pa.Panelist.LastName}");

            sb.AppendLine();
            sb.AppendLine("RATINGS BY CRITERION:");

            var ratingsByCriterion = schedule.DefenseRatings.GroupBy(r => r.DefenseCriterion);
            foreach (var group in ratingsByCriterion)
            {
                sb.AppendLine($"  {group.Key.Name} (Weight: {group.Key.Weight}%)");
                foreach (var r in group)
                    sb.AppendLine($"    {r.Panelist.FirstName} {r.Panelist.LastName}: {r.Score} — {r.Comments ?? "No comments"}");

                var avg = group.Average(r => r.Score);
                sb.AppendLine($"    Average: {avg:F2} | Weighted: {avg * group.Key.Weight / 100:F2}");
            }

            var total = ratingsByCriterion.Sum(g => g.Average(r => r.Score) * g.Key.Weight / 100);
            sb.AppendLine();
            sb.AppendLine($"TOTAL WEIGHTED SCORE: {total:F2}");
            sb.AppendLine($"\nGenerated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> GenerateAllGroupsReportAsync(string? adviserId, string? academicYear, DateTime? from, DateTime? to)
        {
            var query = _db.CapstoneGroups
                .Include(g => g.Adviser)
                .Include(g => g.ChapterSubmissions)
                .Include(g => g.DefenseSchedules)
                .AsQueryable();

            if (adviserId is not null) query = query.Where(g => g.AdviserId == adviserId);
            if (academicYear is not null) query = query.Where(g => g.AcademicYear == academicYear);
            if (from.HasValue) query = query.Where(g => g.CreatedAt >= from.Value);
            if (to.HasValue) query = query.Where(g => g.CreatedAt <= to.Value);

            var groups = await query.OrderBy(g => g.GroupName).ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("ALL GROUPS REPORT");
            sb.AppendLine($"Filters — Adviser: {adviserId ?? "All"} | Year: {academicYear ?? "All"} | From: {from:yyyy-MM-dd} | To: {to:yyyy-MM-dd}");
            sb.AppendLine($"Total Groups: {groups.Count}");
            sb.AppendLine();

            foreach (var g in groups)
            {
                var approvedCount = g.ChapterSubmissions
                    .GroupBy(cs => cs.ChapterNumber)
                    .Count(gr => gr.Any(cs => cs.Status == ChapterStatus.Approved));

                sb.AppendLine($"{g.GroupName} | {g.AcademicYear} | Adviser: {g.Adviser.FirstName} {g.Adviser.LastName} | Chapters: {approvedCount}/5 | {g.Status}");
            }

            sb.AppendLine($"\nGenerated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }
    }
}
