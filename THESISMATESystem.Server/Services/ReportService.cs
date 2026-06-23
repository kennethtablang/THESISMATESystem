using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;
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

        // ── Group Progress Report ────────────────────────────────────────────

        public async Task<byte[]> GenerateGroupProgressReportAsync(int groupId)
        {
            var group = await _db.CapstoneGroups
                .Include(g => g.Adviser)
                .Include(g => g.Members).ThenInclude(m => m.User)
                .Include(g => g.ChapterSubmissions)
                .FirstOrDefaultAsync(g => g.Id == groupId)
                ?? throw new KeyNotFoundException($"Group {groupId} not found.");

            var approvedCount = group.ChapterSubmissions
                .GroupBy(cs => cs.ChapterNumber)
                .Count(gr => gr.Any(cs => cs.Status == ChapterStatus.Approved));

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.DefaultTextStyle(x => x.FontSize(10).FontFamily(Fonts.Arial));

                    page.Header().Element(Header("Group Progress Report"));
                    page.Footer().Element(Footer());

                    page.Content().Column(col =>
                    {
                        col.Spacing(10);

                        // Group info
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c => { c.RelativeColumn(); c.RelativeColumn(2); });
                            LabelValue(table, "Group Name", group.GroupName);
                            LabelValue(table, "Project Title", group.ProjectTitle ?? "Not yet set");
                            LabelValue(table, "Adviser", $"{group.Adviser.FirstName} {group.Adviser.LastName}");
                            LabelValue(table, "Academic Year", group.AcademicYear);
                            LabelValue(table, "Members", string.Join(", ", group.Members.Select(m => $"{m.User.FirstName} {m.User.LastName}")));
                            LabelValue(table, "Status", group.Status.ToString());
                        });

                        // Section header
                        col.Item().PaddingTop(10)
                            .Text("Chapter Submission Status")
                            .Bold().FontSize(12).FontColor(NavyHex);

                        // Chapters table
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.ConstantColumn(80);
                                c.RelativeColumn();
                                c.ConstantColumn(90);
                                c.ConstantColumn(70);
                                c.ConstantColumn(80);
                            });

                            // Header row
                            table.Header(h =>
                            {
                                foreach (var txt in new[] { "Chapter", "Title", "Status", "Version", "Submitted" })
                                    h.Cell().Background(NavyHex).Padding(6)
                                        .Text(txt).Bold().FontColor("#ffffff").FontSize(9);
                            });

                            for (int ch = 1; ch <= 5; ch++)
                            {
                                var latest = group.ChapterSubmissions
                                    .Where(cs => cs.ChapterNumber == ch)
                                    .OrderByDescending(cs => cs.Version)
                                    .FirstOrDefault();

                                var (statusText, statusColor) = latest?.Status switch
                                {
                                    ChapterStatus.Approved => ("Approved", GreenHex),
                                    ChapterStatus.UnderRevision => ("Under Revision", AmberHex),
                                    ChapterStatus.PendingReview => ("Pending Review", GrayHex),
                                    _ => ("Not Submitted", GrayHex)
                                };

                                var row = ch % 2 == 0 ? "#ffffff" : "#f8f7f4";
                                table.Cell().Background(row).Padding(6).Text($"Chapter {ch}").FontSize(9);
                                table.Cell().Background(row).Padding(6).Text(latest?.FileName ?? "—").FontSize(9);
                                table.Cell().Background(row).Padding(6).Text(statusText).FontColor(statusColor).Bold().FontSize(9);
                                table.Cell().Background(row).Padding(6).Text(latest is null ? "—" : $"v{latest.Version}").FontSize(9);
                                table.Cell().Background(row).Padding(6).Text(
                                    latest is null ? "—" : latest.SubmittedAt.ToString("MMM dd, yyyy")).FontSize(9);
                            }
                        });

                        // Summary
                        col.Item().PaddingTop(6)
                            .Text($"Overall Progress: {approvedCount} of 5 chapters approved ({approvedCount * 20}%)")
                            .Italic().FontColor(NavyHex);
                    });
                });
            }).GeneratePdf();
        }

        // ── Milestone Completion Report ──────────────────────────────────────

        public async Task<byte[]> GenerateMilestoneCompletionReportAsync(string academicYear)
        {
            var groups = await _db.CapstoneGroups
                .Include(g => g.Adviser)
                .Include(g => g.ChapterSubmissions)
                .Include(g => g.DefenseSchedules)
                .Where(g => g.AcademicYear == academicYear)
                .OrderBy(g => g.GroupName)
                .ToListAsync();

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(40);
                    page.DefaultTextStyle(x => x.FontSize(9).FontFamily(Fonts.Arial));

                    page.Header().Element(Header($"Milestone Completion Report — AY {academicYear}"));
                    page.Footer().Element(Footer());

                    page.Content().Column(col =>
                    {
                        col.Spacing(8);

                        col.Item().Text($"Total Groups: {groups.Count}  |  Academic Year: {academicYear}")
                            .FontSize(10).FontColor(NavyHex);

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn(2);
                                c.RelativeColumn();
                                c.ConstantColumn(80);
                                c.ConstantColumn(80);
                                c.ConstantColumn(80);
                                c.ConstantColumn(80);
                            });

                            table.Header(h =>
                            {
                                foreach (var txt in new[] { "Group", "Adviser", "Approved Ch.", "Defense", "Progress", "Status" })
                                    h.Cell().Background(NavyHex).Padding(6)
                                        .Text(txt).Bold().FontColor("#ffffff").FontSize(9);
                            });

                            for (int i = 0; i < groups.Count; i++)
                            {
                                var g = groups[i];
                                var approvedCount = g.ChapterSubmissions
                                    .GroupBy(cs => cs.ChapterNumber)
                                    .Count(gr => gr.Any(cs => cs.Status == ChapterStatus.Approved));

                                var defenseStatus = g.DefenseSchedules
                                    .OrderByDescending(d => d.ScheduledDateTime)
                                    .FirstOrDefault()?.Status.ToString() ?? "Not Scheduled";

                                var pct = approvedCount * 20;
                                var row = i % 2 == 0 ? "#ffffff" : "#f8f7f4";

                                table.Cell().Background(row).Padding(6).Text(g.GroupName).Bold();
                                table.Cell().Background(row).Padding(6).Text($"{g.Adviser.FirstName} {g.Adviser.LastName}");
                                table.Cell().Background(row).Padding(6).AlignCenter().Text($"{approvedCount}/5");
                                table.Cell().Background(row).Padding(6).Text(defenseStatus);
                                table.Cell().Background(row).Padding(6).AlignCenter()
                                    .Text($"{pct}%").FontColor(pct >= 80 ? GreenHex : pct >= 40 ? AmberHex : GrayHex).Bold();
                                table.Cell().Background(row).Padding(6).Text(g.Status.ToString());
                            }
                        });
                    });
                });
            }).GeneratePdf();
        }

        // ── Defense Outcome Report ───────────────────────────────────────────

        public async Task<byte[]> GenerateDefenseOutcomeReportAsync(int scheduleId)
        {
            var schedule = await _db.DefenseSchedules
                .Include(s => s.CapstoneGroup)
                .Include(s => s.PanelAssignments).ThenInclude(pa => pa.Panelist)
                .Include(s => s.DefenseRatings).ThenInclude(r => r.DefenseCriterion)
                .Include(s => s.DefenseRatings).ThenInclude(r => r.Panelist)
                .FirstOrDefaultAsync(s => s.Id == scheduleId)
                ?? throw new KeyNotFoundException($"Schedule {scheduleId} not found.");

            var ratingsByCriterion = schedule.DefenseRatings
                .GroupBy(r => r.DefenseCriterion)
                .OrderBy(g => g.Key.Name)
                .ToList();

            var totalWeighted = ratingsByCriterion
                .Sum(g => g.Average(r => r.Score) * g.Key.Weight / 100);

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.DefaultTextStyle(x => x.FontSize(10).FontFamily(Fonts.Arial));

                    page.Header().Element(Header("Defense Outcome Report"));
                    page.Footer().Element(Footer());

                    page.Content().Column(col =>
                    {
                        col.Spacing(10);

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c => { c.RelativeColumn(); c.RelativeColumn(2); });
                            LabelValue(table, "Group", schedule.CapstoneGroup.GroupName);
                            LabelValue(table, "Project Title", schedule.CapstoneGroup.ProjectTitle ?? "—");
                            LabelValue(table, "Date & Time", schedule.ScheduledDateTime.ToString("MMMM dd, yyyy h:mm tt"));
                            LabelValue(table, "Venue", schedule.Venue);
                            LabelValue(table, "Defense Status", schedule.Status.ToString());
                            LabelValue(table, "Panel Members",
                                string.Join(", ", schedule.PanelAssignments.Select(pa => $"{pa.Panelist.FirstName} {pa.Panelist.LastName}")));
                        });

                        col.Item().PaddingTop(10)
                            .Text("Evaluation Results by Criterion")
                            .Bold().FontSize(12).FontColor(NavyHex);

                        if (ratingsByCriterion.Count == 0)
                        {
                            col.Item().Text("No ratings submitted yet.").Italic().FontColor(GrayHex);
                        }
                        else
                        {
                            col.Item().Table(table =>
                            {
                                table.ColumnsDefinition(c =>
                                {
                                    c.RelativeColumn(2);
                                    c.ConstantColumn(55);
                                    c.RelativeColumn();
                                    c.ConstantColumn(75);
                                    c.ConstantColumn(75);
                                });

                                table.Header(h =>
                                {
                                    foreach (var txt in new[] { "Criterion", "Weight", "Panelist Scores", "Average", "Weighted" })
                                        h.Cell().Background(NavyHex).Padding(6)
                                            .Text(txt).Bold().FontColor("#ffffff").FontSize(9);
                                });

                                int i = 0;
                                foreach (var cg in ratingsByCriterion)
                                {
                                    var row = i++ % 2 == 0 ? "#ffffff" : "#f8f7f4";
                                    var avg = cg.Average(r => r.Score);
                                    var weighted = avg * cg.Key.Weight / 100;
                                    var scores = string.Join(", ", cg.Select(r => $"{r.Panelist.FirstName} {r.Panelist.LastName[0]}: {r.Score:F1}"));

                                    table.Cell().Background(row).Padding(6).Text(cg.Key.Name).Bold().FontSize(9);
                                    table.Cell().Background(row).Padding(6).AlignCenter().Text($"{cg.Key.Weight}%").FontSize(9);
                                    table.Cell().Background(row).Padding(6).Text(scores).FontSize(8);
                                    table.Cell().Background(row).Padding(6).AlignCenter().Text($"{avg:F2}").FontSize(9);
                                    table.Cell().Background(row).Padding(6).AlignCenter().Text($"{weighted:F2}").Bold().FontSize(9);
                                }
                            });

                            col.Item().PaddingTop(8).Row(row =>
                            {
                                row.RelativeItem();
                                row.AutoItem()
                                    .Background(NavyHex)
                                    .Padding(10)
                                    .Text($"Total Weighted Score: {totalWeighted:F2}")
                                    .Bold().FontSize(13).FontColor(GoldHex);
                            });
                        }
                    });
                });
            }).GeneratePdf();
        }

        // ── All Groups Summary Report ────────────────────────────────────────

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

            var groups = await query.OrderBy(g => g.AcademicYear).ThenBy(g => g.GroupName).ToListAsync();

            var filterDesc = new List<string>();
            if (academicYear is not null) filterDesc.Add($"AY {academicYear}");
            if (from.HasValue) filterDesc.Add($"From {from.Value:MMM dd, yyyy}");
            if (to.HasValue) filterDesc.Add($"To {to.Value:MMM dd, yyyy}");
            var filterText = filterDesc.Count > 0 ? string.Join(" | ", filterDesc) : "All records";

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(40);
                    page.DefaultTextStyle(x => x.FontSize(9).FontFamily(Fonts.Arial));

                    page.Header().Element(Header("All Groups Summary Report"));
                    page.Footer().Element(Footer());

                    page.Content().Column(col =>
                    {
                        col.Spacing(8);
                        col.Item().Text($"Filter: {filterText}  |  Total Groups: {groups.Count}")
                            .FontSize(10).FontColor(NavyHex);

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn(2);
                                c.ConstantColumn(80);
                                c.RelativeColumn();
                                c.ConstantColumn(80);
                                c.ConstantColumn(80);
                                c.ConstantColumn(80);
                            });

                            table.Header(h =>
                            {
                                foreach (var txt in new[] { "Group Name", "AY", "Adviser", "Approved Ch.", "Defense", "Status" })
                                    h.Cell().Background(NavyHex).Padding(6)
                                        .Text(txt).Bold().FontColor("#ffffff").FontSize(9);
                            });

                            for (int i = 0; i < groups.Count; i++)
                            {
                                var g = groups[i];
                                var approvedCount = g.ChapterSubmissions
                                    .GroupBy(cs => cs.ChapterNumber)
                                    .Count(gr => gr.Any(cs => cs.Status == ChapterStatus.Approved));

                                var defenseStatus = g.DefenseSchedules
                                    .OrderByDescending(d => d.ScheduledDateTime)
                                    .FirstOrDefault()?.Status.ToString() ?? "—";

                                var row = i % 2 == 0 ? "#ffffff" : "#f8f7f4";
                                table.Cell().Background(row).Padding(6).Text(g.GroupName).Bold();
                                table.Cell().Background(row).Padding(6).Text(g.AcademicYear);
                                table.Cell().Background(row).Padding(6).Text($"{g.Adviser.FirstName} {g.Adviser.LastName}");
                                table.Cell().Background(row).Padding(6).AlignCenter().Text($"{approvedCount}/5");
                                table.Cell().Background(row).Padding(6).Text(defenseStatus);
                                table.Cell().Background(row).Padding(6).Text(g.Status.ToString());
                            }
                        });
                    });
                });
            }).GeneratePdf();
        }

        // ── PDF Helpers ──────────────────────────────────────────────────────

        private const string NavyHex = "#0a1628";
        private const string GoldHex = "#c9a84c";
        private const string GreenHex = "#16a34a";
        private const string AmberHex = "#d97706";
        private const string GrayHex  = "#6b7280";

        private static Action<IContainer> Header(string title) => container =>
        {
            container.Column(col =>
            {
                col.Item().Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text("ThesisMate").Bold().FontSize(18).FontColor(NavyHex);
                        c.Item().Text("Pangasinan State University — Lingayen Campus")
                            .FontSize(9).FontColor(GrayHex);
                    });
                    row.AutoItem().AlignRight().Column(c =>
                    {
                        c.Item().AlignRight().Text(title).Bold().FontSize(12).FontColor(NavyHex);
                        c.Item().AlignRight().Text($"Generated: {PhilippineTime.Now:MMM dd, yyyy h:mm tt} PHT")
                            .FontSize(8).FontColor(GrayHex);
                    });
                });
                col.Item().PaddingTop(4).LineHorizontal(1.5f).LineColor(GoldHex);
                col.Item().Height(8);
            });
        };

        private static Action<IContainer> Footer() => container =>
        {
            container.Row(row =>
            {
                row.RelativeItem().Text("ThesisMate BSIT Capstone Management System — PSU Lingayen")
                    .FontSize(8).FontColor(GrayHex);
                row.AutoItem().AlignRight()
                    .Text(t =>
                    {
                        t.CurrentPageNumber().FontSize(8).FontColor(GrayHex);
                        t.Span(" / ").FontSize(8).FontColor(GrayHex);
                        t.TotalPages().FontSize(8).FontColor(GrayHex);
                    });
            });
        };

        private static void LabelValue(TableDescriptor table, string label, string value)
        {
            table.Cell().Background("#f8f7f4").Padding(6)
                .Text(label).Bold().FontSize(9).FontColor(NavyHex);
            table.Cell().Padding(6).Text(value).FontSize(9);
        }
    }
}
