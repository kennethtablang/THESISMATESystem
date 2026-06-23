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
        [Required, EmailAddress] public string Email { get; set; } = string.Empty;
        [Required, MinLength(8)] public string Password { get; set; } = string.Empty;
        [Required] public string Role { get; set; } = string.Empty; // Student | Adviser | Panelist | Coordinator
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
