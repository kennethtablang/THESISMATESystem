namespace THESISMATESystem.Server.DTOs.Response
{
    public class RegisterResponseDto
    {
        public string Message { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }

    public class AuthResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime Expires { get; set; }
        public UserResponseDto User { get; set; } = null!;
        public bool TwoFactorRequired { get; set; } = false;
        public string? TempUserId { get; set; }
    }

    public class UserResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        public string LastName { get; set; } = string.Empty;
        public string FullName => string.IsNullOrWhiteSpace(MiddleName)
            ? $"{FirstName} {LastName}".Trim()
            : $"{FirstName} {MiddleName} {LastName}".Trim();
        public string Email { get; set; } = string.Empty;
        public string? StudentId { get; set; }
        public string Role { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool TwoFactorEnabled { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? PhoneNumber { get; set; }
        public int? SectionId { get; set; }
        public string? SectionName { get; set; }
        public string RegistrationStatus { get; set; } = "Approved";
        // Blocks this account handles as an Admin/subject teacher. Empty for other roles.
        public List<SectionOptionDto> HandledSections { get; set; } = [];
    }

    public class PendingRegistrationDto
    {
        public string Id { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? StudentId { get; set; }
        public int? SectionId { get; set; }
        public string? SectionName { get; set; }
        public bool EmailVerified { get; set; }
        // True when the Student ID appears on the class list of the section they picked.
        public bool OnClassList { get; set; }
        // Name recorded on the class list for that Student ID, for a side-by-side check.
        public string? ClassListName { get; set; }
        public DateTime SubmittedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }

}
