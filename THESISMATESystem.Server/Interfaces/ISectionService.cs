using THESISMATESystem.Server.Models;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface ISectionService
    {
        // Active sections only, for the public registration form.
        Task<IEnumerable<SectionOptionDto>> GetActiveOptionsAsync();
        Task<IEnumerable<SectionResponseDto>> GetHandledByAsync(string adminId);
        Task<bool> HandlesAsync(string adminId, int sectionId);
        Task EnsureBlockAvailableAsync(string name, string academicYear, string? exceptAdminId);
        Task<Section> AssignAdminToBlockAsync(string adminId, string name, string academicYear);
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
