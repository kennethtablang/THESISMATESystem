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
            await FixAdminAccountsAsync(userManager);
            await SeedUsersAsync(userManager);
            await SeedClassroomAsync(db, userManager);
            await SeedGroupsAsync(db, userManager);
            await SeedSectionAsync(db, userManager);
            await SeedGroupPanelsAsync(db, userManager);
            await SeedDefaultRubricCriteriaAsync(db);
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

        // ── Admin account corrections ─────────────────────────────────────────
        // Older databases have the SuperAdmin at superadmin@thesismate.edu and admin@psu.edu.ph
        // holding the SuperAdmin role, which left no Admin account once the two roles were
        // separated. Each step only acts when it finds that old state, so it is safe to rerun.

        private static async Task FixAdminAccountsAsync(UserManager<ApplicationUser> userManager)
        {
            var legacySuper = await userManager.FindByEmailAsync("superadmin@thesismate.edu");
            if (legacySuper is not null && await userManager.FindByEmailAsync("superadmin@psu.edu.ph") is null)
            {
                await userManager.SetEmailAsync(legacySuper, "superadmin@psu.edu.ph");
                legacySuper.EmailConfirmed = true; // SetEmailAsync clears it
                await userManager.UpdateAsync(legacySuper);
                Console.WriteLine("[Seeder] Moved SuperAdmin to superadmin@psu.edu.ph");
            }

            var admin = await userManager.FindByEmailAsync("admin@psu.edu.ph");
            if (admin is not null && await userManager.IsInRoleAsync(admin, "SuperAdmin"))
            {
                await userManager.RemoveFromRoleAsync(admin, "SuperAdmin");
                await userManager.AddToRoleAsync(admin, "Admin");
                admin.FirstName = "System";
                admin.MiddleName = null;
                admin.LastName = "Admin";
                await userManager.UpdateAsync(admin);
                Console.WriteLine("[Seeder] admin@psu.edu.ph is now the Admin (System Admin)");
            }
        }

        // ── Users ──────────────────────────────────────────────────────────────

        private static async Task SeedUsersAsync(UserManager<ApplicationUser> userManager)
        {
            // SuperAdmin
            await CreateUser(userManager, "superadmin@psu.edu.ph", "superadmin",
                "Super", "Admin", "SuperAdmin@1", "SuperAdmin");

            // Admin
            await CreateUser(userManager, "admin@psu.edu.ph", "admin",
                "System", "Admin", "Admin@12345", "Admin");

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

            // ── Real accounts ──────────────────────────────────────────────────────
            await CreateUser(userManager, "kennethreytablang@gmail.com", "kennethtablang",
                "Kenneth", "Tablang", "Admin@123#", "SuperAdmin", middleName: "Rey");
            await CreateUser(userManager, "kenkentabs3224@gmail.com", "kenkentabs",
                "Ken", "Tabs", "Faculty@123", "Faculty");
            await CreateUser(userManager, "kennethrrtablang@gmail.com", "kennethrrtablang",
                "Kenneth", "Tablang", "Adviser@123", "Faculty");
            await CreateUser(userManager, "keikatsuno3224@gmail.com", "keikatsuno",
                "Kei", "Katsuno", "PanelMember@123", "Faculty");
            await CreateUser(userManager, "thechaoscortex@gmail.com", "thechaoscortex",
                "Chaos", "Cortex", "Student@123", "Student");
            await CreateUser(userManager, "sanaminatozaki3224@gmail.com", "sanaminatozaki",
                "Sana", "Minatozaki", "Student@123", "Student");
            // kennethrrtablang@gmail.com listed again as Student — already registered above as Faculty, safely skipped
            await CreateUser(userManager, "krrtablang_19ac0055@psu.edu.ph", "krrtablang",
                "Kenneth", "Tablang", "Student@123", "Student", studentId: "19-AC-0055");
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

        // ── Section ───────────────────────────────────────────────────────────
        // Runs once, on a database that has no sections yet: puts the seeded students and the
        // seeded classroom in one block so the section rules have something to work with.

        private static async Task SeedSectionAsync(AppDbContext db, UserManager<ApplicationUser> userManager)
        {
            if (await db.Sections.AnyAsync())
            {
                // Databases seeded before blocks had an Admin still need the assignment.
                var existing = await db.Sections.OrderBy(s => s.Id).FirstAsync();
                await SeedSectionAdminAsync(db, userManager, existing.Id);
                return;
            }

            var section = new Section { Name = "BSIT 4A", AcademicYear = "2025-2026" };
            db.Sections.Add(section);
            await db.SaveChangesAsync();

            for (int i = 1; i <= 12; i++)
            {
                var student = await userManager.FindByEmailAsync($"student{i}@psu.edu.ph");
                if (student is null || student.SectionId is not null) continue;
                student.SectionId = section.Id;
            }

            var classroom = await db.Classrooms.FirstOrDefaultAsync(c => c.JoinCode == "PSU001" && c.SectionId == null);
            if (classroom is not null) classroom.SectionId = section.Id;

            await db.SaveChangesAsync();
            await SeedSectionAdminAsync(db, userManager, section.Id);
        }

        // An Admin only reviews registrations for the blocks assigned to them, so the seeded
        // Admin has to own the seeded block or the registrations page comes up empty.
        private static async Task SeedSectionAdminAsync(AppDbContext db, UserManager<ApplicationUser> userManager, int sectionId)
        {
            var admin = await userManager.FindByEmailAsync("admin@psu.edu.ph");
            if (admin is null) return;
            if (await db.SectionAdminAssignments.AnyAsync(a => a.AdminId == admin.Id && a.SectionId == sectionId)) return;

            db.SectionAdminAssignments.Add(new SectionAdminAssignment { SectionId = sectionId, AdminId = admin.Id });
            await db.SaveChangesAsync();
        }

        // ── Group panels ──────────────────────────────────────────────────────
        // Groups created before panels were set at creation get faculty5 (chair) and faculty1,
        // skipping whoever is the group's own adviser.

        private static async Task SeedGroupPanelsAsync(AppDbContext db, UserManager<ApplicationUser> userManager)
        {
            if (await db.GroupPanelMembers.AnyAsync()) return;

            var chair = await userManager.FindByEmailAsync("faculty5@psu.edu.ph");
            var member = await userManager.FindByEmailAsync("faculty1@psu.edu.ph");
            if (chair is null || member is null) return;

            var groups = await db.CapstoneGroups
                .Where(g => g.GroupName == "AquaTrack" || g.GroupName == "EduSync" || g.GroupName == "GreenPath")
                .ToListAsync();
            foreach (var g in groups)
            {
                if (g.AdviserId != chair.Id)
                    db.GroupPanelMembers.Add(new GroupPanelMember { CapstoneGroupId = g.Id, PanelistId = chair.Id, IsChair = true });
                if (g.AdviserId != member.Id)
                    db.GroupPanelMembers.Add(new GroupPanelMember { CapstoneGroupId = g.Id, PanelistId = member.Id, IsChair = g.AdviserId == chair.Id });
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
            string password, string role,
            string? middleName = null, string? studentId = null)
        {
            if (await userManager.FindByEmailAsync(email) is not null) return;

            var user = new ApplicationUser
            {
                UserName       = userName,
                Email          = email,
                EmailConfirmed = true,
                FirstName      = firstName,
                MiddleName     = middleName,
                LastName       = lastName,
                StudentId      = studentId,
                IsActive       = true,
            };

            var result = await userManager.CreateAsync(user, password);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(user, role);
                Console.WriteLine($"[Seeder] Created {role}: {email}");
            }
            else
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                Console.WriteLine($"[Seeder] FAILED to create {email}: {errors}");
            }
        }

        // ── Default Rubric Criteria ────────────────────────────────────────────

        private static async Task SeedDefaultRubricCriteriaAsync(AppDbContext db)
        {
            static async Task SeedPhase(AppDbContext db, DefensePhase phase, List<(string Name, string Desc, decimal Weight)> items)
            {
                if (await db.DefenseCriteria.AnyAsync(c => c.Phase == phase)) return;
                db.DefenseCriteria.AddRange(items.Select(i => new DefenseCriterion
                {
                    Phase       = phase,
                    Name        = i.Name,
                    Description = i.Desc,
                    Weight      = i.Weight,
                    MaxScore    = 100,
                    IsActive    = true,
                }));
                await db.SaveChangesAsync();
            }

            await SeedPhase(db, DefensePhase.TitleDefense,
            [
                ("Problem Identification",  "Clarity and relevance of the research problem and objectives.",              25),
                ("Literature Review",        "Breadth and depth of related literature; proper citation.",                 20),
                ("Research Methodology",     "Appropriateness of the proposed research design and methods.",              20),
                ("Technical Feasibility",    "Viability of the proposed system or solution given available resources.",   20),
                ("Presentation & Defense",   "Clarity, confidence, and responsiveness during the oral defense.",          15),
            ]);

            await SeedPhase(db, DefensePhase.ProposalDefense,
            [
                ("Problem & Objectives",     "Sharpness of the problem statement and alignment of objectives.",          20),
                ("Review of Related Studies","Quality and relevance of literature; identification of research gaps.",    15),
                ("Methodology Design",       "Soundness of the research design, framework, and data collection plan.",   25),
                ("System Design",            "Completeness of system architecture, data flow, and UI/UX wireframes.",    25),
                ("Presentation & Defense",   "Clarity of delivery and quality of responses to panel questions.",         15),
            ]);

            await SeedPhase(db, DefensePhase.FinalDefense,
            [
                ("System Completeness",      "All proposed functionalities are fully implemented and operational.",      30),
                ("Technical Quality",        "Code quality, architecture, security, and performance of the system.",     20),
                ("Testing & Evaluation",     "Rigor of user acceptance testing and documented results.",                 20),
                ("Research Documentation",   "Completeness, correctness, and formatting of the final manuscript.",       15),
                ("Presentation & Defense",   "Professional delivery and depth of answers to panel questions.",           15),
            ]);
        }
    }
}
