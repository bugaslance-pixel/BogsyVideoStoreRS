using System.ComponentModel.DataAnnotations;

namespace BogsyVideoStoreRS.Models;

public class Customer
{
    public int CustomerId { get; set; }

    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Address { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Contact { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public ICollection<Rental> Rentals { get; set; } = [];
}
