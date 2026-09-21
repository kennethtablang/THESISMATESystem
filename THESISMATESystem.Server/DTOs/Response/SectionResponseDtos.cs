namespace THESISMATESystem.Server.DTOs.Response
{
    public class SectionOptionDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
    }

    public class SectionResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int StudentCount { get; set; }
        public int RosterCount { get; set; }
        public int ClassroomCount { get; set; }
    }

    public class RosterEntryResponseDto
    {
        public int Id { get; set; }
        public string StudentNumber { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public DateTime AddedAt { get; set; }
        // The approved account registered under this Student ID, if any.
        public string? RegisteredUserId { get; set; }
        public string? RegisteredName { get; set; }
    }

    public class AddRosterResultDto
    {
        public int Added { get; set; }
        // Student IDs skipped because they are already on this or another section's list.
        public List<string> Skipped { get; set; } = [];
    }
}
