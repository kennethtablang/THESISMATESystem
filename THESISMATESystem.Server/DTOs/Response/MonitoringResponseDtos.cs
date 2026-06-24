namespace THESISMATESystem.Server.DTOs.Response
{
    public class GroupHealthDto
    {
        public int GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string? ProjectTitle { get; set; }
        public string AdviserName { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;

        // Composite score (0-100) and risk classification
        public int HealthScore { get; set; }
        public string RiskLevel { get; set; } = string.Empty;  // Excellent | OnTrack | NeedsAttention | AtRisk

        // Sub-scores (0-100), each representing one dimension
        public int ChapterScore { get; set; }
        public int SystemFeatureScore { get; set; }
        public int ManuscriptScore { get; set; }
        public int ConsultationScore { get; set; }

        // Chapter details
        public int ApprovedChapters { get; set; }
        public int UnderRevisionChapters { get; set; }
        public int PendingChapters { get; set; }
        public int TotalChaptersSubmitted { get; set; }

        // System feature details
        public int CompletedFeatures { get; set; }
        public int InProgressFeatures { get; set; }
        public int TotalFeatures { get; set; }

        // Manuscript details
        public int ManuscriptSectionsWithContent { get; set; }
        public int TotalManuscriptSections { get; set; }
        public bool ManuscriptLocked { get; set; }
        public int ManuscriptRevision { get; set; }
        public DateTime? LastManuscriptUpdate { get; set; }

        // Consultation details
        public int TotalConsultations { get; set; }
        public int ConsultationsLast30Days { get; set; }
        public DateTime? LastConsultationDate { get; set; }

        // Defense
        public bool HasDefenseScheduled { get; set; }

        public int MemberCount { get; set; }
        public DateTime CreatedAt { get; set; }

        public List<string> Alerts { get; set; } = [];
    }

    public class MonitoringSummaryDto
    {
        public int TotalGroups { get; set; }
        public int ExcellentCount { get; set; }
        public int OnTrackCount { get; set; }
        public int NeedsAttentionCount { get; set; }
        public int AtRiskCount { get; set; }
        public int AverageHealthScore { get; set; }
        public IEnumerable<GroupHealthDto> Groups { get; set; } = [];
    }
}
