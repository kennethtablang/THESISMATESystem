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
        private readonly IGroupService _groups;

        public ClassroomService(AppDbContext db, INotificationService notifications, IGroupService groups)
        {
            _db = db;
            _notifications = notifications;
            _groups = groups;
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

            var existing = classroom.Enrollments.FirstOrDefault(e => e.StudentId == studentId);
            if (existing is not null)
            {
                if (existing.Status == EnrollmentStatus.Active)
                    throw new InvalidOperationException("You are already enrolled in this classroom.");
                // Invited → accept via code
                existing.Status = EnrollmentStatus.Active;
                await _db.SaveChangesAsync();
                await _db.Entry(classroom).Collection(c => c.Enrollments).LoadAsync();
                return MapClassroomToDto(classroom);
            }

            _db.ClassroomEnrollments.Add(new ClassroomEnrollment
            {
                ClassroomId = classroom.Id,
                StudentId = studentId,
                Status = EnrollmentStatus.Active
            });
            await _db.SaveChangesAsync();
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
                .Where(e => e.StudentId == studentId && e.Status == EnrollmentStatus.Active && e.Classroom.IsActive)
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
                        Email = e.Student.Email ?? string.Empty,
                        StudentId = e.Student.StudentId
                    },
                    JoinedAt = e.JoinedAt,
                    Status = e.Status.ToString(),
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
            // Find the student's active classroom enrollment
            var enrollment = await _db.ClassroomEnrollments
                .Where(e => e.StudentId == studentId && e.Status == EnrollmentStatus.Active && e.Classroom.IsActive)
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

        // ── Create group within classroom ────────────────────────────────────

        public async Task<CapstoneGroupResponseDto> CreateGroupInClassroomAsync(int classroomId, string callerId, string callerRole, CreateGroupInClassroomRequestDto dto)
        {
            var classroom = await _db.Classrooms.FindAsync(classroomId)
                ?? throw new KeyNotFoundException("Classroom not found.");

            // Fix 1: Faculty can only create groups in classrooms they own.
            // Admin/SuperAdmin bypass the ownership check.
            if (callerRole == "Faculty" && classroom.FacultyICId != callerId)
                throw new UnauthorizedAccessException("You do not own this classroom.");

            // Fix 3: Validate that the specified adviser exists and holds the Faculty role.
            var adviserId = !string.IsNullOrWhiteSpace(dto.AdviserId) ? dto.AdviserId : callerId;
            var adviserIsValid = await _db.Users
                .Where(u => u.Id == adviserId)
                .Join(_db.UserRoles, u => u.Id, ur => ur.UserId, (u, ur) => ur.RoleId)
                .Join(_db.Roles, roleId => roleId, r => r.Id, (roleId, r) => r.Name)
                .AnyAsync(name => name == "Faculty");
            if (!adviserIsValid)
                throw new InvalidOperationException("The specified adviser must be an existing Faculty member.");

            var group = new CapstoneGroup
            {
                GroupName = dto.GroupName,
                AdviserId = adviserId,
                AcademicYear = classroom.AcademicYear,
            };

            _db.CapstoneGroups.Add(group);
            await _db.SaveChangesAsync();

            if (dto.MemberIds.Count > 0)
            {
                // Fix 2: Only allow students who are actually enrolled in this classroom.
                // This prevents cross-classroom member manipulation.
                var enrolledIds = await _db.ClassroomEnrollments
                    .Where(e => e.ClassroomId == classroomId && dto.MemberIds.Contains(e.StudentId))
                    .Select(e => e.StudentId)
                    .ToListAsync();

                var unauthorised = dto.MemberIds.Except(enrolledIds).ToList();
                if (unauthorised.Count > 0)
                    throw new InvalidOperationException(
                        $"{unauthorised.Count} submitted member(s) are not enrolled in this classroom.");

                // Remove any existing group memberships for the validated students
                var existing = await _db.GroupMembers
                    .Where(gm => enrolledIds.Contains(gm.UserId))
                    .ToListAsync();
                _db.GroupMembers.RemoveRange(existing);

                _db.GroupMembers.AddRange(enrolledIds.Select(uid => new GroupMember
                {
                    CapstoneGroupId = group.Id,
                    UserId = uid
                }));

                await _db.SaveChangesAsync();
            }

            return await _groups.GetGroupByIdAsync(group.Id)
                ?? throw new InvalidOperationException("Failed to load created group.");
        }

        // ── Admin: all classrooms ────────────────────────────────────────────

        public async Task<IEnumerable<ClassroomResponseDto>> GetAllClassroomsAsync()
        {
            var classrooms = await _db.Classrooms
                .Include(c => c.FacultyIC)
                .Include(c => c.Enrollments)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
            return classrooms.Select(MapClassroomToDto);
        }

        // ── Invite & accept ──────────────────────────────────────────────────

        public async Task InviteStudentsAsync(int classroomId, InviteStudentsRequestDto dto)
        {
            var classroom = await _db.Classrooms
                .Include(c => c.FacultyIC)
                .Include(c => c.Enrollments)
                .FirstOrDefaultAsync(c => c.Id == classroomId && c.IsActive)
                ?? throw new KeyNotFoundException("Classroom not found or inactive.");

            foreach (var studentUserId in dto.StudentIds)
            {
                var existing = classroom.Enrollments.FirstOrDefault(e => e.StudentId == studentUserId);
                if (existing is not null) continue; // already enrolled or invited — skip

                _db.ClassroomEnrollments.Add(new ClassroomEnrollment
                {
                    ClassroomId = classroomId,
                    StudentId = studentUserId,
                    Status = EnrollmentStatus.Invited
                });

                await _notifications.SendAsync(
                    studentUserId,
                    $"You've been invited to join \"{classroom.ClassName}\" ({classroom.AcademicYear}). Open your class page to accept.",
                    NotificationType.ClassroomInvitation
                );
            }
            await _db.SaveChangesAsync();
        }

        public async Task AcceptInvitationAsync(int enrollmentId, string studentId)
        {
            var enrollment = await _db.ClassroomEnrollments
                .FirstOrDefaultAsync(e => e.Id == enrollmentId)
                ?? throw new KeyNotFoundException("Invitation not found.");

            if (enrollment.StudentId != studentId)
                throw new UnauthorizedAccessException();

            enrollment.Status = EnrollmentStatus.Active;
            await _db.SaveChangesAsync();
        }

        public async Task<IEnumerable<ClassroomInvitationDto>> GetMyInvitationsAsync(string studentId)
        {
            var invitations = await _db.ClassroomEnrollments
                .Include(e => e.Classroom).ThenInclude(c => c.FacultyIC)
                .Where(e => e.StudentId == studentId && e.Status == EnrollmentStatus.Invited && e.Classroom.IsActive)
                .OrderByDescending(e => e.JoinedAt)
                .ToListAsync();

            return invitations.Select(e => new ClassroomInvitationDto
            {
                EnrollmentId = e.Id,
                ClassroomId = e.ClassroomId,
                ClassName = e.Classroom.ClassName,
                AcademicYear = e.Classroom.AcademicYear,
                FacultyIC = new UserSummaryDto
                {
                    Id = e.Classroom.FacultyIC.Id,
                    FullName = $"{e.Classroom.FacultyIC.FirstName} {e.Classroom.FacultyIC.LastName}".Trim(),
                    Email = e.Classroom.FacultyIC.Email ?? string.Empty
                },
                InvitedAt = e.JoinedAt
            });
        }

        // ── Active enrolled students (for Add-to-Group filtering) ────────────

        public async Task<IEnumerable<UserSummaryDto>> GetActiveEnrolledStudentsAsync()
        {
            var students = await _db.ClassroomEnrollments
                .Include(e => e.Student)
                .Include(e => e.Classroom)
                .Where(e => e.Status == EnrollmentStatus.Active
                         && e.Classroom.IsActive
                         && e.Student.IsActive)
                .Select(e => e.Student)
                .Distinct()
                .ToListAsync();

            return students.Select(s => new UserSummaryDto
            {
                Id = s.Id,
                FullName = $"{s.FirstName} {s.LastName}".Trim(),
                Email = s.Email ?? string.Empty,
                StudentId = s.StudentId
            });
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
