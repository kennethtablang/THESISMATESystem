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

    // A self-registered student stays PendingApproval, unable to sign in, until an Admin checks
    // them against their section's class list. Accounts created by the SuperAdmin start Approved.
    // Rejected and expired registrations are deleted rather than kept in a third state.
    public enum RegistrationStatus { Approved, PendingApproval }

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
        PanelAssigned,
        RatingOpened,
        // A panel member endorsed, or declined to endorse, a chapter submission.
        ChapterPanelReviewed,
    }

    // Stored as int. PreFinalDefense was inserted in sequence order (migration
    // AddPreFinalDefenseAndReDefenseOf shifts the old FinalDefense=2 / ReDefense=3 rows up by one).
    public enum DefensePhase
    {
        TitleDefense    = 0,
        ProposalDefense = 1,
        PreFinalDefense = 2,
        FinalDefense    = 3,
        ReDefense       = 4
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

    // One adviser's / panelist's verdict on a submitted document (see DocumentReviewDecision).
    public enum DocumentReviewStatus
    {
        Pending,
        Approved,
        NeedsRevision
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
