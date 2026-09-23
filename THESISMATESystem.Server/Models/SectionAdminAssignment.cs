using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    /// <summary>
    /// The block(s) an Admin/subject teacher takes. The SuperAdmin sets this when it creates the
    /// account, and it is what decides whose student registrations that Admin may approve: a
    /// pending registration is only ever reviewed by an Admin assigned to the block the student
    /// picked on the form.
    /// </summary>
    public class SectionAdminAssignment
    {
        public int Id { get; set; }

        public int SectionId { get; set; }
        public Section Section { get; set; } = null!;

        public string AdminId { get; set; } = string.Empty;
        public ApplicationUser Admin { get; set; } = null!;

        public DateTime AssignedAt { get; set; } = PhilippineTime.Now;
    }
}
