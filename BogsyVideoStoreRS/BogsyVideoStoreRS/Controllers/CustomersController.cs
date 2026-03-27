using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BogsyVideoStoreRS.Data;
using BogsyVideoStoreRS.Filters;
using BogsyVideoStoreRS.Models;

namespace BogsyVideoStoreRS.Controllers;

[ApiController]
[Route("api/[controller]")]
[ServiceFilter(typeof(SessionAuthFilter))] // #3: protect all endpoints
public class CustomersController : ControllerBase
{
    private readonly BvsDbContext _db;
    public CustomersController(BvsDbContext db) => _db = db;

    // GET api/customers?page=1&pageSize=50
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50) // #11
    {
        pageSize = Math.Clamp(pageSize, 1, 200);
        var query = _db.Customers.OrderBy(c => c.FullName);
        var total = await query.CountAsync();
        var data  = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { total, page, pageSize, data });
    }

    // POST api/customers
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CustomerDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var customer = new Customer
        {
            FullName  = dto.FullName.Trim(),
            Address   = dto.Address.Trim(),
            Contact   = dto.Contact.Trim(),
            CreatedAt = DateTime.Now
        };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();
        return Ok(customer);
    }

    // PUT api/customers/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] CustomerDto dto)
    {
        var c = await _db.Customers.FindAsync(id);
        if (c is null) return NotFound();

        c.FullName = dto.FullName.Trim();
        c.Address  = dto.Address.Trim();
        c.Contact  = dto.Contact.Trim();
        await _db.SaveChangesAsync();
        return Ok(c);
    }

    // DELETE api/customers/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var c = await _db.Customers.FindAsync(id);
        if (c is null) return NotFound();

        bool hasActive = await _db.Rentals
            .AnyAsync(r => r.CustomerId == id && r.Status != "Returned");
        if (hasActive)
            return BadRequest(new { message = $"Cannot delete \"{c.FullName}\" — they have active rentals." });

        _db.Customers.Remove(c);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }
}

public record CustomerDto(string FullName, string Address, string Contact);
