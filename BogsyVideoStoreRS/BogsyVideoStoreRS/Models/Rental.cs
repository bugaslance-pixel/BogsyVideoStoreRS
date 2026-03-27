using System.ComponentModel.DataAnnotations;

namespace BogsyVideoStoreRS.Models;

public class Rental
{
    [MaxLength(10)]
    public string RentalId { get; set; } = string.Empty;  // e.g. "R-1001"

    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public int VideoId { get; set; }
    public Video Video { get; set; } = null!;

    public DateOnly RentDate { get; set; }
    public DateOnly DueDate  { get; set; }
    public DateOnly? ReturnDate { get; set; }

    public decimal RentFee  { get; set; }
    public decimal Penalty  { get; set; } = 0;

    [MaxLength(10)]
    public string Status { get; set; } = "Active";  // Active | Overdue | Returned

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
