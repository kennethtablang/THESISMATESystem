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
    }
}
