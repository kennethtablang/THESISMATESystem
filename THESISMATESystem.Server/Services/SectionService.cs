using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;
using THESISMATESystem.Server.Interfaces;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Services
{
    public class SectionService : ISectionService
    {
        private readonly AppDbContext _db;

        private readonly IClassroomService _classrooms;

        public SectionService(AppDbContext db, IClassroomService classrooms)
        {
            _db = db;
            _classrooms = classrooms;
        }

        // The registration form lists a block only once an active Admin/subject teacher handles
        // it, so there are exactly as many blocks to pick from as there are Admins.
        public async Task<IEnumerable<SectionOptionDto>> GetActiveOptionsAsync()
            => await _db.Sections
                .Where(s => s.IsActive && s.AdminAssignments.Any(a => a.Admin.IsActive))
                .OrderBy(s => s.Name)
                .Select(s => new SectionOptionDto { Id = s.Id, Name = s.Name, AcademicYear = s.AcademicYear })
                .ToListAsync();

        public async Task<IEnumerable<SectionResponseDto>> GetAllAsync()
            => await ProjectSections(_db.Sections)
                .OrderByDescending(s => s.IsActive)
                .ThenBy(s => s.Name)
                .ToListAsync();

        public async Task<IEnumerable<SectionResponseDto>> GetHandledByAsync(string adminId)
            => await ProjectSections(_db.Sections.Where(s => s.AdminAssignments.Any(a => a.AdminId == adminId)))
                .OrderBy(s => s.Name)
                .ToListAsync();

        public Task<bool> HandlesAsync(string adminId, int sectionId)
            => _db.SectionAdminAssignments.AnyAsync(a => a.AdminId == adminId && a.SectionId == sectionId);

        private static string NormalizeBlockName(string name)
            => string.Join(' ', name.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

        private Task<Section?> FindBlockAsync(string name, string academicYear)
        {
            var n = NormalizeBlockName(name).ToLower();
            var ay = academicYear.Trim().ToLower();
            return _db.Sections.FirstOrDefaultAsync(s => s.Name.ToLower() == n && s.AcademicYear.ToLower() == ay);
        }

        public async Task EnsureBlockAvailableAsync(string name, string academicYear, string? exceptAdminId)
        {
            var block = await FindBlockAsync(name, academicYear);
            if (block is null) return;

            var holder = await _db.SectionAdminAssignments
                .Where(a => a.SectionId == block.Id && a.Admin.IsActive && a.AdminId != exceptAdminId)
                .Select(a => a.Admin.FirstName + " " + a.Admin.LastName)
                .FirstOrDefaultAsync();
            if (holder is not null)
                throw new InvalidOperationException(
                    $"{block.Name} ({block.AcademicYear}) already has an Admin/subject teacher: {holder}. A block can only have one.");
        }

        /// <summary>
        /// Makes the typed block the Admin's one block: creates it when new, reopens it when it
        /// was closed, drops any earlier block assignment, and gives the block a classroom so its
        /// students have a My Class page.
        /// </summary>
        public async Task<Section> AssignAdminToBlockAsync(string adminId, string name, string academicYear)
        {
            var block = await FindBlockAsync(name, academicYear);
            if (block is null)
            {
                block = new Section { Name = NormalizeBlockName(name), AcademicYear = academicYear.Trim() };
                _db.Sections.Add(block);
            }
            block.IsActive = true;

            var previous = await _db.SectionAdminAssignments.Where(a => a.AdminId == adminId).ToListAsync();
            _db.SectionAdminAssignments.RemoveRange(previous.Where(a => a.SectionId != block.Id));
            // Assignments of deactivated Admins would otherwise keep a second name on the block.
            if (block.Id != 0)
                _db.SectionAdminAssignments.RemoveRange(await _db.SectionAdminAssignments
                    .Where(a => a.SectionId == block.Id && a.AdminId != adminId).ToListAsync());
            await _db.SaveChangesAsync();

            if (!previous.Any(a => a.SectionId == block.Id))
            {
                _db.SectionAdminAssignments.Add(new SectionAdminAssignment { SectionId = block.Id, AdminId = adminId });
                await _db.SaveChangesAsync();
            }

            await _classrooms.EnsureBlockClassroomAsync(block.Id, adminId);
            return block;
        }

        public async Task<SectionResponseDto> CreateAsync(SaveBlockSectionRequestDto dto)
        {
            var name = dto.Name.Trim();
            var year = dto.AcademicYear.Trim();
            await EnsureUniqueNameAsync(name, year, excludingId: null);

            var section = new Section { Name = name, AcademicYear = year, IsActive = dto.IsActive };
            _db.Sections.Add(section);
            await _db.SaveChangesAsync();
            return await LoadAsync(section.Id);
        }

        public async Task<SectionResponseDto> UpdateAsync(int id, SaveBlockSectionRequestDto dto)
        {
            var section = await _db.Sections.FindAsync(id)
                ?? throw new KeyNotFoundException("Section not found.");

            var name = dto.Name.Trim();
            var year = dto.AcademicYear.Trim();
            await EnsureUniqueNameAsync(name, year, excludingId: id);

            section.Name = name;
            section.AcademicYear = year;
            section.IsActive = dto.IsActive;
            await _db.SaveChangesAsync();
            return await LoadAsync(id);
        }

        // ── Class list (roster) ─────────────────────────────────────────────

        public async Task<IEnumerable<RosterEntryResponseDto>> GetRosterAsync(int sectionId)
        {
            await EnsureExistsAsync(sectionId);

            var entries = await _db.SectionRosterEntries
                .Where(r => r.SectionId == sectionId)
                .OrderBy(r => r.StudentNumber)
                .ToListAsync();

            var numbers = entries.Select(e => e.StudentNumber).ToList();
            var accounts = await _db.Users
                .Where(u => u.StudentId != null && numbers.Contains(u.StudentId)
                         && u.RegistrationStatus == RegistrationStatus.Approved)
                .Select(u => new { u.Id, u.StudentId, u.FirstName, u.LastName })
                .ToListAsync();
            var byNumber = accounts.ToDictionary(a => a.StudentId!, StringComparer.OrdinalIgnoreCase);

            return entries.Select(e =>
            {
                byNumber.TryGetValue(e.StudentNumber, out var account);
                return new RosterEntryResponseDto
                {
                    Id = e.Id,
                    StudentNumber = e.StudentNumber,
                    FullName = e.FullName,
                    AddedAt = e.AddedAt,
                    RegisteredUserId = account?.Id,
                    RegisteredName = account is null ? null : $"{account.FirstName} {account.LastName}".Trim(),
                };
            });
        }

        public async Task<AddRosterResultDto> AddRosterEntriesAsync(int sectionId, AddRosterEntriesRequestDto dto)
        {
            await EnsureExistsAsync(sectionId);

            // Normalise first so "23-ln-5825 " and "23-LN-5825" count as the same ID.
            var normalised = dto.Entries
                .Select(e => new { Number = StudentIdFormat.Normalize(e.StudentNumber), Name = string.IsNullOrWhiteSpace(e.FullName) ? null : e.FullName.Trim() })
                .Where(e => e.Number.Length > 0)
                .ToList();

            // Registration only accepts the official format, so a class-list number in any other
            // shape could never be matched to a student. Report it instead of storing it.
            var result = new AddRosterResultDto
            {
                Invalid = normalised.Where(e => !StudentIdFormat.IsValid(e.Number)).Select(e => e.Number).Distinct().ToList(),
            };

            var incoming = normalised
                .Where(e => StudentIdFormat.IsValid(e.Number))
                .GroupBy(e => e.Number, StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .ToList();

            var numbers = incoming.Select(e => e.Number).ToList();
            var existing = await _db.SectionRosterEntries
                .Where(r => numbers.Contains(r.StudentNumber))
                .Select(r => r.StudentNumber)
                .ToListAsync();
            var taken = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);

            foreach (var entry in incoming)
            {
                // A student belongs to one section, so an ID already listed anywhere is skipped
                // rather than silently moved between blocks.
                if (taken.Contains(entry.Number)) { result.Skipped.Add(entry.Number); continue; }

                _db.SectionRosterEntries.Add(new SectionRosterEntry
                {
                    SectionId = sectionId,
                    StudentNumber = entry.Number,
                    FullName = entry.Name,
                });
                result.Added++;
            }

            await _db.SaveChangesAsync();
            return result;
        }

        public async Task<bool> RemoveRosterEntryAsync(int sectionId, int entryId)
        {
            var entry = await _db.SectionRosterEntries
                .FirstOrDefaultAsync(r => r.Id == entryId && r.SectionId == sectionId);
            if (entry is null) return false;

            _db.SectionRosterEntries.Remove(entry);
            await _db.SaveChangesAsync();
            return true;
        }

        // ── Students ────────────────────────────────────────────────────────

        public async Task<IEnumerable<UserResponseDto>> GetStudentsAsync(int sectionId)
        {
            await EnsureExistsAsync(sectionId);
            return await ProjectStudents(_db.Users.Where(u => u.SectionId == sectionId
                && u.RegistrationStatus == RegistrationStatus.Approved)).ToListAsync();
        }

        public async Task<IEnumerable<UserResponseDto>> GetUnassignedStudentsAsync()
            => await ProjectStudents(_db.Users.Where(u => u.SectionId == null
                && u.RegistrationStatus == RegistrationStatus.Approved)).ToListAsync();

        public async Task AssignStudentsAsync(int sectionId, AssignSectionStudentsRequestDto dto)
        {
            var section = await _db.Sections.FindAsync(sectionId)
                ?? throw new KeyNotFoundException("Section not found.");
            if (!section.IsActive)
                throw new InvalidOperationException("Students cannot be assigned to an inactive section.");

            var studentRoleId = await _db.Roles.Where(r => r.Name == "Student").Select(r => r.Id).FirstAsync();
            var students = await _db.Users
                .Where(u => dto.UserIds.Contains(u.Id)
                         && _db.UserRoles.Any(ur => ur.UserId == u.Id && ur.RoleId == studentRoleId))
                .ToListAsync();

            if (students.Count != dto.UserIds.Distinct().Count())
                throw new InvalidOperationException("Only student accounts can be assigned to a section.");

            // Moving a student who is already in a class of their old section would leave them
            // enrolled somewhere they can no longer see, so those moves are refused.
            var movingIds = students.Where(s => s.SectionId != null && s.SectionId != sectionId).Select(s => s.Id).ToList();
            if (movingIds.Count > 0)
            {
                var enrolledElsewhere = await _db.ClassroomEnrollments
                    .AnyAsync(e => movingIds.Contains(e.StudentId) && e.Classroom.SectionId != null && e.Classroom.SectionId != sectionId);
                if (enrolledElsewhere)
                    throw new InvalidOperationException("One or more students are enrolled in a class of their current section. Remove them from that class first.");
            }

            foreach (var student in students)
            {
                student.SectionId = sectionId;
                await _classrooms.EnrollInBlockClassroomAsync(student.Id, sectionId, save: false);
            }
            await _db.SaveChangesAsync();
        }

        // ── Helpers ─────────────────────────────────────────────────────────

        private IQueryable<SectionResponseDto> ProjectSections(IQueryable<Section> query)
            => query.Select(s => new SectionResponseDto
            {
                Id = s.Id,
                Name = s.Name,
                AcademicYear = s.AcademicYear,
                IsActive = s.IsActive,
                CreatedAt = s.CreatedAt,
                StudentCount = s.Students.Count(u => u.RegistrationStatus == RegistrationStatus.Approved),
                RosterCount = s.Roster.Count,
                ClassroomCount = s.Classrooms.Count,
                GroupCount = _db.CapstoneGroups.Count(g => g.SectionId == s.Id && g.Status == GroupStatus.Active),
                AdminName = s.AdminAssignments
                    .Where(a => a.Admin.IsActive)
                    .Select(a => a.Admin.FirstName + " " + a.Admin.LastName)
                    .FirstOrDefault(),
            });

        private IQueryable<UserResponseDto> ProjectStudents(IQueryable<ApplicationUser> query)
        {
            var studentRoleId = _db.Roles.Where(r => r.Name == "Student").Select(r => r.Id);
            return query
                .Where(u => _db.UserRoles.Any(ur => ur.UserId == u.Id && studentRoleId.Contains(ur.RoleId)))
                .OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
                .Select(u => new UserResponseDto
                {
                    Id = u.Id,
                    FirstName = u.FirstName,
                    MiddleName = u.MiddleName,
                    LastName = u.LastName,
                    Email = u.Email ?? string.Empty,
                    StudentId = u.StudentId,
                    Role = "Student",
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    SectionId = u.SectionId,
                    SectionName = u.Section != null ? u.Section.Name : null,
                });
        }

        private async Task<SectionResponseDto> LoadAsync(int id)
            => await ProjectSections(_db.Sections.Where(s => s.Id == id)).FirstAsync();

        private async Task EnsureExistsAsync(int id)
        {
            if (!await _db.Sections.AnyAsync(s => s.Id == id))
                throw new KeyNotFoundException("Section not found.");
        }

        private async Task EnsureUniqueNameAsync(string name, string year, int? excludingId)
        {
            var duplicate = await _db.Sections.AnyAsync(s =>
                s.Name == name && s.AcademicYear == year && (excludingId == null || s.Id != excludingId));
            if (duplicate)
                throw new InvalidOperationException($"A section named \"{name}\" already exists for {year}.");
        }
    }
}
