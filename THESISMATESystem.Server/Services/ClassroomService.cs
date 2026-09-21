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

        public async Task<ClassroomResponseDto> CreateClassroomAsync(CreateClassroomRequestDto dto)
        {
            // Classrooms are created by the Admin, who names the section it is offered to and the
            // faculty member teaching it.
            var section = await _db.Sections.FirstOrDefaultAsync(s => s.Id == dto.SectionId && s.IsActive)
                ?? throw new InvalidOperationException("The selected block/section does not exist or is inactive.");

            var teacherIsFaculty = await _db.Users
                .Where(u => u.Id == dto.FacultyId && u.IsActive)
                .AnyAsync(u => _db.UserRoles.Any(ur => ur.UserId == u.Id
                    && _db.Roles.Any(r => r.Id == ur.RoleId && r.Name == "Faculty")));
            if (!teacherIsFaculty)
                throw new InvalidOperationException("The subject teacher must be an active Faculty member.");

            var classroom = new Classroom
            {
                ClassName = dto.ClassName.Trim(),
                AcademicYear = dto.AcademicYear.Trim(),
                JoinCode = await GenerateUniqueJoinCodeAsync(),
                FacultyICId = dto.FacultyId,
                SectionId = section.Id,
            };

            _db.Classrooms.Add(classroom);
            await _db.SaveChangesAsync();

            await _db.Entry(classroom).Reference(c => c.FacultyIC).LoadAsync();
            await _db.Entry(classroom).Reference(c => c.Section).LoadAsync();
            await _db.Entry(classroom).Collection(c => c.Enrollments).LoadAsync();

            try
            {
                await _notifications.SendAsync(dto.FacultyId,
                    $"You have been assigned as subject teacher of \"{classroom.ClassName}\" ({section.Name}).",
                    NotificationType.ClassroomInvitation);
            }
            catch { /* best-effort */ }

            return MapClassroomToDto(classroom);
        }

        // ── Faculty reads ────────────────────────────────────────────────────

        public async Task<ClassroomResponseDto?> GetMyClassroomAsync(string facultyICId)
        {
            var classroom = await _db.Classrooms
                .Include(c => c.FacultyIC)
                .Include(c => c.Section)
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
                .Include(c => c.Section)
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
                .Include(c => c.Section)
                .Include(c => c.Enrollments)
                .FirstOrDefaultAsync(c => c.JoinCode == dto.JoinCode.ToUpper() && c.IsActive)
                ?? throw new KeyNotFoundException("Classroom not found or is inactive.");

            await EnsureStudentInSectionAsync(studentId, classroom);

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

        public async Task<IEnumerable<ClassroomResponseDto>> GetAvailableClassroomsAsync(string studentId)
        {
            var sectionId = await _db.Users.Where(u => u.Id == studentId).Select(u => u.SectionId).FirstOrDefaultAsync();
            if (sectionId is null) return [];

            // Only the classes offered to the student's own section are listed.
            var classrooms = await _db.Classrooms
                .Include(c => c.FacultyIC)
                .Include(c => c.Section)
                .Include(c => c.Enrollments)
                .Where(c => c.IsActive && c.SectionId == sectionId)
                .OrderBy(c => c.ClassName)
                .ToListAsync();

            return classrooms.Select(c =>
            {
                var dto = MapClassroomToDto(c);
                dto.IsEnrolled = c.Enrollments.Any(e => e.StudentId == studentId && e.Status == EnrollmentStatus.Active);
                // The join code is only useful to people already in the class.
                if (dto.IsEnrolled != true) dto.JoinCode = string.Empty;
                return dto;
            });
        }

        public async Task<ClassroomResponseDto> EnrollAsync(string studentId, int classroomId)
        {
            var classroom = await _db.Classrooms
                .Include(c => c.FacultyIC)
                .Include(c => c.Section)
                .Include(c => c.Enrollments)
                .FirstOrDefaultAsync(c => c.Id == classroomId && c.IsActive)
                ?? throw new KeyNotFoundException("Classroom not found or is inactive.");

            await EnsureStudentInSectionAsync(studentId, classroom);

            var existing = classroom.Enrollments.FirstOrDefault(e => e.StudentId == studentId);
            if (existing is { Status: EnrollmentStatus.Active })
                throw new InvalidOperationException("You are already enrolled in this classroom.");

            if (existing is not null) existing.Status = EnrollmentStatus.Active;
            else _db.ClassroomEnrollments.Add(new ClassroomEnrollment
            {
                ClassroomId = classroom.Id,
                StudentId = studentId,
                Status = EnrollmentStatus.Active,
            });

            await _db.SaveChangesAsync();
            await _db.Entry(classroom).Collection(c => c.Enrollments).LoadAsync();
            return MapClassroomToDto(classroom);
        }

        /// <summary>
        /// A student may only be in the classes of their own section. Enforced here on the
        /// server, not just by what the UI lists, so a crafted request cannot cross sections.
        /// Classrooms created before sections existed have no section and stay open.
        /// </summary>
        private async Task EnsureStudentInSectionAsync(string studentId, Classroom classroom)
        {
            if (classroom.SectionId is null) return;

            var studentSection = await _db.Users.Where(u => u.Id == studentId).Select(u => u.SectionId).FirstOrDefaultAsync();
            if (studentSection is null)
                throw new UnauthorizedAccessException("Your account is not assigned to a block/section yet. Please contact the administrator.");
            if (studentSection != classroom.SectionId)
                throw new UnauthorizedAccessException("This class is not offered to your block/section.");
        }

        public async Task<ClassroomResponseDto?> GetStudentClassroomAsync(string studentId)
        {
            var enrollment = await _db.ClassroomEnrollments
                .Include(e => e.Classroom)
                    .ThenInclude(c => c.FacultyIC)
                .Include(e => e.Classroom)
                    .ThenInclude(c => c.Section)
                .Include(e => e.Classroom)
                    .ThenInclude(c => c.Enrollments)
                .Where(e => e.StudentId == studentId && e.Status == EnrollmentStatus.Active && e.Classroom.IsActive)
                .OrderByDescending(e => e.JoinedAt)
                .FirstOrDefaultAsync();

            return enrollment is null ? null : MapClassroomToDto(enrollment.Classroom);
        }

        // ── Enrollments ──────────────────────────────────────────────────────

        public async Task<IEnumerable<ClassroomEnrollmentResponseDto>> GetEnrollmentsAsync(int classroomId, string callerId, string callerRole)
        {
            if (callerRole == "Faculty")
            {
                var ownsClassroom = await _db.Classrooms
                    .AnyAsync(c => c.Id == classroomId && c.FacultyICId == callerId);
                if (!ownsClassroom)
                    throw new UnauthorizedAccessException("You do not own this classroom.");
            }

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

        public async Task<AnnouncementResponseDto> PostAnnouncementAsync(int classroomId, string postedById, string callerRole, PostAnnouncementRequestDto dto)
        {
            var classroom = await _db.Classrooms.FindAsync(classroomId)
                ?? throw new KeyNotFoundException("Classroom not found.");

            if (callerRole == "Faculty" && classroom.FacultyICId != postedById)
                throw new UnauthorizedAccessException("You do not own this classroom.");

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

        public async Task<IEnumerable<AnnouncementResponseDto>> GetAnnouncementsAsync(
            int classroomId, string callerId, string callerRole, int? groupId = null)
        {
            // Announcements can target a specific group, so reading a classroom by id needs the
            // same gate as its enrollments. Students have their own scoped endpoint.
            if (callerRole == "Faculty")
            {
                var ownsClassroom = await _db.Classrooms
                    .AnyAsync(c => c.Id == classroomId && c.FacultyICId == callerId);
                if (!ownsClassroom)
                    throw new UnauthorizedAccessException("You do not own this classroom.");
            }
            else if (callerRole is not ("Admin" or "SuperAdmin"))
            {
                var isEnrolled = await _db.ClassroomEnrollments
                    .AnyAsync(e => e.ClassroomId == classroomId && e.StudentId == callerId);
                if (!isEnrolled)
                    throw new UnauthorizedAccessException("You are not enrolled in this classroom.");
            }

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

        public async Task AssignStudentsToGroupAsync(string callerId, string callerRole, AssignStudentsToGroupRequestDto dto)
        {
            var targetGroup = await _db.CapstoneGroups.FindAsync(dto.GroupId)
                ?? throw new KeyNotFoundException("Group not found.");

            // Faculty may only move students who are enrolled in one of their own classrooms
            if (callerRole == "Faculty")
            {
                var eligibleIds = await _db.ClassroomEnrollments
                    .Where(e => e.Classroom.FacultyICId == callerId && dto.StudentIds.Contains(e.StudentId))
                    .Select(e => e.StudentId)
                    .Distinct()
                    .ToListAsync();

                if (dto.StudentIds.Except(eligibleIds).Any())
                    throw new UnauthorizedAccessException("You can only assign students enrolled in your own classrooms.");
            }

            var sectionIds = await _db.Users
                .Where(u => dto.StudentIds.Contains(u.Id)
                         || _db.GroupMembers.Any(gm => gm.CapstoneGroupId == dto.GroupId && gm.UserId == u.Id && !dto.StudentIds.Contains(u.Id)))
                .Select(u => u.SectionId)
                .Distinct()
                .ToListAsync();
            if (sectionIds.Contains(null))
                throw new InvalidOperationException("Every student must be assigned to a block/section before joining a group.");
            if (sectionIds.Count > 1)
                throw new InvalidOperationException("All members of a group must belong to the same block/section.");

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

        public async Task<CapstoneGroupResponseDto> CreateGroupInClassroomAsync(int classroomId, CreateGroupInClassroomRequestDto dto)
        {
            var classroom = await _db.Classrooms.FindAsync(classroomId)
                ?? throw new KeyNotFoundException("Classroom not found.");

            // Only students enrolled in this classroom may be placed in its groups.
            var memberIds = dto.MemberIds.Distinct().ToList();
            if (memberIds.Count > 0)
            {
                var enrolledIds = await _db.ClassroomEnrollments
                    .Where(e => e.ClassroomId == classroomId && memberIds.Contains(e.StudentId))
                    .Select(e => e.StudentId)
                    .ToListAsync();

                var unauthorised = memberIds.Except(enrolledIds).ToList();
                if (unauthorised.Count > 0)
                    throw new InvalidOperationException(
                        $"{unauthorised.Count} submitted member(s) are not enrolled in this classroom.");
            }

            return await _groups.CreateGroupAsync(new CreateGroupRequestDto
            {
                GroupName = dto.GroupName,
                AdviserId = dto.AdviserId,
                AcademicYear = classroom.AcademicYear,
                MemberIds = memberIds,
                PanelistIds = dto.PanelistIds,
                PanelChairId = dto.PanelChairId,
            });
        }

        // ── Admin: all classrooms ────────────────────────────────────────────

        public async Task<IEnumerable<ClassroomResponseDto>> GetAllClassroomsAsync()
        {
            var classrooms = await _db.Classrooms
                .Include(c => c.FacultyIC)
                .Include(c => c.Section)
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
                .Include(c => c.Section)
                .Include(c => c.Enrollments)
                .FirstOrDefaultAsync(c => c.Id == classroomId && c.IsActive)
                ?? throw new KeyNotFoundException("Classroom not found or inactive.");

            if (classroom.SectionId is not null)
            {
                var outside = await _db.Users
                    .Where(u => dto.StudentIds.Contains(u.Id) && u.SectionId != classroom.SectionId)
                    .Select(u => u.FirstName + " " + u.LastName)
                    .ToListAsync();
                if (outside.Count > 0)
                    throw new InvalidOperationException(
                        $"{string.Join(", ", outside)} {(outside.Count == 1 ? "is" : "are")} not in this class's block/section.");
            }

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

            // A student belongs to at most one active group, so the group picker can grey out
            // the ones already taken instead of offering an "Add" the server will reject.
            var studentIds = students.Select(s => s.Id).ToList();
            var memberships = await _db.GroupMembers
                .Where(gm => studentIds.Contains(gm.UserId) && gm.CapstoneGroup.Status == GroupStatus.Active)
                .Select(gm => new { gm.UserId, gm.CapstoneGroupId, gm.CapstoneGroup.GroupName })
                .ToListAsync();

            // Grouped rather than keyed directly: rows created before one-group-per-student was
            // enforced can still put a student in two active groups, and ToDictionary would throw
            // on the duplicate key — taking down the whole picker over stale data.
            var activeGroupByStudent = memberships
                .GroupBy(m => m.UserId)
                .ToDictionary(g => g.Key, g => g.First());

            return students.Select(s =>
            {
                activeGroupByStudent.TryGetValue(s.Id, out var membership);
                return new UserSummaryDto
                {
                    Id = s.Id,
                    FullName = $"{s.FirstName} {s.LastName}".Trim(),
                    Email = s.Email ?? string.Empty,
                    StudentId = s.StudentId,
                    SectionId = s.SectionId,
                    ActiveGroupId = membership?.CapstoneGroupId,
                    ActiveGroupName = membership?.GroupName,
                };
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
            EnrollmentCount = c.Enrollments.Count,
            SectionId = c.SectionId,
            SectionName = c.Section?.Name,
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
