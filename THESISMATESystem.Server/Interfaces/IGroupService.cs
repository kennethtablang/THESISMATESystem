using Microsoft.AspNetCore.Http;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IGroupService
    {
        Task<CapstoneGroupResponseDto> CreateGroupAsync(CreateGroupRequestDto dto);
        Task<CapstoneGroupResponseDto?> GetGroupByIdAsync(int id);
        Task<IEnumerable<CapstoneGroupResponseDto>> GetAllGroupsAsync(GroupStatus? status = null);
        Task<IEnumerable<CapstoneGroupResponseDto>> GetGroupsByAdviserAsync(string adviserId);
        Task<CapstoneGroupResponseDto?> GetGroupByStudentAsync(string studentId);
        Task<CapstoneGroupResponseDto> UpdateGroupAsync(int id, UpdateGroupRequestDto dto);
        Task<bool> ArchiveGroupAsync(int id);
        Task<CapstoneGroupResponseDto> UpdateVersionAsync(string studentId, UpdateVersionRequestDto dto);
        Task<CapstoneGroupResponseDto> UploadLogoAsync(int groupId, IFormFile file, string callerId, string callerRole);
        Task<(byte[] bytes, string contentType)?> GetLogoAsync(int groupId);
        Task<CapstoneGroupResponseDto> AddMemberAsync(int groupId, string userId);
        Task<CapstoneGroupResponseDto> RemoveMemberAsync(int groupId, string userId);
        Task<CapstoneGroupResponseDto> SetDeadlinesAsync(int groupId, SetGroupDeadlinesRequestDto dto);

        Task<bool> CanAccessGroupAsync(string userId, string role, int groupId);
        Task<IEnumerable<GroupDeadlineResponseDto>> GetDeadlinesAsync(int groupId);
        Task<GroupDeadlineResponseDto> CreateDeadlineAsync(string userId, string role, int groupId, CreateGroupDeadlineRequestDto dto);
        Task<GroupDeadlineResponseDto> UpdateDeadlineAsync(string userId, string role, int groupId, int deadlineId, UpdateGroupDeadlineRequestDto dto);
        Task<bool> DeleteDeadlineAsync(string userId, string role, int groupId, int deadlineId);

        Task<IEnumerable<CapstoneGroupResponseDto>> GetGroupsByPanelistAsync(string panelistId);
        Task<CapstoneGroupResponseDto> SetDefenseOutcomeAsync(int groupId, SetGroupDefenseOutcomeRequestDto dto);
    }
}
