using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Interfaces;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Services
{
    public class SectionService : ISectionService
    {
        private readonly AppDbContext _db;

        public SectionService(AppDbContext db) => _db = db;

        public async Task<IEnumerable<SectionOptionDto>> GetActiveOptionsAsync()
            => await _db.Sections
                .Where(s => s.IsActive)
                .OrderBy(s => s.Name)
                .Select(s => new SectionOptionDto { Id = s.Id, Name = s.Name, AcademicYear = s.AcademicYear })
                .ToListAsync();

        public async Task<IEnumerable<SectionResponseDto>> GetAllAsync()
            => await ProjectSections(_db.Sections)
                .OrderByDescending(s => s.IsActive)
                .ThenBy(s => s.Name)
                .ToListAsync();

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

            // Normalise first so "2021-001 " and "2021-001" count as the same ID.
            var incoming = dto.Entries
                .Select(e => new { Number = e.StudentNumber.Trim(), Name = string.IsNullOrWhiteSpace(e.FullName) ? null : e.FullName.Trim() })
                .Where(e => e.Number.Length > 0)
                .GroupBy(e => e.Number, StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .ToList();

            var numbers = incoming.Select(e => e.Number).ToList();
            var existing = await _db.SectionRosterEntries
                .Where(r => numbers.Contains(r.StudentNumber))
                .Select(r => r.StudentNumber)
                .ToListAsync();
            var taken = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);

            var result = new AddRosterResultDto();
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

            foreach (var student in students) student.SectionId = sectionId;
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
