using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class ManuscriptFinalizationVote
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public CapstoneGroup CapstoneGroup { get; set; } = null!;
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser User { get; set; } = null!;
        public int Revision { get; set; }
        public DateTime VotedAt { get; set; } = PhilippineTime.Now;
    }
}
