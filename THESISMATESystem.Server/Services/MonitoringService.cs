using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;
using THESISMATESystem.Server.Interfaces;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Services
{
    public class MonitoringService : IMonitoringService
    {
        private readonly AppDbContext _db;

        public MonitoringService(AppDbContext db) => _db = db;

        public async Task<MonitoringSummaryDto> GetSummaryAsync(string userId, string role)
        {
            var groups = await LoadGroupsForRoleAsync(userId, role);
            var healthDtos = new List<GroupHealthDto>(groups.Count);

            foreach (var g in groups)
                healthDtos.Add(await ComputeHealthAsync(g));

            return new MonitoringSummaryDto
            {
                TotalGroups        = healthDtos.Count,
                ExcellentCount     = healthDtos.Count(h => h.RiskLevel == "Excellent"),
                OnTrackCount       = healthDtos.Count(h => h.RiskLevel == "OnTrack"),
                NeedsAttentionCount = healthDtos.Count(h => h.RiskLevel == "NeedsAttention"),
                AtRiskCount        = healthDtos.Count(h => h.RiskLevel == "AtRisk"),
                AverageHealthScore = healthDtos.Count > 0
                    ? (int)Math.Round(healthDtos.Average(h => h.HealthScore))
                    : 0,
                Groups = healthDtos.OrderBy(h => h.HealthScore),
            };
        }

        public async Task<GroupHealthDto?> GetGroupHealthAsync(int groupId, string userId, string role)
        {
            var group = await LoadGroupAsync(groupId);
            if (group is null) return null;

            // Enforce scope for Adviser
            if (role == "Adviser" && group.AdviserId != userId) return null;

            return await ComputeHealthAsync(group);
        }

        public async Task<GroupHealthDto?> GetMyGroupHealthAsync(string studentId)
        {
            var membership = await _db.GroupMembers
                .FirstOrDefaultAsync(gm => gm.UserId == studentId &&
                    gm.CapstoneGroup.Status == GroupStatus.Active);

            if (membership is null) return null;

            var group = await LoadGroupAsync(membership.CapstoneGroupId);
            return group is null ? null : await ComputeHealthAsync(group);
        }

        // ── Core algorithm ────────────────────────────────────────────────────

        private async Task<GroupHealthDto> ComputeHealthAsync(CapstoneGroup group)
        {
            var now = PhilippineTime.Now;
            var cutoff30  = now.AddDays(-30);
            var cutoff60  = now.AddDays(-60);

            // ── Chapters ──────────────────────────────────────────────────────
            var submissions = await _db.ChapterSubmissions
                .Where(cs => cs.CapstoneGroupId == group.Id)
                .ToListAsync();

            // Latest submission per chapter number
            var latestByChapter = submissions
                .GroupBy(cs => cs.ChapterNumber)
                .Select(g => g.OrderByDescending(cs => cs.Version).First())
                .ToList();

            int approved      = latestByChapter.Count(cs => cs.Status == ChapterStatus.Approved);
            int underRevision = latestByChapter.Count(cs => cs.Status == ChapterStatus.UnderRevision);
            int pending       = latestByChapter.Count(cs => cs.Status == ChapterStatus.PendingReview);
            int totalChapters = latestByChapter.Count;

            // Score: each approved chapter = 20 pts (5 chapters = 100), with small partial credit
            int chapterScore = Math.Min(
                approved * 20 + underRevision * 10 + pending * 6,
                100);

            // ── System features ───────────────────────────────────────────────
            var features = await _db.SystemFeatures
                .Where(sf => sf.CapstoneGroupId == group.Id)
                .ToListAsync();

            int totalFeatures    = features.Count;
            int completedFeatures = features.Count(f => f.Status == SystemFeatureStatus.Completed);
            int inProgressFeatures = features.Count(f => f.Status == SystemFeatureStatus.InProgress);

            // Weighted completion: Completed=100, InProgress=50, NeedsRevision=25, NotStarted=0
            int featureScore = totalFeatures == 0 ? 0
                : (int)Math.Round(features.Average(f => f.Status switch
                {
                    SystemFeatureStatus.Completed    => 100.0,
                    SystemFeatureStatus.InProgress   => 50.0,
                    SystemFeatureStatus.NeedsRevision => 25.0,
                    _                                => 0.0,
                }));

            // ── Manuscript sections ───────────────────────────────────────────
            var sections = await _db.ManuscriptSections
                .Where(ms => ms.CapstoneGroupId == group.Id)
                .ToListAsync();

            int sectionsWithContent = sections.Count(ms => ms.WordCount > 100);
            DateTime? lastManuscriptUpdate = sections.Count > 0
                ? sections.Max(ms => ms.UpdatedAt)
                : null;

            // Score: 6 sections total (chapter1–5 + references)
            int manuscriptScore = (int)Math.Round(sectionsWithContent / 6.0 * 100);

            // ── Consultations ─────────────────────────────────────────────────
            var consultations = await _db.ConsultationLogs
                .Where(cl => cl.CapstoneGroupId == group.Id)
                .OrderByDescending(cl => cl.ConsultationDate)
                .ToListAsync();

            int totalConsultations = consultations.Count;
            int recent30 = consultations.Count(cl => cl.ConsultationDate >= cutoff30);
            int recent60 = consultations.Count(cl => cl.ConsultationDate >= cutoff60);
            DateTime? lastConsultation = consultations.FirstOrDefault()?.ConsultationDate;

            int consultationScore =
                recent30 >= 2 ? 100 :
                recent30 >= 1 ? 75 :
                recent60 >= 1 ? 50 :
                totalConsultations > 0 ? 25 : 0;

            // ── Defense ───────────────────────────────────────────────────────
            bool hasDefense = await _db.DefenseSchedules
                .AnyAsync(ds => ds.CapstoneGroupId == group.Id &&
                    ds.Status != DefenseStatus.Cancelled);

            // ── Composite health score (weighted average) ─────────────────────
            // Chapters 35%, Features 25%, Manuscript 25%, Consultations 15%
            double raw = chapterScore  * 0.35
                       + featureScore  * 0.25
                       + manuscriptScore * 0.25
                       + consultationScore * 0.15;

            int healthScore = (int)Math.Round(raw);

            string riskLevel = healthScore >= 80 ? "Excellent"
                : healthScore >= 60 ? "OnTrack"
                : healthScore >= 40 ? "NeedsAttention"
                : "AtRisk";

            // ── Alerts ────────────────────────────────────────────────────────
            var alerts = new List<string>();

            if (group.Status == GroupStatus.Active)
            {
                if (totalChapters == 0)
                    alerts.Add("No chapter submissions have been made.");

                if (underRevision > 0)
                    alerts.Add($"{underRevision} chapter{(underRevision > 1 ? "s" : "")} {(underRevision > 1 ? "are" : "is")} under revision.");

                if (pending > 0)
                    alerts.Add($"{pending} chapter{(pending > 1 ? "s" : "")} {(pending > 1 ? "are" : "is")} awaiting adviser review.");

                if (totalConsultations == 0)
                    alerts.Add("No consultation sessions have been recorded.");
                else if (recent60 == 0)
                    alerts.Add("No consultations in the last 60 days.");

                if (totalFeatures == 0)
                    alerts.Add("System feature tracker has not been set up.");

                if (sections.Count == 0)
                    alerts.Add("Manuscript editor has not been started.");
                else if (sectionsWithContent == 0)
                    alerts.Add("Manuscript sections contain no substantial content.");
            }

            // ── Assemble DTO ─────────────────────────────────────────────────
            var adviserName = group.Adviser is null
                ? "—"
                : $"{group.Adviser.FirstName} {group.Adviser.LastName}".Trim();

            int memberCount = await _db.GroupMembers
                .CountAsync(gm => gm.CapstoneGroupId == group.Id);

            return new GroupHealthDto
            {
                GroupId               = group.Id,
                GroupName             = group.GroupName,
                ProjectTitle          = group.ProjectTitle,
                AdviserName           = adviserName,
                AcademicYear          = group.AcademicYear,
                Status                = group.Status.ToString(),
                HealthScore           = healthScore,
                RiskLevel             = riskLevel,
                ChapterScore          = chapterScore,
                SystemFeatureScore    = featureScore,
                ManuscriptScore       = manuscriptScore,
                ConsultationScore     = consultationScore,
                ApprovedChapters      = approved,
                UnderRevisionChapters = underRevision,
                PendingChapters       = pending,
                TotalChaptersSubmitted = totalChapters,
                CompletedFeatures     = completedFeatures,
                InProgressFeatures    = inProgressFeatures,
                TotalFeatures         = totalFeatures,
                ManuscriptSectionsWithContent = sectionsWithContent,
                TotalManuscriptSections = sections.Count,
                ManuscriptLocked      = group.ManuscriptLocked,
                ManuscriptRevision    = group.ManuscriptRevision,
                LastManuscriptUpdate  = lastManuscriptUpdate,
                TotalConsultations    = totalConsultations,
                ConsultationsLast30Days = recent30,
                LastConsultationDate  = lastConsultation,
                HasDefenseScheduled   = hasDefense,
                MemberCount           = memberCount,
                CreatedAt             = group.CreatedAt,
                Alerts                = alerts,
            };
        }

        // ── Data helpers ──────────────────────────────────────────────────────

        private async Task<List<CapstoneGroup>> LoadGroupsForRoleAsync(string userId, string role)
        {
            var query = _db.CapstoneGroups
                .Include(g => g.Adviser)
                .AsQueryable();

            if (role == "Adviser")
                query = query.Where(g => g.AdviserId == userId);

            return await query.OrderBy(g => g.GroupName).ToListAsync();
        }

        private Task<CapstoneGroup?> LoadGroupAsync(int groupId) =>
            _db.CapstoneGroups
                .Include(g => g.Adviser)
                .FirstOrDefaultAsync(g => g.Id == groupId);
    }
}
