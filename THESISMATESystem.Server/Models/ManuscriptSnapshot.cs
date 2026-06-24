using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    public class ManuscriptSnapshot
    {
        public int Id { get; set; }
        public int CapstoneGroupId { get; set; }
        public CapstoneGroup CapstoneGroup { get; set; } = null!;
        public int Revision { get; set; }
        // JSON: { "chapter1": "<html>...", ... }
        public string SnapshotJson { get; set; } = string.Empty;
        public DateTime SnapshotAt { get; set; } = PhilippineTime.Now;
    }
}
