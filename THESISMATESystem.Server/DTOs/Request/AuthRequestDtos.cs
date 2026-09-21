using System.ComponentModel.DataAnnotations;

namespace THESISMATESystem.Server.DTOs.Request
{
    public class LoginRequestDto
    {
        [Required] public string Email { get; set; } = string.Empty;
        [Required] public string Password { get; set; } = string.Empty;
    }

    public class RegisterRequestDto
    {
        [Required] public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        [Required] public string LastName { get; set; } = string.Empty;
        [Required, MaxLength(50)] public string StudentId { get; set; } = string.Empty;
        [Required, EmailAddress] public string Email { get; set; } = string.Empty;
        [Required, MinLength(8)] public string Password { get; set; } = string.Empty;
        // Self-registration always creates a pending Student; there is deliberately no Role field.
        [Required, Range(1, int.MaxValue, ErrorMessage = "Please select your block/section.")]
        public int SectionId { get; set; }
    }

    // SuperAdmin-only account creation. Staff accounts can only be made this way.
    public class CreateUserRequestDto
    {
        [Required, MaxLength(100)] public string FirstName { get; set; } = string.Empty;
        [MaxLength(100)] public string? MiddleName { get; set; }
        [Required, MaxLength(100)] public string LastName { get; set; } = string.Empty;
        [Required, EmailAddress] public string Email { get; set; } = string.Empty;
        [Required, MinLength(8)] public string Password { get; set; } = string.Empty;
        [Required] public string Role { get; set; } = string.Empty; // Student | Faculty | Admin | SuperAdmin
        // Required when Role is Student.
        [MaxLength(50)] public string? StudentId { get; set; }
        public int? SectionId { get; set; }
    }

    public class RejectRegistrationRequestDto
    {
        [MaxLength(500)] public string? Reason { get; set; }
    }

    public class ChangePasswordRequestDto
    {
        [Required] public string CurrentPassword { get; set; } = string.Empty;
        [Required, MinLength(8)] public string NewPassword { get; set; } = string.Empty;
    }

    public class ResetPasswordRequestDto
    {
        [Required, EmailAddress] public string Email { get; set; } = string.Empty;
        [Required] public string Token { get; set; } = string.Empty;
        [Required, MinLength(8)] public string NewPassword { get; set; } = string.Empty;
    }

    public class VerifyEmailRequestDto
    {
        [Required] public string UserId { get; set; } = string.Empty;
        [Required] public string Token { get; set; } = string.Empty;
    }

    public class TwoFactorLoginRequestDto
    {
        // Carries the signed challenge returned as TempUserId by login, not a raw user id.
        // The name is kept so existing clients keep working.
        [Required] public string UserId { get; set; } = string.Empty;
        [Required] public string Code { get; set; } = string.Empty;
    }

    public class TwoFactorVerifySetupRequestDto
    {
        [Required] public string Code { get; set; } = string.Empty;
    }

    public class TwoFactorDisableRequestDto
    {
        [Required] public string Password { get; set; } = string.Empty;
    }

    public class ForgotPasswordRequestDto
    {
        [Required] public string Email { get; set; } = string.Empty;
    }
}
