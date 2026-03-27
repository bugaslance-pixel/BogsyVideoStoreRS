using Microsoft.EntityFrameworkCore;
using BogsyVideoStoreRS.Data;

namespace BogsyVideoStoreRS.Services;

/// <summary>
/// Background service that runs every hour and flips Active rentals
/// whose DueDate has passed to Overdue status.
/// </summary>
public class OverdueStatusService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OverdueStatusService> _logger;
    private static readonly TimeSpan _interval = TimeSpan.FromHours(1);

    public OverdueStatusService(IServiceScopeFactory scopeFactory,
                                ILogger<OverdueStatusService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Run once on startup, then every hour
        while (!stoppingToken.IsCancellationRequested)
        {
            await UpdateOverdueRentalsAsync();
            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task UpdateOverdueRentalsAsync()
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db          = scope.ServiceProvider.GetRequiredService<BvsDbContext>();
            var today       = DateOnly.FromDateTime(DateTime.Today);

            var overdueRentals = await db.Rentals
                .Where(r => r.Status == "Active" && r.DueDate < today)
                .ToListAsync();

            if (overdueRentals.Count == 0) return;

            foreach (var rental in overdueRentals)
                rental.Status = "Overdue";

            await db.SaveChangesAsync();
            _logger.LogInformation("OverdueStatusService: marked {Count} rental(s) as Overdue.", overdueRentals.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OverdueStatusService: error while updating overdue rentals.");
        }
    }
}
