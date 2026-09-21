using THESISMATESystem.Server.Helpers;

namespace THESISMATESystem.Server.Models
{
    /// <summary>
    /// A block/section such as "BSIT 4A". Students belong to exactly one section, and a
    /// classroom is offered to one section, so a student only ever sees their own classes.
    /// </summary>
    public class Section
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = PhilippineTime.Now;

        public ICollection<ApplicationUser> Students { get; set; } = [];
        public ICollection<SectionRosterEntry> Roster { get; set; } = [];
        public ICollection<Classroom> Classrooms { get; set; } = [];
    }
}
