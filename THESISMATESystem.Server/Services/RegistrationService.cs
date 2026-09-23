using System.Net;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using THESISMATESystem.Server.Data;
using THESISMATESystem.Server.DTOs.Response;
using THESISMATESystem.Server.Enums;
using THESISMATESystem.Server.Helpers;
using THESISMATESystem.Server.Interfaces;
using THESISMATESystem.Server.Models;

namespace THESISMATESystem.Server.Services
{
    /// <summary>
    /// Admin review of self-registered students. A registration is approved only when the
    /// Student ID is on the class list of the section the student picked, so choosing a block
    /// on the form never grants access by itself.
    /// </summary>
    public class RegistrationService : IRegistrationService
    {
        private readonly AppDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IEmailService _email;
        private readonly ILogger<RegistrationService> _logger;

        public RegistrationService(
            AppDbContext db,
            UserManager<ApplicationUser> userManager,
            IEmailService email,
            ILogger<RegistrationService> logger)
        {
            _db = db;
            _userManager = userManager;
            _email = email;
            _logger = logger;
        }

        public async Task<IEnumerable<PendingRegistrationDto>> GetPendingAsync(string adminId)
        {
            var now = PhilippineTime.Now;
            var handled = await HandledSectionIdsAsync(adminId);
            var pending = await _db.Users
                .Where(u => u.RegistrationStatus == RegistrationStatus.PendingApproval
                         && (u.RegistrationExpiresAt == null || u.RegistrationExpiresAt > now)
                         // Only the blocks this Admin takes. A student who picked another block
                         // waits for that block's Admin, not this one.
                         && u.SectionId != null && handled.Contains(u.SectionId.Value))
                .OrderBy(u => u.CreatedAt)
                .Select(u => new
                {
                    u.Id, u.FirstName, u.MiddleName, u.LastName, u.Email, u.StudentId,
                    u.SectionId, SectionName = u.Section != null ? u.Section.Name : null,
                    u.EmailConfirmed, u.CreatedAt, u.RegistrationExpiresAt,
                })
                .ToListAsync();

            var numbers = pending.Where(p => p.StudentId != null).Select(p => p.StudentId!).ToList();
            var roster = await _db.SectionRosterEntries
                .Where(r => numbers.Contains(r.StudentNumber))
                .Select(r => new { r.StudentNumber, r.SectionId, r.FullName })
                .ToListAsync();

            return pending.Select(p =>
            {
                var entry = roster.FirstOrDefault(r =>
                    string.Equals(r.StudentNumber, p.StudentId, StringComparison.OrdinalIgnoreCase)
                    && r.SectionId == p.SectionId);
                return new PendingRegistrationDto
                {
                    Id = p.Id,
                    FullName = string.Join(" ", new[] { p.FirstName, p.MiddleName, p.LastName }.Where(n => !string.IsNullOrWhiteSpace(n))),
                    Email = p.Email ?? string.Empty,
                    StudentId = p.StudentId,
                    SectionId = p.SectionId,
                    SectionName = p.SectionName,
                    EmailVerified = p.EmailConfirmed,
                    OnClassList = entry is not null,
                    ClassListName = entry?.FullName,
                    SubmittedAt = p.CreatedAt,
                    ExpiresAt = p.RegistrationExpiresAt,
                };
            });
        }

        public async Task ApproveAsync(string userId, string adminId)
        {
            var user = await LoadPendingAsync(userId);
            await EnsureHandlesSectionAsync(adminId, user);

            if (!user.EmailConfirmed)
                throw new InvalidOperationException("The student has not verified their email address yet.");

            if (user.SectionId is null)
                throw new InvalidOperationException("The registration has no block/section.");

            var onClassList = await _db.SectionRosterEntries.AnyAsync(r =>
                r.SectionId == user.SectionId && r.StudentNumber == user.StudentId);
            if (!onClassList)
                throw new InvalidOperationException(
                    $"Student ID {user.StudentId} is not on the class list of {user.Section?.Name ?? "the selected section"}. " +
                    "Add it to the class list first if this student is enrolled there.");

            user.RegistrationStatus = RegistrationStatus.Approved;
            user.RegistrationExpiresAt = null;
            user.ReviewedById = adminId;
            user.ReviewedAt = PhilippineTime.Now;
            await _db.SaveChangesAsync();

            await WriteAuditAsync(adminId, "ApproveRegistration", user.Id);
            await SendSafeAsync(user.Email!, "Your ThesisMate account is approved",
                BuildDecisionEmail(user.FirstName, approved: true, reason: null));
        }

        public async Task RejectAsync(string userId, string adminId, string? reason)
        {
            var user = await LoadPendingAsync(userId);
            await EnsureHandlesSectionAsync(adminId, user);
            var email = user.Email!;
            var firstName = user.FirstName;

            // Removed rather than kept as "rejected" so the Student ID and email are free to
            // register again once the student sorts out the problem.
            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
                throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));

            await WriteAuditAsync(adminId, "RejectRegistration", userId);
            await SendSafeAsync(email, "Your ThesisMate registration was not approved",
                BuildDecisionEmail(firstName, approved: false, reason: reason));
        }

        public async Task<int> PurgeExpiredAsync(CancellationToken ct = default)
        {
            var now = PhilippineTime.Now;
            var expired = await _db.Users
                .Where(u => u.RegistrationStatus == RegistrationStatus.PendingApproval
                         && u.RegistrationExpiresAt != null
                         && u.RegistrationExpiresAt <= now)
                .ToListAsync(ct);

            var removed = 0;
            foreach (var user in expired)
            {
                var result = await _userManager.DeleteAsync(user);
                if (result.Succeeded)
                {
                    removed++;
                    await WriteAuditAsync(null, "ExpireRegistration", user.Id);
                }
                else
                {
                    _logger.LogWarning("Could not remove expired registration {UserId}: {Errors}",
                        user.Id, string.Join("; ", result.Errors.Select(e => e.Description)));
                }
            }
            return removed;
        }

        private async Task<List<int>> HandledSectionIdsAsync(string adminId) =>
            await _db.SectionAdminAssignments
                .Where(a => a.AdminId == adminId)
                .Select(a => a.SectionId)
                .ToListAsync();

        /// <summary>
        /// A registration belongs to the block the student picked, so only an Admin assigned to
        /// that block may decide it. Without this an Admin could approve a student from a block
        /// they have no class list for.
        /// </summary>
        private async Task EnsureHandlesSectionAsync(string adminId, ApplicationUser user)
        {
            if (user.SectionId is null)
                throw new InvalidOperationException("The registration has no block/section.");

            var handles = await _db.SectionAdminAssignments
                .AnyAsync(a => a.AdminId == adminId && a.SectionId == user.SectionId);
            if (!handles)
                throw new UnauthorizedAccessException(
                    $"You do not handle {user.Section?.Name ?? "this block"}. Its assigned Admin reviews this registration.");
        }

        private async Task<ApplicationUser> LoadPendingAsync(string userId)
        {
            var user = await _db.Users
                .Include(u => u.Section)
                .FirstOrDefaultAsync(u => u.Id == userId)
                ?? throw new KeyNotFoundException("Registration not found.");

            if (user.RegistrationStatus != RegistrationStatus.PendingApproval)
                throw new InvalidOperationException("This registration has already been reviewed.");

            if (user.RegistrationExpiresAt is { } expires && expires <= PhilippineTime.Now)
                throw new InvalidOperationException("This registration has expired. The student must register again.");

            return user;
        }

        private async Task WriteAuditAsync(string? actorId, string action, string entityId)
        {
            try
            {
                _db.AuditLogs.Add(new AuditLog
                {
                    UserId = actorId,
                    Action = action,
                    EntityName = "Registration",
                    EntityId = entityId,
                    Success = true,
                });
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to write audit log for {Action}", action);
            }
        }

        private async Task SendSafeAsync(string to, string subject, string html)
        {
            // The decision is already saved; a mail failure must not undo it.
            try { await _email.SendEmailAsync(to, subject, html); }
            catch (Exception ex) { _logger.LogError(ex, "Failed to send registration decision email to {Email}", to); }
        }

        private static string BuildDecisionEmail(string firstName, bool approved, string? reason)
        {
            var name = WebUtility.HtmlEncode(firstName);
            var heading = approved ? "Your account is approved" : "Your registration was not approved";
            var body = approved
                ? "An administrator has verified your registration against your section's class list. You can now sign in to ThesisMate."
                : "An administrator could not verify your registration against your section's class list, so it has been removed. You may register again with the correct details.";
            var reasonHtml = !approved && !string.IsNullOrWhiteSpace(reason)
                ? $"<p style=\"color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;\"><strong>Reason:</strong> {WebUtility.HtmlEncode(reason)}</p>"
                : string.Empty;

            return $"""
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"></head>
                <body style="font-family:Inter,system-ui,sans-serif;background:#f4f0e6;margin:0;padding:40px 20px;">
                  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <div style="background:linear-gradient(135deg,#0a1628 0%,#1e3350 100%);padding:32px 40px;text-align:center;">
                      <p style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;margin:0 0 4px;">ThesisMate</p>
                      <p style="color:#c9a84c;margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">PSU Lingayen</p>
                    </div>
                    <div style="padding:40px;">
                      <h2 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 12px;letter-spacing:-0.4px;">{heading}</h2>
                      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Hi {name}, {body}</p>
                      {reasonHtml}
                    </div>
                    <div style="background:#f9f7f2;padding:20px 40px;text-align:center;border-top:1px solid #e8e1d0;">
                      <p style="color:#9ca3af;font-size:12px;margin:0;">Pangasinan State University — Lingayen Campus</p>
                    </div>
                  </div>
                </body>
                </html>
                """;
        }
    }
}
