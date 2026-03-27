using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BogsyVideoStoreRS.Data;
using BogsyVideoStoreRS.Filters;
using BogsyVideoStoreRS.Models;

namespace BogsyVideoStoreRS.Controllers;

[ApiController]
[Route("api/[controller]")]
[ServiceFilter(typeof(SessionAuthFilter))] // #3: protect all endpoints
public class RentalsController : ControllerBase
{
    private readonly BvsDbContext _db;
    public RentalsController(BvsDbContext db) => _db = db;

    // GET api/rentals?page=1&pageSize=20
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20) // #11
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = _db.Rentals
            .Include(r => r.Customer)
            .Include(r => r.Video)
            .OrderByDescending(r => r.CreatedAt);

        var total = await query.CountAsync();
        var rentals = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.RentalId,
                r.CustomerId,
                customer   = r.Customer.FullName,
                r.VideoId,
                videoTitle = r.Video.Title,
                category   = r.Video.Category,
                r.RentFee,
                rentDate   = r.RentDate.ToString("yyyy-MM-dd"),
                dueDate    = r.DueDate.ToString("yyyy-MM-dd"),
                returnDate = r.ReturnDate.HasValue ? r.ReturnDate.Value.ToString("yyyy-MM-dd") : null,
                r.Penalty,
                r.Status
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, data = rentals });
    }

    // POST api/rentals
    [HttpPost]
    public async Task<IActionResult> Rent([FromBody] RentDto dto)
    {
        var customer = await _db.Customers.FindAsync(dto.CustomerId);
        if (customer is null) return BadRequest(new { message = "Customer not found." });

        var video = await _db.Videos.FindAsync(dto.VideoId);
        if (video is null) return BadRequest(new { message = "Video not found." });

        // #6: compute availability from Rentals table — not RentedCount
        var activeCount = await _db.Rentals
            .CountAsync(r => r.VideoId == dto.VideoId && r.Status != "Returned");
        if (video.Stock <= activeCount)
            return BadRequest(new { message = "No available copies of this video." });

        if (!DateOnly.TryParse(dto.RentDate, out var rentDate))
            return BadRequest(new { message = "Invalid rent date." });
        if (!DateOnly.TryParse(dto.DueDate, out var dueDate))
            return BadRequest(new { message = "Invalid due date." });

        // #5: collision-safe ID — max existing numeric suffix + 1
        var lastId = await _db.Rentals
            .Where(r => r.RentalId.StartsWith("R-"))
            .OrderByDescending(r => r.RentalId)
            .Select(r => r.RentalId)
            .FirstOrDefaultAsync();

        int nextNum = 1001;
        if (lastId is not null &&
            int.TryParse(lastId.AsSpan(2), out int parsed))
            nextNum = parsed + 1;

        var rentalId = $"R-{nextNum}";

        var rental = new Rental
        {
            RentalId   = rentalId,
            CustomerId = dto.CustomerId,
            VideoId    = dto.VideoId,
            RentDate   = rentDate,
            DueDate    = dueDate,
            RentFee    = video.Price,
            Penalty    = 0,
            Status     = "Active",
            CreatedAt  = DateTime.Now
        };

        // #6: keep RentedCount in sync
        video.RentedCount = activeCount + 1;
        _db.Rentals.Add(rental);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            rental.RentalId,
            videoTitle   = video.Title,
            customerName = customer.FullName,
            dueDate      = rental.DueDate.ToString("yyyy-MM-dd")
        });
    }

    // POST api/rentals/return
    [HttpPost("return")]
    public async Task<IActionResult> Return([FromBody] ReturnDto dto)
    {
        var rental = await _db.Rentals
            .Include(r => r.Video)
            .Include(r => r.Customer)
            .FirstOrDefaultAsync(r => r.RentalId.ToUpper() == dto.RentalId.ToUpper());

        if (rental is null) return NotFound(new { message = $"Rental ID \"{dto.RentalId}\" not found." });
        if (rental.Status == "Returned") return BadRequest(new { message = "This rental was already returned." });

        if (!DateOnly.TryParse(dto.ReturnDate, out var returnDate))
            return BadRequest(new { message = "Invalid return date." });

        var overdueDays = returnDate.DayNumber - rental.DueDate.DayNumber;
        var penalty     = overdueDays > 0 ? overdueDays * 5m : 0m;

        rental.ReturnDate = returnDate;
        rental.Status     = "Returned";
        rental.Penalty    = penalty;

        // #6: recompute RentedCount from DB
        rental.Video.RentedCount = await _db.Rentals
            .CountAsync(r => r.VideoId == rental.VideoId && r.Status != "Returned" && r.RentalId != rental.RentalId);

        await _db.SaveChangesAsync();

        return Ok(new
        {
            rental.RentalId,
            customerName = rental.Customer.FullName,
            videoTitle   = rental.Video.Title,
            rentFee      = rental.RentFee,
            overdueDays,
            penalty,
            total = rental.RentFee + penalty
        });
    }
}

public record RentDto(int CustomerId, int VideoId, string RentDate, string DueDate);
public record ReturnDto(string RentalId, string ReturnDate);
