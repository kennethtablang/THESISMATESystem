using Microsoft.AspNetCore.Identity;
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

            await SeedRolesAsync(roleManager);
            await SeedUsersAsync(userManager);
        }

        private static async Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
        {
            string[] roles = ["SuperAdmin", "Admin", "Adviser", "FacultyIC", "Student", "Panel"];
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        private static async Task SeedUsersAsync(UserManager<ApplicationUser> userManager)
        {
            await CreateUser(userManager,
                email: "superadmin@thesismate.edu",
                userName: "superadmin",
                firstName: "Super",
                lastName: "Admin",
                password: "SuperAdmin@1",
                role: "SuperAdmin");

            await CreateUser(userManager,
                email: "admin@psu.edu.ph",
                userName: "admin",
                firstName: "Maria",
                lastName: "Santos",
                password: "Admin@12345",
                role: "Admin");

            await CreateUser(userManager,
                email: "adviser1@psu.edu.ph",
                userName: "adviser1",
                firstName: "Jose",
                lastName: "Reyes",
                password: "Adviser@123",
                role: "Adviser");

            await CreateUser(userManager,
                email: "adviser2@psu.edu.ph",
                userName: "adviser2",
                firstName: "Ana",
                lastName: "Cruz",
                password: "Adviser@123",
                role: "Adviser");

            await CreateUser(userManager,
                email: "facultyic@psu.edu.ph",
                userName: "facultyic",
                firstName: "Roberto",
                lastName: "Dela Cruz",
                password: "FacultyIC@1",
                role: "FacultyIC");

            await CreateUser(userManager,
                email: "panel1@psu.edu.ph",
                userName: "panel1",
                firstName: "Carlos",
                lastName: "Mendoza",
                password: "Panel@12345",
                role: "Panel");

            await CreateUser(userManager,
                email: "panel2@psu.edu.ph",
                userName: "panel2",
                firstName: "Liza",
                lastName: "Bautista",
                password: "Panel@12345",
                role: "Panel");

            await CreateUser(userManager,
                email: "student1@psu.edu.ph",
                userName: "student1",
                firstName: "Juan",
                lastName: "Dela Torre",
                password: "Student@123",
                role: "Student");

            await CreateUser(userManager,
                email: "student2@psu.edu.ph",
                userName: "student2",
                firstName: "Maria",
                lastName: "Garcia",
                password: "Student@123",
                role: "Student");

            await CreateUser(userManager,
                email: "student3@psu.edu.ph",
                userName: "student3",
                firstName: "Pedro",
                lastName: "Reyes",
                password: "Student@123",
                role: "Student");
        }

        private static async Task CreateUser(
            UserManager<ApplicationUser> userManager,
            string email,
            string userName,
            string firstName,
            string lastName,
            string password,
            string role)
        {
            if (await userManager.FindByEmailAsync(email) is not null)
                return;

            var user = new ApplicationUser
            {
                UserName = userName,
                Email = email,
                EmailConfirmed = true,
                FirstName = firstName,
                LastName = lastName,
                IsActive = true
            };

            var result = await userManager.CreateAsync(user, password);
            if (result.Succeeded)
                await userManager.AddToRoleAsync(user, role);
        }
    }
}
