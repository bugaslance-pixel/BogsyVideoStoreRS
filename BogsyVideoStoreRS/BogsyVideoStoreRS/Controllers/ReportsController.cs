using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BogsyVideoStoreRS.Data;
using BogsyVideoStoreRS.Filters;

namespace BogsyVideoStoreRS.Controllers;

[ApiController]
[Route("api/[controller]")]
[ServiceFilter(typeof(SessionAuthFilter))]
public class ReportsController : ControllerBase
{
    private readonly BvsDbContext _db;
    public ReportsController(BvsDbContext db) => _db = db;

    /// <summary>
    /// GET api/reports/inventory
    /// Returns all active (non-archived) videos with available and rented counts
    /// computed live from the Rentals table, sorted A-Z.
    /// </summary>
    [HttpGet("inventory")]
    public async Task<IActionResult> Inventory()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        var data = await _db.Videos
            .Where(v => !v.IsArchived)
            .OrderBy(v => v.Title)
            .Select(v => new
            {
                v.VideoId,
                v.Title,
                category  = v.Category.Trim(),
                v.Stock,
                rented    = v.Rentals.Count(r => r.Status != "Returned"),
                available = v.Stock - v.Rentals.Count(r => r.Status != "Returned")
            })
            .ToListAsync();

        return Ok(data);
    }

    /// <summary>
    /// GET api/reports/customer-statement/{customerId}
    /// Returns all rentals for a specific customer with penalty totals.
    /// </summary>
    [HttpGet("customer-statement/{customerId:int}")]
    public async Task<IActionResult> CustomerStatement(int customerId)
    {
        var customer = await _db.Customers.FindAsync(customerId);
        if (customer is null) return NotFound(new { message = "Customer not found." });

        var rentals = await _db.Rentals
            .Where(r => r.CustomerId == customerId)
            .Include(r => r.Video)
            .OrderByDescending(r => r.RentDate)
            .Select(r => new
            {
                r.RentalId,
                videoTitle = r.Video.Title,
                category   = r.Video.Category.Trim(),
                rentDate   = r.RentDate.ToString("yyyy-MM-dd"),
                dueDate    = r.DueDate.ToString("yyyy-MM-dd"),
                returnDate = r.ReturnDate.HasValue ? r.ReturnDate.Value.ToString("yyyy-MM-dd") : null,
                r.RentFee,
                r.Penalty,
                total      = r.RentFee + r.Penalty,
                r.Status
            })
            .ToListAsync();

        var grandTotal = rentals.Sum(r => r.total);

        return Ok(new
        {
            customerId,
            customerName = customer.FullName,
            address      = customer.Address,
            rentals,
            grandTotal
        });
    }

    /// <summary>
    /// GET api/reports/overdue
    /// Returns all currently overdue rentals.
    /// </summary>
    [HttpGet("overdue")]
    public async Task<IActionResult> Overdue()
    {
        var data = await _db.Rentals
            .Where(r => r.Status == "Overdue")
            .Include(r => r.Customer)
            .Include(r => r.Video)
            .OrderBy(r => r.DueDate)
            .Select(r => new
            {
                r.RentalId,
                customerName = r.Customer.FullName,
                videoTitle   = r.Video.Title,
                dueDate      = r.DueDate.ToString("yyyy-MM-dd"),
                overdueDays  = DateOnly.FromDateTime(DateTime.Today).DayNumber - r.DueDate.DayNumber,
                accruedPenalty = (DateOnly.FromDateTime(DateTime.Today).DayNumber - r.DueDate.DayNumber) * 5m
            })
            .ToListAsync();

        return Ok(data);
    }
}
