using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Helpers
{
    /// <summary>The latest state of one chapter (1–5) of a group.</summary>
    public record ChapterProgressEntry(int Chapter, ChapterStatus Status, int Version, DateTime SubmittedAt, string FileName);

    /// <summary>
    /// Chapters reach the reviewers two ways: the older Chapters page (<c>ChapterSubmission</c>) and
    /// Upload Documents / the manuscript (<c>DocumentSubmission</c> with a Chapter1–5 section), which
    /// is what students use now. Reports, milestones and readiness checks must read both, or a chapter
    /// approved from Manuscripts shows as "Not Submitted". The more recent entry per chapter wins.
    /// </summary>
    public static class ChapterProgress
    {
        public static async Task<Dictionary<int, List<ChapterProgressEntry>>> LatestByGroupAsync(
            AppDbContext db, IReadOnlyCollection<int> groupIds)
        {
            var result = groupIds.Distinct().ToDictionary(id => id, _ => new List<ChapterProgressEntry>());
            if (result.Count == 0) return result;

            var legacy = await db.ChapterSubmissions
                .Where(c => groupIds.Contains(c.CapstoneGroupId))
                .Select(c => new { c.CapstoneGroupId, c.ChapterNumber, c.Status, c.Version, c.SubmittedAt, c.FileName })
                .ToListAsync();

            var docs = await db.DocumentSubmissions
                .Where(d => groupIds.Contains(d.CapstoneGroupId)
                         && d.Section >= DocumentSection.Chapter1 && d.Section <= DocumentSection.Chapter5
                         && d.SubmissionStatus != DocumentSubmissionStatus.Draft)
                .Select(d => new { d.CapstoneGroupId, d.Section, d.SubmissionStatus, d.Version, d.SubmittedAt, d.FileName })
                .ToListAsync();

            var entries = legacy
                .Select(c => (c.CapstoneGroupId, Entry: new ChapterProgressEntry(c.ChapterNumber, c.Status, c.Version, c.SubmittedAt, c.FileName)))
                .Concat(docs.Select(d => (d.CapstoneGroupId, Entry: new ChapterProgressEntry(
                    (int)d.Section!.Value - (int)DocumentSection.Chapter1 + 1,
                    d.SubmissionStatus switch
                    {
                        DocumentSubmissionStatus.Approved      => ChapterStatus.Approved,
                        DocumentSubmissionStatus.NeedsRevision => ChapterStatus.UnderRevision,
                        _                                      => ChapterStatus.PendingReview,
                    },
                    d.Version, d.SubmittedAt, d.FileName))));

            // Within a document chain only the latest version carries the derived status, so the
            // newest entry (by version, then time) per chapter is the chapter's state.
            foreach (var g in entries.GroupBy(e => (e.CapstoneGroupId, e.Entry.Chapter)))
            {
                var latest = g.Select(e => e.Entry)
                    .OrderByDescending(e => e.SubmittedAt).ThenByDescending(e => e.Version)
                    .First();
                result[g.Key.CapstoneGroupId].Add(latest);
            }
            foreach (var list in result.Values) list.Sort((a, b) => a.Chapter.CompareTo(b.Chapter));
            return result;
        }

        public static async Task<List<ChapterProgressEntry>> LatestForGroupAsync(AppDbContext db, int groupId) =>
            (await LatestByGroupAsync(db, [groupId]))[groupId];

        public static int ApprovedCount(IEnumerable<ChapterProgressEntry> entries) =>
            entries.Count(e => e.Status == ChapterStatus.Approved);
    }
}
