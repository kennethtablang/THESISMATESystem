using THESISMATESystem.Server.Interfaces;

namespace THESISMATESystem.Server.Services
{
    /// <summary>
    /// Periodic housekeeping that must happen without anyone clicking a button:
    /// removing registrations nobody approved in time, and opening the rating form for
    /// defenses whose scheduled time has ended.
    /// </summary>
    public class MaintenanceHostedService : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

        private readonly IServiceScopeFactory _scopes;
        private readonly ILogger<MaintenanceHostedService> _logger;

        public MaintenanceHostedService(IServiceScopeFactory scopes, ILogger<MaintenanceHostedService> logger)
        {
            _scopes = scopes;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Give startup (migrations check, seeding) a moment before the first run.
            try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); }
            catch (OperationCanceledException) { return; }

            using var timer = new PeriodicTimer(Interval);
            do
            {
                await RunOnceAsync(stoppingToken);
            }
            while (await WaitAsync(timer, stoppingToken));
        }

        private static async Task<bool> WaitAsync(PeriodicTimer timer, CancellationToken ct)
        {
            try { return await timer.WaitForNextTickAsync(ct); }
            catch (OperationCanceledException) { return false; }
        }

        private async Task RunOnceAsync(CancellationToken ct)
        {
            // Each job gets its own scope so one failing cannot leave a broken DbContext for the other.
            try
            {
                using var scope = _scopes.CreateScope();
                var removed = await scope.ServiceProvider.GetRequiredService<IRegistrationService>().PurgeExpiredAsync(ct);
                if (removed > 0) _logger.LogInformation("Removed {Count} expired pending registration(s).", removed);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Expired-registration cleanup failed.");
            }

            try
            {
                using var scope = _scopes.CreateScope();
                var completed = await scope.ServiceProvider.GetRequiredService<IDefenseService>().CompleteEndedDefensesAsync(ct);
                if (completed > 0) _logger.LogInformation("Marked {Count} ended defense(s) completed and opened rating.", completed);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Defense auto-completion failed.");
            }
        }
    }
}
