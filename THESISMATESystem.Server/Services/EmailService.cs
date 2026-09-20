using System.Net;
using System.Net.Mail;
using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendEmailAsync(string to, string subject, string htmlBody)
        {
            var host = _config["Email:SmtpHost"] ?? "smtp.gmail.com";
            var port = int.Parse(_config["Email:SmtpPort"] ?? "587");
            var username = _config["Email:Username"];
            var password = _config["Email:Password"];
            var fromName = _config["Email:FromName"] ?? "ThesisMate System";

            // Without credentials SmtpClient silently skips AUTH and the server replies with a vague
            // "5.7.0 Authentication Required", so fail fast with an actionable message instead.
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
                throw new InvalidOperationException(
                    "SMTP credentials are not configured. Set Email:Username and Email:Password via " +
                    "'dotnet user-secrets set' (development) or Email__Username / Email__Password environment variables.");

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(username, password),
                DeliveryMethod = SmtpDeliveryMethod.Network
            };

            using var message = new MailMessage
            {
                From = new MailAddress(username, fromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            message.To.Add(to);

            try
            {
                await client.SendMailAsync(message);
            }
            catch (SmtpException ex) when (ex.StatusCode == SmtpStatusCode.MustIssueStartTlsFirst)
            {
                // SmtpClient swallows the real AUTH rejection (e.g. Gmail "534 5.7.9 Please log in with your
                // web browser", "535 5.7.8 Username and Password not accepted") and surfaces it as this code.
                throw new InvalidOperationException(
                    $"SMTP server {host} rejected the login for {username}. The password is wrong, revoked, or the " +
                    "account is blocked. For Gmail: sign in via a browser to clear security alerts, and use a fresh " +
                    "App Password (https://myaccount.google.com/apppasswords).", ex);
            }

            _logger.LogInformation("Email sent to {To} with subject '{Subject}'", to, subject);
        }
    }
}
