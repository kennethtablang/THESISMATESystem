using System.Net;
using THESISMATESystem.Server.Enums;

namespace THESISMATESystem.Server.Helpers
{
    public static class DefenseEmailTemplates
    {
        // ── Deadline notification ────────────────────────────────────────────────
        public static string DeadlinePosted(
            string groupName,
            string title,
            DateTime dueDate,
            string? description,
            string postedBy)
        {
            var daysRemaining = (int)Math.Ceiling((dueDate.ToUniversalTime() - DateTime.UtcNow).TotalDays);
            var urgencyColor  = daysRemaining <= 3  ? "#dc2626" : daysRemaining <= 7  ? "#b45309" : "#1d4ed8";
            var urgencyBg     = daysRemaining <= 3  ? "#fef2f2" : daysRemaining <= 7  ? "#fffbeb" : "#eff6ff";
            var urgencyBorder = daysRemaining <= 3  ? "#fecaca" : daysRemaining <= 7  ? "#fde68a" : "#bfdbfe";
            var urgencyLabel  = daysRemaining <= 0  ? "Due Today!"
                              : daysRemaining == 1  ? "Due Tomorrow!"
                              : $"Due in {daysRemaining} day{(daysRemaining == 1 ? "" : "s")}";

            var descRow = string.IsNullOrWhiteSpace(description) ? "" : $@"
            <tr><td colspan='2' style='padding:3px 0'></td></tr>
            <tr>
                <td style='padding:10px 14px;background:#f9fafb;border-radius:8px 0 0 8px;width:130px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;vertical-align:top'>Details</td>
                <td style='padding:10px 14px;background:#f9fafb;border-radius:0 8px 8px 0;font-size:14px;color:#374151;line-height:1.6'>{WebUtility.HtmlEncode(description)}</td>
            </tr>";

            return $@"<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1.0' />
    <title>ThesisMate — New Deadline</title>
</head>
<body style='margin:0;padding:0;background:#eef1f7;font-family:Arial,Helvetica,sans-serif'>
    <div style='display:none;max-height:0;overflow:hidden;color:#eef1f7'>📌 New submission deadline: {WebUtility.HtmlEncode(title)} — due {dueDate:MMM dd, yyyy}</div>

    <table width='100%' cellpadding='0' cellspacing='0' bgcolor='#eef1f7'>
        <tr><td align='center' style='padding:40px 16px'>

            <table width='600' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07)'>

                <!-- Header -->
                <tr>
                    <td bgcolor='#0f2044' align='center' style='padding:36px 40px'>
                        <p style='margin:0;font-size:24px;font-weight:700;color:#c9a84c;letter-spacing:-0.5px'>ThesisMate</p>
                        <p style='margin:6px 0 0;font-size:11px;font-weight:600;color:#93a3b8;letter-spacing:3px;text-transform:uppercase'>PSU LINGAYEN · CAPSTONE SYSTEM</p>
                    </td>
                </tr>

                <!-- Urgency banner -->
                <tr>
                    <td bgcolor='{urgencyBg}' align='center' style='padding:10px 40px;border-bottom:1px solid {urgencyBorder}'>
                        <span style='font-size:11px;font-weight:700;color:{urgencyColor};letter-spacing:2px;text-transform:uppercase'>
                            📌 {urgencyLabel.ToUpperInvariant()}
                        </span>
                    </td>
                </tr>

                <!-- Body -->
                <tr>
                    <td style='padding:36px 40px'>
                        <h1 style='margin:0 0 6px;font-size:22px;font-weight:700;color:#0f2044'>New Submission Deadline</h1>
                        <p style='margin:0 0 28px;font-size:14px;color:#6b7280'>
                            A new deadline has been posted for your capstone group. Please review the details below and submit on time.
                        </p>

                        <table width='100%' cellpadding='0' cellspacing='0'>
                            {DetailRow("Group", groupName, "#0f2044")}
                            {DetailRow("Deadline", title, "#111827")}
                            {DetailRow("Due Date", dueDate.ToString("dddd, MMMM dd, yyyy"), urgencyColor)}
                            {DetailRow("Posted by", postedBy, "#374151")}
                            {descRow}
                        </table>

                        <!-- Urgency callout -->
                        <div style='margin-top:24px;background:{urgencyBg};border:1px solid {urgencyBorder};border-radius:10px;padding:14px 16px'>
                            <p style='margin:0;font-size:13px;color:{urgencyColor};font-weight:600'>
                                ⏰ {urgencyLabel} — {dueDate:MMMM dd, yyyy}
                            </p>
                            <p style='margin:6px 0 0;font-size:13px;color:#6b7280'>
                                Log in to ThesisMate to submit your work before the deadline.
                            </p>
                        </div>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td bgcolor='#f9fafb' style='padding:24px 40px;border-top:1px solid #e5e7eb' align='center'>
                        <p style='margin:0;font-size:12px;color:#9ca3af'>
                            This is an automated message from <strong>ThesisMate System</strong>. Do not reply to this email.
                        </p>
                        <p style='margin:6px 0 0;font-size:11px;color:#d1d5db'>
                            Polytechnic University of the Philippines — Lingayen
                        </p>
                    </td>
                </tr>

            </table>
        </td></tr>
    </table>
</body>
</html>";
        }


        public static string PhaseLabel(DefensePhase phase) => phase switch
        {
            DefensePhase.TitleDefense    => "Title Defense",
            DefensePhase.ProposalDefense => "Proposal Defense",
            DefensePhase.FinalDefense    => "Final Defense",
            _                            => phase.ToString()
        };

        private static (string color, string bg, string border) PhaseStyle(DefensePhase phase) => phase switch
        {
            DefensePhase.TitleDefense    => ("#7c3aed", "#f5f3ff", "#ddd6fe"),
            DefensePhase.ProposalDefense => ("#b45309", "#fffbeb", "#fde68a"),
            DefensePhase.FinalDefense    => ("#15803d", "#f0fdf4", "#bbf7d0"),
            _                            => ("#4b5563", "#f9fafb", "#e5e7eb")
        };

        public static string Scheduled(
            string groupName,
            DefensePhase phase,
            DateTime scheduledAt,
            string venue,
            int durationMinutes,
            IList<string> panelistNames)
        {
            var (color, bg, border) = PhaseStyle(phase);
            var encodedNames = panelistNames.Select(WebUtility.HtmlEncode);
            var panelSection = panelistNames.Count > 0
                ? $"<li>{string.Join("</li><li>", encodedNames)}</li>"
                : "<li style='color:#9ca3af'>Not yet assigned</li>";

            var body = $@"
                <h1 style='margin:0 0 6px;font-size:22px;font-weight:700;color:#0f2044'>Defense Scheduled</h1>
                <p style='margin:0 0 28px;font-size:14px;color:#6b7280'>
                    Your capstone defense has been scheduled. Please review the details below and prepare accordingly.
                </p>
                {DetailRow("Group", groupName, "#0f2044")}
                {DetailRow("Phase", PhaseLabel(phase), color)}
                {DetailRow("Date &amp; Time", scheduledAt.ToString("dddd, MMMM dd, yyyy"), "#111827")}
                {DetailRow("Time", scheduledAt.ToString("h:mm tt"), "#111827")}
                {DetailRow("Venue", venue, "#111827")}
                {DetailRow("Duration", $"{durationMinutes} minutes", "#111827")}
                <tr><td colspan='2' style='padding:8px 0'></td></tr>
                <tr>
                    <td style='padding:10px 14px;background:#f9fafb;border-radius:8px 0 0 8px;width:130px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;vertical-align:top'>Panelists</td>
                    <td style='padding:10px 14px;background:#f9fafb;border-radius:0 8px 8px 0;font-size:14px;color:#111827'>
                        <ul style='margin:0;padding-left:18px;color:#111827'>
                            {panelSection}
                        </ul>
                    </td>
                </tr>";

            return Wrap(phase, "📅 Defense Scheduled", body);
        }

        public static string Rescheduled(
            string groupName,
            DefensePhase phase,
            DateTime newScheduledAt,
            string venue)
        {
            var body = $@"
                <h1 style='margin:0 0 6px;font-size:22px;font-weight:700;color:#0f2044'>Defense Rescheduled</h1>
                <p style='margin:0 0 28px;font-size:14px;color:#6b7280'>
                    Your capstone defense has been rescheduled. Please take note of the updated date and venue.
                </p>
                {DetailRow("Group", groupName, "#0f2044")}
                {DetailRow("Phase", PhaseLabel(phase), PhaseStyle(phase).color)}
                {DetailRow("New Date", newScheduledAt.ToString("dddd, MMMM dd, yyyy"), "#111827")}
                {DetailRow("New Time", newScheduledAt.ToString("h:mm tt"), "#111827")}
                {DetailRow("Venue", venue, "#111827")}";

            return Wrap(phase, "🔄 Defense Rescheduled", body);
        }

        public static string Cancelled(string groupName, DefensePhase phase)
        {
            var body = $@"
                <h1 style='margin:0 0 6px;font-size:22px;font-weight:700;color:#0f2044'>Defense Cancelled</h1>
                <p style='margin:0 0 28px;font-size:14px;color:#6b7280'>
                    Your scheduled capstone defense has been cancelled. Please contact your adviser or administrator for rescheduling details.
                </p>
                {DetailRow("Group", groupName, "#0f2044")}
                {DetailRow("Phase", PhaseLabel(phase), PhaseStyle(phase).color)}
                <tr><td colspan='2' style='padding:12px 0'>
                    <div style='background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 16px'>
                        <p style='margin:0;font-size:13px;color:#9a3412'>
                            ⚠️ Please coordinate with your group adviser or the department administrator to have your defense rescheduled as soon as possible.
                        </p>
                    </div>
                </td></tr>";

            return Wrap(phase, "❌ Defense Cancelled", body);
        }

        // ── Private helpers ──────────────────────────────────────────────────────

        private static string DetailRow(string label, string value, string valueColor) => $@"
            <tr>
                <td style='padding:8px 14px;background:#f9fafb;border-radius:8px 0 0 8px;width:130px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px'>{WebUtility.HtmlEncode(label)}</td>
                <td style='padding:8px 14px;background:#f9fafb;border-radius:0 8px 8px 0;font-size:14px;font-weight:500;color:{valueColor}'>{WebUtility.HtmlEncode(value)}</td>
            </tr>
            <tr><td colspan='2' style='padding:3px 0'></td></tr>";

        private static string Wrap(DefensePhase phase, string previewText, string bodyContent)
        {
            var (color, bg, border) = PhaseStyle(phase);
            return $@"<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1.0' />
    <title>ThesisMate Notification</title>
</head>
<body style='margin:0;padding:0;background:#eef1f7;font-family:Arial,Helvetica,sans-serif'>
    <!-- Preview text (hidden) -->
    <div style='display:none;max-height:0;overflow:hidden;color:#eef1f7'>{previewText}</div>

    <table width='100%' cellpadding='0' cellspacing='0' bgcolor='#eef1f7'>
        <tr><td align='center' style='padding:40px 16px'>

            <!-- Card wrapper -->
            <table width='600' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07)'>

                <!-- Header -->
                <tr>
                    <td bgcolor='#0f2044' align='center' style='padding:36px 40px'>
                        <p style='margin:0;font-size:24px;font-weight:700;color:#c9a84c;letter-spacing:-0.5px'>ThesisMate</p>
                        <p style='margin:6px 0 0;font-size:11px;font-weight:600;color:#93a3b8;letter-spacing:3px;text-transform:uppercase'>PSU LINGAYEN · CAPSTONE SYSTEM</p>
                    </td>
                </tr>

                <!-- Phase banner -->
                <tr>
                    <td bgcolor='{bg}' align='center' style='padding:10px 40px;border-bottom:1px solid {border}'>
                        <span style='font-size:11px;font-weight:700;color:{color};letter-spacing:2px;text-transform:uppercase'>
                            ● {PhaseLabel(phase).ToUpperInvariant()}
                        </span>
                    </td>
                </tr>

                <!-- Body -->
                <tr>
                    <td style='padding:36px 40px'>
                        <table width='100%' cellpadding='0' cellspacing='0'>
                            {bodyContent}
                        </table>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td bgcolor='#f9fafb' style='padding:24px 40px;border-top:1px solid #e5e7eb' align='center'>
                        <p style='margin:0;font-size:12px;color:#9ca3af'>
                            This is an automated message from <strong>ThesisMate System</strong>. Do not reply to this email.
                        </p>
                        <p style='margin:6px 0 0;font-size:11px;color:#d1d5db'>
                            Polytechnic University of the Philippines — Lingayen
                        </p>
                    </td>
                </tr>

            </table>
        </td></tr>
    </table>
</body>
</html>";
        }
    }
}
