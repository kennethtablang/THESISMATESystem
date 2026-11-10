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
        private readonly IGroupAccessChecker _groupAccess;

        public ReportService(AppDbContext db, IGroupAccessChecker groupAccess)
        {
            _db = db;
            _groupAccess = groupAccess;
        }

        // ── Group Progress Report ────────────────────────────────────────────

        public async Task<byte[]> GenerateGroupProgressReportAsync(int groupId)
        {
            var group = await _db.CapstoneGroups
                .Include(g => g.Adviser)
                .Include(g => g.Members).ThenInclude(m => m.User)
                .AsSplitQuery()
                .FirstOrDefaultAsync(g => g.Id == groupId)
                ?? throw new KeyNotFoundException($"Group {groupId} not found.");

            var chapters = await ChapterProgress.LatestForGroupAsync(_db, group.Id);
            var approvedCount = ChapterProgress.ApprovedCount(chapters);

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
                            LabelValue(table, "Adviser", group.Adviser is null ? "Not yet assigned" : $"{group.Adviser.FirstName} {group.Adviser.LastName}");
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
                                var latest = chapters.FirstOrDefault(c => c.Chapter == ch);

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

        public async Task<byte[]> GenerateMilestoneCompletionReportAsync(string academicYear, string adminId)
        {
            var groups = await _groupAccess.FilterAccessible(_db.CapstoneGroups, adminId, "Admin")
                .Include(g => g.Adviser)
                .Include(g => g.DefenseSchedules)
                .AsSplitQuery()
                .Where(g => g.AcademicYear == academicYear)
                .OrderBy(g => g.GroupName)
                .ToListAsync();
            var chaptersByGroup = await ChapterProgress.LatestByGroupAsync(_db, groups.Select(g => g.Id).ToList());

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
                                var approvedCount = ChapterProgress.ApprovedCount(chaptersByGroup[g.Id]);

                                var defenseStatus = g.DefenseSchedules
                                    .OrderByDescending(d => d.ScheduledDateTime)
                                    .FirstOrDefault()?.Status.ToString() ?? "Not Scheduled";

                                var pct = approvedCount * 20;
                                var row = i % 2 == 0 ? "#ffffff" : "#f8f7f4";

                                table.Cell().Background(row).Padding(6).Text(g.GroupName).Bold();
                                table.Cell().Background(row).Padding(6).Text(g.Adviser is null ? "—" : $"{g.Adviser.FirstName} {g.Adviser.LastName}");
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
                .Include(s => s.CapstoneGroup).ThenInclude(g => g.Adviser)
                .Include(s => s.CapstoneGroup).ThenInclude(g => g.Members).ThenInclude(m => m.User)
                .Include(s => s.PanelAssignments).ThenInclude(pa => pa.Panelist)
                .Include(s => s.DefenseRatings).ThenInclude(r => r.DefenseCriterion)
                .Include(s => s.DefenseRatings).ThenInclude(r => r.Panelist)
                .AsSplitQuery()
                .FirstOrDefaultAsync(s => s.Id == scheduleId)
                ?? throw new KeyNotFoundException($"Schedule {scheduleId} not found.");

            var ratingsByCriterion = schedule.DefenseRatings
                .GroupBy(r => r.DefenseCriterion)
                .OrderBy(g => g.Key.Name)
                .ToList();

            var totalWeighted = ratingsByCriterion
                .Sum(g => g.Average(r => r.Score) * g.Key.Weight / 100);

            var members = schedule.CapstoneGroup.Members
                .Select(m => m.User)
                .OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
                .ToList();
            var adviser = schedule.CapstoneGroup.Adviser;
            var recommendations = await RecommendationsAsync([schedule.Id]);

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.DefaultTextStyle(x => x.FontSize(10).FontFamily(Fonts.Arial));

                    page.Header().Element(Header("Defense Outcome Report", showLogo: true));
                    page.Footer().Element(Footer());

                    page.Content().Column(col =>
                    {
                        col.Spacing(10);

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c => { c.RelativeColumn(); c.RelativeColumn(2); });
                            LabelValue(table, "Group", schedule.CapstoneGroup.GroupName);
                            LabelValue(table, "Project Title", schedule.CapstoneGroup.ProjectTitle ?? "—");
                            LabelValue(table, "Defense", DefensePhases.Label(schedule.Phase, schedule.ReDefenseOf));
                            LabelValue(table, "Adviser", adviser is null ? "—" : $"{adviser.FirstName} {adviser.LastName}".Trim());
                            LabelValue(table, "Date & Time", schedule.ScheduledDateTime.ToString("MMMM dd, yyyy h:mm tt"));
                            LabelValue(table, "Venue", schedule.Venue);
                            LabelValue(table, "Defense Status", schedule.Status.ToString());
                            LabelValue(table, "Panel Members",
                                string.Join(", ", schedule.PanelAssignments.Select(pa => $"{pa.Panelist.FirstName} {pa.Panelist.LastName}")));
                        });

                        col.Item().PaddingTop(10)
                            .Text("Group Members")
                            .Bold().FontSize(12).FontColor(NavyHex);

                        if (members.Count == 0)
                        {
                            col.Item().Text("No members recorded for this group.").Italic().FontColor(GrayHex);
                        }
                        else
                        {
                            col.Item().Table(table =>
                            {
                                table.ColumnsDefinition(c =>
                                {
                                    c.ConstantColumn(30);
                                    c.RelativeColumn(2);
                                    c.RelativeColumn();
                                });

                                table.Header(h =>
                                {
                                    foreach (var txt in new[] { "#", "Name", "Student ID" })
                                        h.Cell().Background(NavyHex).Padding(6)
                                            .Text(txt).Bold().FontColor("#ffffff").FontSize(9);
                                });

                                var n = 0;
                                foreach (var m in members)
                                {
                                    var row = n++ % 2 == 0 ? "#ffffff" : "#f8f7f4";
                                    var name = string.Join(" ", new[] { m.FirstName, m.MiddleName, m.LastName }
                                        .Where(part => !string.IsNullOrWhiteSpace(part)));
                                    table.Cell().Background(row).Padding(6).AlignCenter().Text($"{n}").FontSize(9);
                                    table.Cell().Background(row).Padding(6).Text(name).FontSize(9);
                                    table.Cell().Background(row).Padding(6).Text(m.StudentId ?? "—").FontSize(9);
                                }
                            });
                        }

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
                                    foreach (var txt in new[] { "Criterion", "Weight", "Scores", "Average", "Weighted" })
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

                // The compliance matrix goes on a page of its own (revision round 8).
                if (DefensePhases.HasComplianceMatrix(schedule.Phase, schedule.ReDefenseOf))
                    ComplianceMatrixPage(container, schedule.CapstoneGroup.GroupName, schedule.CapstoneGroup.ProjectTitle,
                        DefensePhases.Label(schedule.Phase, schedule.ReDefenseOf), schedule.ScheduledDateTime,
                        recommendations.GetValueOrDefault(schedule.Id) ?? []);
            }).GeneratePdf();
        }

        // ── All Groups Summary Report ────────────────────────────────────────

        public async Task<byte[]> GenerateAllGroupsReportAsync(string adminId, string? adviserId, string? academicYear, DateTime? from, DateTime? to)
        {
            var query = _groupAccess.FilterAccessible(_db.CapstoneGroups, adminId, "Admin")
                .Include(g => g.Adviser)
                .Include(g => g.DefenseSchedules)
                .AsSplitQuery()
                .AsQueryable();

            if (adviserId is not null) query = query.Where(g => g.AdviserId == adviserId);
            if (academicYear is not null) query = query.Where(g => g.AcademicYear == academicYear);
            if (from.HasValue) query = query.Where(g => g.CreatedAt >= from.Value);
            if (to.HasValue) query = query.Where(g => g.CreatedAt <= to.Value);

            var groups = await query.OrderBy(g => g.AcademicYear).ThenBy(g => g.GroupName).ToListAsync();
            var chaptersByGroup = await ChapterProgress.LatestByGroupAsync(_db, groups.Select(g => g.Id).ToList());

            // Each group's compliance matrices follow the summary, one page per defense.
            var matrixDefenses = groups
                .SelectMany(g => g.DefenseSchedules
                    .Where(d => d.Status == DefenseStatus.Completed && DefensePhases.HasComplianceMatrix(d.Phase, d.ReDefenseOf))
                    .OrderBy(d => d.ScheduledDateTime)
                    .Select(d => (Group: g, Defense: d)))
                .ToList();
            var recommendations = await RecommendationsAsync(matrixDefenses.Select(m => m.Defense.Id).ToList());

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
                                var approvedCount = ChapterProgress.ApprovedCount(chaptersByGroup[g.Id]);

                                var defenseStatus = g.DefenseSchedules
                                    .OrderByDescending(d => d.ScheduledDateTime)
                                    .FirstOrDefault()?.Status.ToString() ?? "—";

                                var row = i % 2 == 0 ? "#ffffff" : "#f8f7f4";
                                table.Cell().Background(row).Padding(6).Text(g.GroupName).Bold();
                                table.Cell().Background(row).Padding(6).Text(g.AcademicYear);
                                table.Cell().Background(row).Padding(6).Text(g.Adviser is null ? "—" : $"{g.Adviser.FirstName} {g.Adviser.LastName}");
                                table.Cell().Background(row).Padding(6).AlignCenter().Text($"{approvedCount}/5");
                                table.Cell().Background(row).Padding(6).Text(defenseStatus);
                                table.Cell().Background(row).Padding(6).Text(g.Status.ToString());
                            }
                        });
                    });
                });

                foreach (var (g, d) in matrixDefenses.Where(m => recommendations.ContainsKey(m.Defense.Id)))
                    ComplianceMatrixPage(container, g.GroupName, g.ProjectTitle,
                        DefensePhases.Label(d.Phase, d.ReDefenseOf), d.ScheduledDateTime, recommendations[d.Id]);
            }).GeneratePdf();
        }

        // ── Compliance matrix ────────────────────────────────────────────────

        private record MatrixRow(string Recommendation, string Location, string Initials);

        private async Task<Dictionary<int, List<MatrixRow>>> RecommendationsAsync(IReadOnlyCollection<int> scheduleIds)
        {
            if (scheduleIds.Count == 0) return [];
            var rows = await _db.DefenseRecommendations
                .Where(r => scheduleIds.Contains(r.DefenseScheduleId))
                .OrderBy(r => r.CreatedAt).ThenBy(r => r.SortOrder)
                .Select(r => new { r.DefenseScheduleId, r.Recommendation, r.Location, r.Initials })
                .ToListAsync();
            return rows.GroupBy(r => r.DefenseScheduleId)
                .ToDictionary(g => g.Key, g => g.Select(r => new MatrixRow(r.Recommendation, r.Location, r.Initials)).ToList());
        }

        // One page: No. | Recommendations | Location | By (Initial), the department's format.
        private static void ComplianceMatrixPage(IDocumentContainer container, string groupName, string? projectTitle,
            string defenseLabel, DateTime defenseDate, List<MatrixRow> rows)
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily(Fonts.Arial));
                page.Header().Element(Header("Compliance Matrix", showLogo: true));
                page.Footer().Element(Footer());

                page.Content().Column(col =>
                {
                    col.Spacing(10);
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c => { c.RelativeColumn(); c.RelativeColumn(2); });
                        LabelValue(table, "Group", groupName);
                        LabelValue(table, "Project Title", projectTitle ?? "—");
                        LabelValue(table, "Defense", $"{defenseLabel} — {defenseDate:MMMM dd, yyyy}");
                    });

                    if (rows.Count == 0)
                    {
                        col.Item().PaddingTop(6).Text("No recommendations were recorded for this defense.").Italic().FontColor(GrayHex);
                        return;
                    }

                    col.Item().PaddingTop(6).Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.ConstantColumn(36);
                            c.RelativeColumn(3);
                            c.RelativeColumn(1.3f);
                            c.ConstantColumn(70);
                        });
                        table.Header(h =>
                        {
                            h.Cell().Background(NavyHex).Padding(6).AlignCenter().Text("No.").Bold().FontColor("#ffffff").FontSize(9);
                            h.Cell().Background(NavyHex).Padding(6).AlignCenter().Text("Recommendations").Bold().FontColor("#ffffff").FontSize(9);
                            h.Cell().Background(NavyHex).Padding(6).AlignCenter().Column(c =>
                            {
                                c.Item().AlignCenter().Text("Location").Bold().FontColor("#ffffff").FontSize(9);
                                c.Item().AlignCenter().Text("(Prelim/ Chapter/ Other)").FontColor("#ffffff").FontSize(7);
                            });
                            h.Cell().Background(NavyHex).Padding(6).AlignCenter().Column(c =>
                            {
                                c.Item().AlignCenter().Text("BY").Bold().FontColor("#ffffff").FontSize(9);
                                c.Item().AlignCenter().Text("(Initial)").FontColor("#ffffff").FontSize(7);
                            });
                        });

                        for (int i = 0; i < rows.Count; i++)
                        {
                            var r = rows[i];
                            table.Cell().Border(0.5f).BorderColor("#9ca3af").Padding(6).AlignCenter().Text($"{i + 1}").FontSize(9);
                            table.Cell().Border(0.5f).BorderColor("#9ca3af").Padding(6).Text(r.Recommendation).FontSize(9);
                            table.Cell().Border(0.5f).BorderColor("#9ca3af").Padding(6).Text(r.Location).FontSize(9);
                            table.Cell().Border(0.5f).BorderColor("#9ca3af").Padding(6).Text(r.Initials).FontSize(9);
                        }
                    });
                });
            });
        }

        // ── PDF Helpers ──────────────────────────────────────────────────────

        private const string NavyHex = "#0a1628";
        private const string GoldHex = "#c9a84c";
        private const string GreenHex = "#16a34a";
        private const string AmberHex = "#d97706";
        private const string GrayHex  = "#6b7280";

        // Official PSU seal, copied to the build output from Assets/. Loaded once; a missing file
        // just drops the seal from the header rather than failing the report.
        private static readonly Lazy<byte[]?> PsuLogo = new(() =>
        {
            var path = Path.Combine(AppContext.BaseDirectory, "Assets", "psu-logo.png");
            return File.Exists(path) ? File.ReadAllBytes(path) : null;
        });

        private static Action<IContainer> Header(string title, bool showLogo = false) => container =>
        {
            container.Column(col =>
            {
                col.Item().Row(row =>
                {
                    if (showLogo && PsuLogo.Value is { } logo)
                        row.ConstantItem(46).PaddingRight(8).AlignMiddle().Image(logo).FitArea();

                    row.RelativeItem().AlignMiddle().Column(c =>
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
