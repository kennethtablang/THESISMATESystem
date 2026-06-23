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
        Task<IEnumerable<ClassroomEnrollmentResponseDto>> GetEnrollmentsAsync(int classroomId);
        Task<AnnouncementResponseDto> PostAnnouncementAsync(int classroomId, string postedById, PostAnnouncementRequestDto dto);
        Task<IEnumerable<AnnouncementResponseDto>> GetAnnouncementsAsync(int classroomId, int? groupId = null);
        Task<IEnumerable<AnnouncementResponseDto>> GetStudentAnnouncementsAsync(string studentId);
        Task AssignStudentsToGroupAsync(string facultyICId, AssignStudentsToGroupRequestDto dto);
        Task RegenerateJoinCodeAsync(int classroomId, string facultyICId);
    }
}
