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
        ConsultationRequested,
        ConsultationRequestResponded,
        ClassroomAnnouncement,
        ClassroomInvitation,
        ManuscriptUpdated
    }

    public enum DefensePhase
    {
        TitleDefense,
        ProposalDefense,
        FinalDefense
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
}
