namespace THESISMATESystem.Server.Enums
{
    public enum UserRole
    {
        SuperAdmin,
        Admin,
        Faculty,
        Student,
    }

    public enum ChapterStatus
    {
        PendingReview,
        UnderRevision,
        Approved
    }

    public enum ConsultationMode
    {
        InPerson,
        Online
    }

    public enum DefenseStatus
    {
        Scheduled,
        Rescheduled,
        Cancelled,
        Completed
    }

    public enum EnrollmentStatus { Active, Invited }

    public enum NotificationType
    {
        ChapterSubmitted,
        ChapterStatusUpdated,
        RevisionNoteAdded,
        ConsultationLogged,
        DefenseScheduled,
        DefenseRescheduled,
        DefenceCancelled,
        RatingSubmitted,
        DocumentUploaded,
        DocumentCommented,
        DocumentSubmitted,
        DocumentStatusUpdated,
        ConsultationRequested,
        ConsultationRequestResponded,
        ClassroomAnnouncement,
        ClassroomInvitation,
        ManuscriptUpdated,
        DeadlinePosted,
        SystemFeatureCommented,
        SystemFeatureStatusUpdated,
    }

    public enum DefensePhase
    {
        TitleDefense,
        ProposalDefense,
        FinalDefense,
        ReDefense
    }

    public enum DefenseOutcome
    {
        Pending,
        Defended,
        NotDefended
    }

    public enum RevisionLevel
    {
        None,
        MinorRevisions,
        MajorRevisions
    }

    public enum FeatureUrgency
    {
        Low,
        Medium,
        High,
        Critical
    }

    public enum GroupStatus
    {
        Active,
        Completed,
        Archived
    }

    public enum FeatureType
    {
        Functional,
        NonFunctional
    }

    public enum SystemFeatureStatus
    {
        NotStarted,
        InProgress,
        Completed,
        NeedsRevision
    }

    public enum StudentTestStatus
    {
        NotTested,
        Passed,
        Failed
    }

    public enum ConsultationScheduleStatus
    {
        Open,
        Full,
        Closed,
        Cancelled
    }

    public enum ConsultationRequestStatus
    {
        Pending,
        Approved,
        Rejected
    }

    public enum DocumentSubmissionStatus
    {
        Draft,
        SubmittedForReview,
        NeedsRevision,
        Approved
    }

    public enum DocumentSection
    {
        TitlePage = 1,
        ApprovalSheet = 2,
        Abstract = 3,
        Acknowledgement = 4,
        Dedication = 5,
        TableOfContents = 6,
        ListOfTables = 7,
        ListOfFigures = 8,
        Chapter1 = 9,
        Chapter2 = 10,
        Chapter3 = 11,
        Chapter4 = 12,
        Chapter5 = 13,
        References = 14,
        Appendices = 15,
    }
}
