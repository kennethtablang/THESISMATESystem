using System.ComponentModel.DataAnnotations;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class SaveBlockSectionRequestDto
    {
        [Required, MaxLength(100)] public string Name { get; set; } = string.Empty;
        [Required, MaxLength(20)]  public string AcademicYear { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }

    public class RosterEntryRequestDto
    {
        [Required, MaxLength(50)] public string StudentNumber { get; set; } = string.Empty;
        [MaxLength(200)]          public string? FullName { get; set; }
    }

    public class AddRosterEntriesRequestDto
    {
        [Required, MinLength(1)] public List<RosterEntryRequestDto> Entries { get; set; } = [];
    }

    public class AssignSectionStudentsRequestDto
    {
        [Required, MinLength(1)] public List<string> UserIds { get; set; } = [];
    }
}
