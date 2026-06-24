using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Interfaces;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Services
{
    public class ClassroomService : IClassroomService
    {
        private readonly AppDbContext _db;
        private readonly INotificationService _notifications;

        public ClassroomService(AppDbContext db, INotificationService notifications)
        {
            _db = db;
            _notifications = notifications;
        }

        // ── Create ──────────────────────────────────────────────────────────

        public async Task<ClassroomResponseDto> CreateClassroomAsync(string facultyICId, CreateClassroomRequestDto dto)
        {
            var joinCode = await GenerateUniqueJoinCodeAsync();

            var classroom = new Classroom
            {
                ClassName = dto.ClassName,
                AcademicYear = dto.AcademicYear,
                JoinCode = joinCode,
                FacultyICId = facultyICId
            };

            _db.Classrooms.Add(classroom);
            await _db.SaveChangesAsync();

            await _db.Entry(classroom).Reference(c => c.FacultyIC).LoadAsync();
            await _db.Entry(classroom).Collection(c => c.Enrollments).LoadAsync();

            return MapClassroomToDto(classroom);
        }

        // ── Faculty reads ────────────────────────────────────────────────────

        public async Task<ClassroomResponseDto?> GetMyClassroomAsync(string facultyICId)
        {
            var classroom = await _db.Classrooms
                .Include(c => c.FacultyIC)
                .Include(c => c.Enrollments)
                .Where(c => c.FacultyICId == facultyICId && c.IsActive)
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync();

            return classroom is null ? null : MapClassroomToDto(classroom);
        }

        public async Task<IEnumerable<ClassroomResponseDto>> GetMyClassroomsAsync(string facultyICId)
        {
            var classrooms = await _db.Classrooms
                .Include(c => c.FacultyIC)
                .Include(c => c.Enrollments)
                .Where(c => c.FacultyICId == facultyICId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return classrooms.Select(MapClassroomToDto);
        }

        // ── Student joins / reads ────────────────────────────────────────────

        public async Task<ClassroomResponseDto?> JoinClassroomAsync(string studentId, JoinClassroomRequestDto dto)
        {
            var classroom = await _db.Classrooms
                .Include(c => c.FacultyIC)
                .Include(c => c.Enrollments)
                .FirstOrDefaultAsync(c => c.JoinCode == dto.JoinCode.ToUpper() && c.IsActive)
                ?? throw new KeyNotFoundException("Classroom not found or is inactive.");

            var alreadyEnrolled = classroom.Enrollments.Any(e => e.StudentId == studentId);
            if (alreadyEnrolled)
                throw new InvalidOperationException("You are already enrolled in this classroom.");

            var enrollment = new ClassroomEnrollment
            {
                ClassroomId = classroom.Id,
                StudentId = studentId
            };

            _db.ClassroomEnrollments.Add(enrollment);
            await _db.SaveChangesAsync();

            // Reload enrollment count
            await _db.Entry(classroom).Collection(c => c.Enrollments).LoadAsync();

            return MapClassroomToDto(classroom);
        }

        public async Task<ClassroomResponseDto?> GetStudentClassroomAsync(string studentId)
        {
            var enrollment = await _db.ClassroomEnrollments
                .Include(e => e.Classroom)
                    .ThenInclude(c => c.FacultyIC)
                .Include(e => e.Classroom)
                    .ThenInclude(c => c.Enrollments)
                .Where(e => e.StudentId == studentId && e.Classroom.IsActive)
                .OrderByDescending(e => e.JoinedAt)
                .FirstOrDefaultAsync();

            return enrollment is null ? null : MapClassroomToDto(enrollment.Classroom);
        }

        // ── Enrollments ──────────────────────────────────────────────────────

        public async Task<IEnumerable<ClassroomEnrollmentResponseDto>> GetEnrollmentsAsync(int classroomId)
        {
            var enrollments = await _db.ClassroomEnrollments
                .Include(e => e.Student)
                .Where(e => e.ClassroomId == classroomId)
                .OrderBy(e => e.Student.LastName)
                .ThenBy(e => e.Student.FirstName)
                .ToListAsync();

            // Get all group memberships for students enrolled in this classroom
            var studentIds = enrollments.Select(e => e.StudentId).ToList();
            var groupMemberships = await _db.GroupMembers
                .Include(gm => gm.CapstoneGroup)
                .Where(gm => studentIds.Contains(gm.UserId))
                .ToListAsync();

            return enrollments.Select(e =>
            {
                var membership = groupMemberships.FirstOrDefault(gm => gm.UserId == e.StudentId);
                return new ClassroomEnrollmentResponseDto
                {
                    Id = e.Id,
                    Student = new UserSummaryDto
                    {
                        Id = e.Student.Id,
                        FullName = $"{e.Student.FirstName} {e.Student.LastName}".Trim(),
                        Email = e.Student.Email ?? string.Empty
                    },
                    JoinedAt = e.JoinedAt,
                    GroupId = membership?.CapstoneGroupId,
                    GroupName = membership?.CapstoneGroup?.GroupName
                };
            });
        }

        // ── Announcements ────────────────────────────────────────────────────

        public async Task<AnnouncementResponseDto> PostAnnouncementAsync(int classroomId, string postedById, PostAnnouncementRequestDto dto)
        {
            _ = await _db.Classrooms.FindAsync(classroomId)
                ?? throw new KeyNotFoundException("Classroom not found.");

            var announcement = new ClassroomAnnouncement
            {
                ClassroomId = classroomId,
                Title = dto.Title,
                Content = dto.Content,
                TargetGroupId = dto.TargetGroupId,
                PostedById = postedById
            };

            _db.ClassroomAnnouncements.Add(announcement);
            await _db.SaveChangesAsync();

            await _db.Entry(announcement).Reference(a => a.PostedBy).LoadAsync();
            if (dto.TargetGroupId.HasValue)
                await _db.Entry(announcement).Reference(a => a.TargetGroup).LoadAsync();

            // Notify relevant students
            List<string> recipientIds;
            if (dto.TargetGroupId.HasValue)
            {
                recipientIds = await _db.GroupMembers
                    .Where(gm => gm.CapstoneGroupId == dto.TargetGroupId.Value)
                    .Select(gm => gm.UserId)
                    .ToListAsync();
            }
            else
            {
                recipientIds = await _db.ClassroomEnrollments
                    .Where(e => e.ClassroomId == classroomId)
                    .Select(e => e.StudentId)
                    .ToListAsync();
            }

            var notificationMessage = $"New announcement: {dto.Title}";
            foreach (var recipientId in recipientIds)
                await _notifications.SendAsync(recipientId, notificationMessage, NotificationType.ClassroomAnnouncement);

            return MapAnnouncementToDto(announcement);
        }

        public async Task<IEnumerable<AnnouncementResponseDto>> GetAnnouncementsAsync(int classroomId, int? groupId = null)
        {
            var query = _db.ClassroomAnnouncements
                .Include(a => a.PostedBy)
                .Include(a => a.TargetGroup)
                .Where(a => a.ClassroomId == classroomId);

            if (groupId.HasValue)
                query = query.Where(a => a.TargetGroupId == null || a.TargetGroupId == groupId.Value);

            var announcements = await query
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return announcements.Select(MapAnnouncementToDto);
        }

        public async Task<IEnumerable<AnnouncementResponseDto>> GetStudentAnnouncementsAsync(string studentId)
        {
            // Find the student's active classroom
            var enrollment = await _db.ClassroomEnrollments
                .Where(e => e.StudentId == studentId && e.Classroom.IsActive)
                .OrderByDescending(e => e.JoinedAt)
                .FirstOrDefaultAsync();

            if (enrollment is null)
                return [];

            // Find student's group if any
            var groupMembership = await _db.GroupMembers
                .Where(gm => gm.UserId == studentId)
                .FirstOrDefaultAsync();

            var query = _db.ClassroomAnnouncements
                .Include(a => a.PostedBy)
                .Include(a => a.TargetGroup)
                .Where(a => a.ClassroomId == enrollment.ClassroomId
                    && (a.TargetGroupId == null
                        || (groupMembership != null && a.TargetGroupId == groupMembership.CapstoneGroupId)));

            var announcements = await query
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return announcements.Select(MapAnnouncementToDto);
        }

        // ── Group assignment ─────────────────────────────────────────────────

        public async Task AssignStudentsToGroupAsync(string facultyICId, AssignStudentsToGroupRequestDto dto)
        {
            var targetGroup = await _db.CapstoneGroups.FindAsync(dto.GroupId)
                ?? throw new KeyNotFoundException("Group not found.");

            foreach (var studentId in dto.StudentIds)
            {
                // Remove existing group membership(s) for this student (any group)
                var existingMemberships = await _db.GroupMembers
                    .Where(gm => gm.UserId == studentId)
                    .ToListAsync();

                _db.GroupMembers.RemoveRange(existingMemberships);

                // Add to target group
                _db.GroupMembers.Add(new GroupMember
                {
                    CapstoneGroupId = dto.GroupId,
                    UserId = studentId
                });
            }

            await _db.SaveChangesAsync();
        }

        // ── Regenerate join code ─────────────────────────────────────────────

        public async Task RegenerateJoinCodeAsync(int classroomId, string facultyICId)
        {
            var classroom = await _db.Classrooms.FindAsync(classroomId)
                ?? throw new KeyNotFoundException("Classroom not found.");

            if (classroom.FacultyICId != facultyICId)
                throw new UnauthorizedAccessException("You do not own this classroom.");

            classroom.JoinCode = await GenerateUniqueJoinCodeAsync();
            await _db.SaveChangesAsync();
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        private async Task<string> GenerateUniqueJoinCodeAsync()
        {
            string code;
            do
            {
                code = GenerateJoinCode();
            }
            while (await _db.Classrooms.AnyAsync(c => c.JoinCode == code));
            return code;
        }

        private static string GenerateJoinCode()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude ambiguous chars
            var rng = RandomNumberGenerator.Create();
            var bytes = new byte[6];
            rng.GetBytes(bytes);
            return new string(bytes.Select(b => chars[b % chars.Length]).ToArray());
        }

        private static ClassroomResponseDto MapClassroomToDto(Classroom c) => new()
        {
            Id = c.Id,
            ClassName = c.ClassName,
            AcademicYear = c.AcademicYear,
            JoinCode = c.JoinCode,
            IsActive = c.IsActive,
            CreatedAt = c.CreatedAt,
            FacultyIC = new UserSummaryDto
            {
                Id = c.FacultyIC.Id,
                FullName = $"{c.FacultyIC.FirstName} {c.FacultyIC.LastName}".Trim(),
                Email = c.FacultyIC.Email ?? string.Empty
            },
            EnrollmentCount = c.Enrollments.Count
        };

        private static AnnouncementResponseDto MapAnnouncementToDto(ClassroomAnnouncement a) => new()
        {
            Id = a.Id,
            Title = a.Title,
            Content = a.Content,
            TargetGroupId = a.TargetGroupId,
            TargetGroupName = a.TargetGroup?.GroupName,
            PostedBy = new UserSummaryDto
            {
                Id = a.PostedBy.Id,
                FullName = $"{a.PostedBy.FirstName} {a.PostedBy.LastName}".Trim(),
                Email = a.PostedBy.Email ?? string.Empty
            },
            CreatedAt = a.CreatedAt
        };
    }
}
