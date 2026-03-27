using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BogsyVideoStoreRS.Data;
using BogsyVideoStoreRS.Filters;
using BogsyVideoStoreRS.Models;

namespace BogsyVideoStoreRS.Controllers;

[ApiController]
[Route("api/[controller]")]
[ServiceFilter(typeof(SessionAuthFilter))] // #3: protect all endpoints
public class VideosController : ControllerBase
{
    private readonly BvsDbContext _db;
    public VideosController(BvsDbContext db) => _db = db;

    // GET api/videos?page=1&pageSize=20
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20) // #11
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = _db.Videos
            .Where(v => !v.IsArchived)
            .OrderBy(v => v.Title);

        var total = await query.CountAsync();
        var data  = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { total, page, pageSize, data });
    }

    // GET api/videos/archived?page=1&pageSize=20
    [HttpGet("archived")]
    public async Task<IActionResult> GetArchived([FromQuery] int page = 1, [FromQuery] int pageSize = 20) // #11
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = _db.Videos
            .Where(v => v.IsArchived)
            .OrderBy(v => v.Title);

        var total = await query.CountAsync();
        var data  = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { total, page, pageSize, data });
    }

    // POST api/videos
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] VideoDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var video = new Video
        {
            Title       = dto.Title.Trim(),
            Category    = dto.Category,
            MaxRentDays = dto.MaxRentDays,
            Price       = dto.Category == "DVD" ? 50 : 25,
            Stock       = dto.Stock,
            RentedCount = 0,
            PosterUrl   = dto.PosterUrl,
            IsArchived  = false,
            CreatedAt   = DateTime.Now
        };
        _db.Videos.Add(video);
        await _db.SaveChangesAsync();
        return Ok(video);
    }

    // PUT api/videos/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] VideoDto dto)
    {
        var v = await _db.Videos.FindAsync(id);
        if (v is null) return NotFound();

        v.Title       = dto.Title.Trim();
        v.Category    = dto.Category;
        v.MaxRentDays = dto.MaxRentDays;
        v.Price       = dto.Category == "DVD" ? 50 : 25;
        v.Stock       = dto.Stock;
        v.PosterUrl   = dto.PosterUrl;
        await _db.SaveChangesAsync();
        return Ok(v);
    }

    // PATCH api/videos/5/archive
    [HttpPatch("{id:int}/archive")]
    public async Task<IActionResult> Archive(int id)
    {
        var v = await _db.Videos.FindAsync(id);
        if (v is null) return NotFound();

        bool hasActiveRentals = await _db.Rentals
            .AnyAsync(r => r.VideoId == id && r.Status != "Returned");
        if (hasActiveRentals)
            return BadRequest(new { message = $"Cannot archive \"{v.Title}\" — it has active rentals." });

        // #6: sync RentedCount from DB before archiving
        v.RentedCount = await _db.Rentals
            .CountAsync(r => r.VideoId == id && r.Status != "Returned");
        v.IsArchived = true;
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // PATCH api/videos/5/restore
    [HttpPatch("{id:int}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var v = await _db.Videos.FindAsync(id);
        if (v is null) return NotFound();

        v.IsArchived = false;
        await _db.SaveChangesAsync();
        return Ok(v);
    }
}

public record VideoDto(string Title, string Category, int MaxRentDays, int Stock, string? PosterUrl);
