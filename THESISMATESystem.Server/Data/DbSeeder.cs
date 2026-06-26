using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(IServiceProvider services)
        {
            using var scope = services.CreateScope();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var db          = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            await SeedRolesAsync(roleManager);
            await SeedUsersAsync(userManager);
            await SeedClassroomAsync(db, userManager);
            await SeedGroupsAsync(db, userManager);
        }

        // ── Roles ─────────────────────────────────────────────────────────────

        private static async Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
        {
            string[] validRoles = ["SuperAdmin", "Admin", "Faculty", "Student"];

            // Remove any stale roles from the pre-unification era
            string[] obsoleteRoles = ["Adviser", "FacultyIC", "Panel"];
            foreach (var name in obsoleteRoles)
            {
                var old = await roleManager.FindByNameAsync(name);
                if (old is not null) await roleManager.DeleteAsync(old);
            }

            foreach (var role in validRoles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        // ── Users ──────────────────────────────────────────────────────────────

        private static async Task SeedUsersAsync(UserManager<ApplicationUser> userManager)
        {
            // SuperAdmin
            await CreateUser(userManager, "superadmin@thesismate.edu", "superadmin",
                "Super", "Admin", "SuperAdmin@1", "SuperAdmin");

            // Admin
            await CreateUser(userManager, "admin@psu.edu.ph", "admin",
                "Maria", "Santos", "Admin@12345", "Admin");

            // Faculty — faculty1 acts as FIC, faculty2-4 as advisers, faculty5 as panelist
            await CreateUser(userManager, "faculty1@psu.edu.ph", "faculty1",
                "Jose", "Reyes", "Faculty@123", "Faculty");
            await CreateUser(userManager, "faculty2@psu.edu.ph", "faculty2",
                "Ana", "Cruz", "Faculty@123", "Faculty");
            await CreateUser(userManager, "faculty3@psu.edu.ph", "faculty3",
                "Roberto", "Dela Cruz", "Faculty@123", "Faculty");
            await CreateUser(userManager, "faculty4@psu.edu.ph", "faculty4",
                "Carlos", "Mendoza", "Faculty@123", "Faculty");
            await CreateUser(userManager, "faculty5@psu.edu.ph", "faculty5",
                "Liza", "Bautista", "Faculty@123", "Faculty");

            // Students — 12 total, 4 per group
            await CreateUser(userManager, "student1@psu.edu.ph",  "student1",  "Juan",     "Dela Torre",   "Student@123", "Student");
            await CreateUser(userManager, "student2@psu.edu.ph",  "student2",  "Maria",    "Garcia",       "Student@123", "Student");
            await CreateUser(userManager, "student3@psu.edu.ph",  "student3",  "Pedro",    "Reyes",        "Student@123", "Student");
            await CreateUser(userManager, "student4@psu.edu.ph",  "student4",  "Elena",    "Villanueva",   "Student@123", "Student");
            await CreateUser(userManager, "student5@psu.edu.ph",  "student5",  "Miguel",   "Santos",       "Student@123", "Student");
            await CreateUser(userManager, "student6@psu.edu.ph",  "student6",  "Clara",    "Bautista",     "Student@123", "Student");
            await CreateUser(userManager, "student7@psu.edu.ph",  "student7",  "Ricardo",  "Gomez",        "Student@123", "Student");
            await CreateUser(userManager, "student8@psu.edu.ph",  "student8",  "Sofia",    "Mendoza",      "Student@123", "Student");
            await CreateUser(userManager, "student9@psu.edu.ph",  "student9",  "Andres",   "Torres",       "Student@123", "Student");
            await CreateUser(userManager, "student10@psu.edu.ph", "student10", "Lourdes",  "Fernandez",    "Student@123", "Student");
            await CreateUser(userManager, "student11@psu.edu.ph", "student11", "Marcos",   "Ramos",        "Student@123", "Student");
            await CreateUser(userManager, "student12@psu.edu.ph", "student12", "Isabela",  "Aquino",       "Student@123", "Student");
        }

        // ── Classroom ──────────────────────────────────────────────────────────

        private static async Task SeedClassroomAsync(AppDbContext db, UserManager<ApplicationUser> userManager)
        {
            if (await db.Classrooms.AnyAsync()) return;

            var fic = await userManager.FindByEmailAsync("faculty1@psu.edu.ph");
            if (fic is null) return;

            var classroom = new Classroom
            {
                ClassName    = "BSIT Capstone 2025-2026",
                AcademicYear = "2025-2026",
                JoinCode     = "PSU001",
                FacultyICId  = fic.Id,
                IsActive     = true,
            };
            db.Classrooms.Add(classroom);
            await db.SaveChangesAsync();

            // Enroll all 12 students
            for (int i = 1; i <= 12; i++)
            {
                var student = await userManager.FindByEmailAsync($"student{i}@psu.edu.ph");
                if (student is null) continue;
                db.ClassroomEnrollments.Add(new ClassroomEnrollment
                {
                    ClassroomId = classroom.Id,
                    StudentId   = student.Id,
                });
            }
            await db.SaveChangesAsync();
        }

        // ── Capstone groups ────────────────────────────────────────────────────

        private static async Task SeedGroupsAsync(AppDbContext db, UserManager<ApplicationUser> userManager)
        {
            if (await db.CapstoneGroups.AnyAsync()) return;

            var adviser2 = await userManager.FindByEmailAsync("faculty2@psu.edu.ph");
            var adviser3 = await userManager.FindByEmailAsync("faculty3@psu.edu.ph");
            var adviser4 = await userManager.FindByEmailAsync("faculty4@psu.edu.ph");
            if (adviser2 is null || adviser3 is null || adviser4 is null) return;

            // Group 1 — AquaTrack (strong: 3 consultations in last 30 days → score 100)
            var group1 = new CapstoneGroup
            {
                GroupName    = "AquaTrack",
                ProjectTitle = "Smart Aquaculture Monitoring System",
                AcademicYear = "2025-2026",
                AdviserId    = adviser2.Id,
                TitleApproved = true,
                Status       = GroupStatus.Active,
            };

            // Group 2 — EduSync (moderate: 1 consultation in last 30 days → score 75)
            var group2 = new CapstoneGroup
            {
                GroupName    = "EduSync",
                ProjectTitle = "Integrated School Management Platform",
                AcademicYear = "2025-2026",
                AdviserId    = adviser3.Id,
                TitleApproved = true,
                Status       = GroupStatus.Active,
            };

            // Group 3 — GreenPath (at risk: no consultations in last 60 days → score 0)
            var group3 = new CapstoneGroup
            {
                GroupName    = "GreenPath",
                ProjectTitle = "Eco-Friendly Campus Navigation App",
                AcademicYear = "2025-2026",
                AdviserId    = adviser4.Id,
                TitleApproved = false,
                Status       = GroupStatus.Active,
            };

            db.CapstoneGroups.AddRange(group1, group2, group3);
            await db.SaveChangesAsync();

            // Members: 4 students per group
            await AddMembers(db, userManager, group1.Id, ["student1@psu.edu.ph", "student2@psu.edu.ph", "student3@psu.edu.ph", "student4@psu.edu.ph"]);
            await AddMembers(db, userManager, group2.Id, ["student5@psu.edu.ph", "student6@psu.edu.ph", "student7@psu.edu.ph", "student8@psu.edu.ph"]);
            await AddMembers(db, userManager, group3.Id, ["student9@psu.edu.ph", "student10@psu.edu.ph", "student11@psu.edu.ph", "student12@psu.edu.ph"]);

            // Consultation logs
            var now = PhilippineTime.Now;
            await AddConsultations(db, group1.Id, adviser2.Id,
            [
                (now.AddDays(-5),  ConsultationMode.InPerson, "Reviewed Chapter 1 revisions.",             "Chapter 1 approved for submission."),
                (now.AddDays(-12), ConsultationMode.Online,   "Discussed methodology and data collection.", "Agreed on revised data collection timeline."),
                (now.AddDays(-21), ConsultationMode.InPerson, "Reviewed system architecture diagrams.",    "Architecture approved, proceed to implementation."),
                (now.AddDays(-45), ConsultationMode.Online,   "Initial project scoping and title review.", "Project title approved."),
            ]);

            await AddConsultations(db, group2.Id, adviser3.Id,
            [
                (now.AddDays(-10), ConsultationMode.InPerson, "Reviewed Chapter 2 draft.",                 "Revisions needed on related literature."),
                (now.AddDays(-40), ConsultationMode.Online,   "Discussed database design.",                "ERD approved with minor changes."),
            ]);

            await AddConsultations(db, group3.Id, adviser4.Id,
            [
                (now.AddDays(-75), ConsultationMode.InPerson, "Initial meeting and topic proposal.",       "Topic noted, needs further refinement."),
            ]);

            // Defense schedules
            var faculty5 = await userManager.FindByEmailAsync("faculty5@psu.edu.ph");

            // Group 1 — completed defense (3 weeks ago)
            var defense1 = new DefenseSchedule
            {
                CapstoneGroupId   = group1.Id,
                ScheduledDateTime = now.AddDays(-21),
                Venue             = "Room 301, ICT Building",
                Status            = DefenseStatus.Completed,
            };

            // Group 2 — upcoming defense (2 weeks from now)
            var defense2 = new DefenseSchedule
            {
                CapstoneGroupId   = group2.Id,
                ScheduledDateTime = now.AddDays(14),
                Venue             = "Room 205, Engineering Building",
                Status            = DefenseStatus.Scheduled,
            };

            db.DefenseSchedules.AddRange(defense1, defense2);
            await db.SaveChangesAsync();

            // Panel assignment for both defenses
            if (faculty5 is not null)
            {
                db.PanelAssignments.AddRange(
                    new PanelAssignment { DefenseScheduleId = defense1.Id, PanelistId = faculty5.Id },
                    new PanelAssignment { DefenseScheduleId = defense2.Id, PanelistId = faculty5.Id }
                );
                await db.SaveChangesAsync();
            }
        }

        // ── Helpers ────────────────────────────────────────────────────────────

        private static async Task AddMembers(AppDbContext db, UserManager<ApplicationUser> userManager,
            int groupId, string[] emails)
        {
            foreach (var email in emails)
            {
                var student = await userManager.FindByEmailAsync(email);
                if (student is null) continue;
                db.GroupMembers.Add(new GroupMember { CapstoneGroupId = groupId, UserId = student.Id });
            }
            await db.SaveChangesAsync();
        }

        private static async Task AddConsultations(AppDbContext db, int groupId, string adviserId,
            (DateTime Date, ConsultationMode Mode, string Discussion, string Outcome)[] entries)
        {
            foreach (var (date, mode, discussion, outcome) in entries)
            {
                db.ConsultationLogs.Add(new ConsultationLog
                {
                    CapstoneGroupId    = groupId,
                    AdviserId          = adviserId,
                    ConsultationDate   = date,
                    Mode               = mode,
                    DiscussionContent  = discussion,
                    Outcome            = outcome,
                });
            }
            await db.SaveChangesAsync();
        }

        private static async Task CreateUser(
            UserManager<ApplicationUser> userManager,
            string email, string userName,
            string firstName, string lastName,
            string password, string role)
        {
            if (await userManager.FindByEmailAsync(email) is not null) return;

            var user = new ApplicationUser
            {
                UserName       = userName,
                Email          = email,
                EmailConfirmed = true,
                FirstName      = firstName,
                LastName       = lastName,
                IsActive       = true,
            };

            var result = await userManager.CreateAsync(user, password);
            if (result.Succeeded)
                await userManager.AddToRoleAsync(user, role);
        }
    }
}
