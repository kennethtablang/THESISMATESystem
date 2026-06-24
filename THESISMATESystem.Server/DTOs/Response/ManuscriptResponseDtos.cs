namespace THESISMATESystem.Server.DTOs.Response
{
    public class ManuscriptSectionResponseDto
    {
        public int Id { get; set; }
        public string SectionKey { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public int WordCount { get; set; }
        public DateTime UpdatedAt { get; set; }
        public UserSummaryDto UpdatedBy { get; set; } = null!;
        // Base64 Yjs state sent to the first client joining a collaboration room
        public string? YjsState { get; set; }
    }

    public class ManuscriptVoteStatusDto
    {
        public bool IsLocked { get; set; }
        public int Revision { get; set; }
        public int TotalMembers { get; set; }
        public int VoteCount { get; set; }
        public bool CurrentUserVoted { get; set; }
        public List<VoterSummaryDto> Voters { get; set; } = [];
    }

    public class VoterSummaryDto
    {
        public string FullName { get; set; } = string.Empty;
        public DateTime VotedAt { get; set; }
    }

    public class ManuscriptCommentDto
    {
        public int Id { get; set; }
        public string SectionKey { get; set; } = string.Empty;
        public int Revision { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public UserSummaryDto Author { get; set; } = null!;
        public string AuthorRole { get; set; } = string.Empty;
    }

    public class SectionReviewStatusDto
    {
        public string SectionKey { get; set; } = string.Empty;
        public int CommentCount { get; set; }
        public bool IsReviewed { get; set; }
        public DateTime? LastCommentAt { get; set; }
    }

    public class RevisionHistoryItemDto
    {
        public int Revision { get; set; }
        public int TotalComments { get; set; }
        public int ReviewedSections { get; set; }
        public bool IsComplete { get; set; }
        public DateTime? SnapshotAt { get; set; }
    }

    public class RevisionSummaryDto
    {
        public int CurrentRevision { get; set; }
        public bool IsLocked { get; set; }
        public List<SectionReviewStatusDto> Sections { get; set; } = [];
        public bool IsCurrentRevisionReviewed { get; set; }
        public List<RevisionHistoryItemDto> History { get; set; } = [];
    }

    public class ImageUploadResponseDto
    {
        public string Url { get; set; } = string.Empty;
    }
}
