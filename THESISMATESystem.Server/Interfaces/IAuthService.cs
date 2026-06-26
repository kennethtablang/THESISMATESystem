using THESISMATESystem.Server.DTOs.Request;
using THESISMATESystem.Server.DTOs.Response;

namespace THESISMATESystem.Server.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> LoginAsync(LoginRequestDto dto);
        Task<RegisterResponseDto> RegisterAsync(RegisterRequestDto dto);
        Task<bool> VerifyEmailAsync(string userId, string token);
        Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequestDto dto);
        Task<bool> ForgotPasswordAsync(string email);
        Task<bool> ResetPasswordAsync(ResetPasswordRequestDto dto);
        Task<UserResponseDto?> GetProfileAsync(string userId);
        Task<UserResponseDto> UpdateUserAsync(string userId, UpdateUserRequestDto dto, string callerRole);
        Task<bool> DeactivateUserAsync(string userId);
        Task<IEnumerable<UserResponseDto>> GetAllUsersAsync();
        Task AdminForceSetPasswordAsync(string userId, string newPassword);
        Task<UserResponseDto> AdminSetEmailAsync(string userId, string newEmail);
        Task AdminDisableTwoFactorAsync(string userId);
        Task AdminEnableTwoFactorAsync(string userId);
        // 2FA
        Task<bool> GetTwoFactorStatusAsync(string userId);
        Task EnableTwoFactorSendCodeAsync(string userId);
        Task<bool> VerifyAndEnableTwoFactorAsync(string userId, string code);
        Task DisableTwoFactorAsync(string userId, string password);
        Task<AuthResponseDto> TwoFactorLoginAsync(string userId, string code);
    }
}
