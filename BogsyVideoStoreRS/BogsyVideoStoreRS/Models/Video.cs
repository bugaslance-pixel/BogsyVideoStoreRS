using System.ComponentModel.DataAnnotations;

namespace BogsyVideoStoreRS.Models;

public class Video
{
    public int VideoId { get; set; }

    [Required, MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(3)]
    public string Category { get; set; } = "DVD"; // "DVD" or "VCD"

    [Range(1, 3)]
    public int MaxRentDays { get; set; } = 3;

    public decimal Price { get; set; }  // 50 = DVD, 25 = VCD

    public int Stock { get; set; } = 1;

    public int RentedCount { get; set; } = 0;

    public string? PosterUrl { get; set; }

    public bool IsArchived { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public ICollection<Rental> Rentals { get; set; } = [];
}
