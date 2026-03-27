using Microsoft.EntityFrameworkCore;
using BogsyVideoStoreRS.Models;

namespace BogsyVideoStoreRS.Data;

public class BvsDbContext(DbContextOptions<BvsDbContext> options) : DbContext(options)
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Video>    Videos    => Set<Video>();
    public DbSet<Rental>   Rentals   => Set<Rental>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ?? Rental primary key ??????????????????????????????????????
        modelBuilder.Entity<Rental>()
            .HasKey(r => r.RentalId);

        // ?? Video constraints ???????????????????????????????????????
        modelBuilder.Entity<Video>()
            .Property(v => v.Category)
            .HasColumnType("nchar(3)");

        modelBuilder.Entity<Video>()
            .Property(v => v.Price)
            .HasColumnType("decimal(10,2)");

        modelBuilder.Entity<Video>()
            .HasCheckConstraint("CHK_Category",    "[Category] IN ('DVD', 'VCD')");

        modelBuilder.Entity<Video>()
            .HasCheckConstraint("CHK_MaxRentDays", "[MaxRentDays] BETWEEN 1 AND 3");

        modelBuilder.Entity<Video>()
            .HasCheckConstraint("CHK_Price",       "[Price] IN (25, 50)");

        // ?? Rental status constraint ????????????????????????????????
        modelBuilder.Entity<Rental>()
            .HasCheckConstraint("CHK_Status",
                "[Status] IN ('Active', 'Overdue', 'Returned')");

        // ?? Seed data (mirrors site.js arrays) ??????????????????????
        modelBuilder.Entity<Customer>().HasData(
            new Customer { CustomerId = 1, FullName = "Juan Dela Cruz", Address = "Manila, PH",  Contact = "09123456789", CreatedAt = new DateTime(2023, 10, 1) },
            new Customer { CustomerId = 2, FullName = "Maria Clara",    Address = "Bulacan, PH", Contact = "09876543210", CreatedAt = new DateTime(2023, 10, 1) }
        );

        modelBuilder.Entity<Video>().HasData(
            new Video { VideoId = 1, Title = "Madagascar",         Category = "VCD", MaxRentDays = 2, Price = 25, Stock = 3, RentedCount = 2, PosterUrl = "https://m.media-amazon.com/images/M/MV5BMjA0NDY3NjI4NV5BMl5BanBnXkFtZTcwNjM5OTYyMw@@._V1_.jpg",    CreatedAt = new DateTime(2023, 10, 1) },
            new Video { VideoId = 2, Title = "Mr. and Mrs. Smith", Category = "DVD", MaxRentDays = 3, Price = 50, Stock = 4, RentedCount = 1, PosterUrl = "https://m.media-amazon.com/images/M/MV5BMTUxMzcxOTYxNl5BMl5BanBnXkFtZTcwMzUxNjYzMw@@._V1_.jpg",    CreatedAt = new DateTime(2023, 10, 1) },
            new Video { VideoId = 3, Title = "Inception",          Category = "DVD", MaxRentDays = 3, Price = 50, Stock = 5, RentedCount = 0, PosterUrl = "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg",    CreatedAt = new DateTime(2023, 10, 1) },
            new Video { VideoId = 4, Title = "The Matrix",         Category = "VCD", MaxRentDays = 1, Price = 25, Stock = 2, RentedCount = 1, PosterUrl = "https://m.media-amazon.com/images/I/51EG732BV3L._AC_.jpg",                                              CreatedAt = new DateTime(2023, 10, 1) }
        );

        modelBuilder.Entity<Rental>().HasData(
            new Rental { RentalId = "R-1001", CustomerId = 1, VideoId = 1, RentDate = new DateOnly(2023, 10, 25), DueDate = new DateOnly(2023, 10, 27), ReturnDate = null, RentFee = 25, Penalty = 0, Status = "Active",  CreatedAt = new DateTime(2023, 10, 25) },
            new Rental { RentalId = "R-1002", CustomerId = 1, VideoId = 4, RentDate = new DateOnly(2023, 10, 26), DueDate = new DateOnly(2023, 10, 27), ReturnDate = null, RentFee = 25, Penalty = 0, Status = "Active",  CreatedAt = new DateTime(2023, 10, 26) },
            new Rental { RentalId = "R-1003", CustomerId = 2, VideoId = 2, RentDate = new DateOnly(2023, 10, 20), DueDate = new DateOnly(2023, 10, 23), ReturnDate = null, RentFee = 50, Penalty = 0, Status = "Overdue", CreatedAt = new DateTime(2023, 10, 20) }
        );

        // ?? Rental decimal types ????????????????????????????????????
        modelBuilder.Entity<Rental>()
            .Property(r => r.RentFee)
            .HasColumnType("decimal(10,2)");

        modelBuilder.Entity<Rental>()
            .Property(r => r.Penalty)
            .HasColumnType("decimal(10,2)");
    }
}
