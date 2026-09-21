using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface ISectionService
    {
        // Active sections only, for the public registration form.
        Task<IEnumerable<SectionOptionDto>> GetActiveOptionsAsync();
        Task<IEnumerable<SectionResponseDto>> GetAllAsync();
        Task<SectionResponseDto> CreateAsync(SaveBlockSectionRequestDto dto);
        Task<SectionResponseDto> UpdateAsync(int id, SaveBlockSectionRequestDto dto);

        Task<IEnumerable<RosterEntryResponseDto>> GetRosterAsync(int sectionId);
        Task<AddRosterResultDto> AddRosterEntriesAsync(int sectionId, AddRosterEntriesRequestDto dto);
        Task<bool> RemoveRosterEntryAsync(int sectionId, int entryId);

        Task<IEnumerable<UserResponseDto>> GetStudentsAsync(int sectionId);
        // Approved students with no section yet, for assigning existing accounts.
        Task<IEnumerable<UserResponseDto>> GetUnassignedStudentsAsync();
        Task AssignStudentsAsync(int sectionId, AssignSectionStudentsRequestDto dto);
    }
}
