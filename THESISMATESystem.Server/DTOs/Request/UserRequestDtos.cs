using System.ComponentModel.DataAnnotations;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class UpdateUserRequestDto
    {
        public string? FirstName { get; set; }
        public string? MiddleName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public bool? IsActive { get; set; }
        public string? Role { get; set; }
    }

    public class AdminForcePasswordRequestDto
    {
        [Required, MinLength(8)] public string NewPassword { get; set; } = string.Empty;
    }

    public class AdminSetEmailRequestDto
    {
        [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    }
}
