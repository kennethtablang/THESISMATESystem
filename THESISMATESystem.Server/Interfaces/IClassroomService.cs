using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IClassroomService
    {
        Task<ClassroomResponseDto> CreateClassroomAsync(string facultyICId, CreateClassroomRequestDto dto);
        Task<ClassroomResponseDto?> GetMyClassroomAsync(string facultyICId);
        Task<IEnumerable<ClassroomResponseDto>> GetMyClassroomsAsync(string facultyICId);
        Task<ClassroomResponseDto?> JoinClassroomAsync(string studentId, JoinClassroomRequestDto dto);
        Task<ClassroomResponseDto?> GetStudentClassroomAsync(string studentId);
        Task<IEnumerable<ClassroomEnrollmentResponseDto>> GetEnrollmentsAsync(int classroomId, string callerId, string callerRole);
        Task<AnnouncementResponseDto> PostAnnouncementAsync(int classroomId, string postedById, string callerRole, PostAnnouncementRequestDto dto);
        Task<IEnumerable<AnnouncementResponseDto>> GetAnnouncementsAsync(int classroomId, int? groupId = null);
        Task<IEnumerable<AnnouncementResponseDto>> GetStudentAnnouncementsAsync(string studentId);
        Task AssignStudentsToGroupAsync(string callerId, string callerRole, AssignStudentsToGroupRequestDto dto);
        Task RegenerateJoinCodeAsync(int classroomId, string facultyICId);
        Task<CapstoneGroupResponseDto> CreateGroupInClassroomAsync(int classroomId, string callerId, string callerRole, CreateGroupInClassroomRequestDto dto);
        Task<IEnumerable<ClassroomResponseDto>> GetAllClassroomsAsync();
        Task InviteStudentsAsync(int classroomId, InviteStudentsRequestDto dto);
        Task AcceptInvitationAsync(int enrollmentId, string studentId);
        Task<IEnumerable<ClassroomInvitationDto>> GetMyInvitationsAsync(string studentId);
        Task<IEnumerable<UserSummaryDto>> GetActiveEnrolledStudentsAsync();
    }
}
