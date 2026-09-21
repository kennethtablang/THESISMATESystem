using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    /// <summary>
    /// One line of a section's official class list (masterlist). A registration is only approved
    /// when its Student ID appears here, which is how the Admin confirms the person is enrolled.
    /// </summary>
    public class SectionRosterEntry
    {
        public int Id { get; set; }
        public int SectionId { get; set; }
        public Section Section { get; set; } = null!;

        // The school-issued ID number. Unique across all sections: one student, one block.
        public string StudentNumber { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public DateTime AddedAt { get; set; } = PhilippineTime.Now;
    }
}
