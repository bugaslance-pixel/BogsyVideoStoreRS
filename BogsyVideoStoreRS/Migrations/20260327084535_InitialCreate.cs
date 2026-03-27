using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace BogsyVideoStoreRS.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Customers",
                columns: table => new
                {
                    CustomerId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FullName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Contact = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customers", x => x.CustomerId);
                });

            migrationBuilder.CreateTable(
                name: "Videos",
                columns: table => new
                {
                    VideoId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Category = table.Column<string>(type: "nchar(3)", maxLength: 3, nullable: false),
                    MaxRentDays = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Stock = table.Column<int>(type: "int", nullable: false),
                    RentedCount = table.Column<int>(type: "int", nullable: false),
                    PosterUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Videos", x => x.VideoId);
                    table.CheckConstraint("CHK_Category", "[Category] IN ('DVD', 'VCD')");
                    table.CheckConstraint("CHK_MaxRentDays", "[MaxRentDays] BETWEEN 1 AND 3");
                    table.CheckConstraint("CHK_Price", "[Price] IN (25, 50)");
                });

            migrationBuilder.CreateTable(
                name: "Rentals",
                columns: table => new
                {
                    RentalId = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    VideoId = table.Column<int>(type: "int", nullable: false),
                    RentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ReturnDate = table.Column<DateOnly>(type: "date", nullable: true),
                    RentFee = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Penalty = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rentals", x => x.RentalId);
                    table.CheckConstraint("CHK_Status", "[Status] IN ('Active', 'Overdue', 'Returned')");
                    table.ForeignKey(
                        name: "FK_Rentals_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "CustomerId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Rentals_Videos_VideoId",
                        column: x => x.VideoId,
                        principalTable: "Videos",
                        principalColumn: "VideoId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Customers",
                columns: new[] { "CustomerId", "Address", "Contact", "CreatedAt", "FullName" },
                values: new object[,]
                {
                    { 1, "Manila, PH", "09123456789", new DateTime(2023, 10, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "Juan Dela Cruz" },
                    { 2, "Bulacan, PH", "09876543210", new DateTime(2023, 10, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "Maria Clara" }
                });

            migrationBuilder.InsertData(
                table: "Videos",
                columns: new[] { "VideoId", "Category", "CreatedAt", "MaxRentDays", "PosterUrl", "Price", "RentedCount", "Stock", "Title" },
                values: new object[,]
                {
                    { 1, "VCD", new DateTime(2023, 10, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), 2, "https://m.media-amazon.com/images/M/MV5BMjA0NDY3NjI4NV5BMl5BanBnXkFtZTcwNjM5OTYyMw@@._V1_.jpg", 25m, 2, 3, "Madagascar" },
                    { 2, "DVD", new DateTime(2023, 10, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), 3, "https://m.media-amazon.com/images/M/MV5BMTUxMzcxOTYxNl5BMl5BanBnXkFtZTcwMzUxNjYzMw@@._V1_.jpg", 50m, 1, 4, "Mr. and Mrs. Smith" },
                    { 3, "DVD", new DateTime(2023, 10, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), 3, "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg", 50m, 0, 5, "Inception" },
                    { 4, "VCD", new DateTime(2023, 10, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), 1, "https://m.media-amazon.com/images/I/51EG732BV3L._AC_.jpg", 25m, 1, 2, "The Matrix" }
                });

            migrationBuilder.InsertData(
                table: "Rentals",
                columns: new[] { "RentalId", "CreatedAt", "CustomerId", "DueDate", "Penalty", "RentDate", "RentFee", "ReturnDate", "Status", "VideoId" },
                values: new object[,]
                {
                    { "R-1001", new DateTime(2023, 10, 25, 0, 0, 0, 0, DateTimeKind.Unspecified), 1, new DateOnly(2023, 10, 27), 0m, new DateOnly(2023, 10, 25), 25m, null, "Active", 1 },
                    { "R-1002", new DateTime(2023, 10, 26, 0, 0, 0, 0, DateTimeKind.Unspecified), 1, new DateOnly(2023, 10, 27), 0m, new DateOnly(2023, 10, 26), 25m, null, "Active", 4 },
                    { "R-1003", new DateTime(2023, 10, 20, 0, 0, 0, 0, DateTimeKind.Unspecified), 2, new DateOnly(2023, 10, 23), 0m, new DateOnly(2023, 10, 20), 50m, null, "Overdue", 2 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Rentals_CustomerId",
                table: "Rentals",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Rentals_VideoId",
                table: "Rentals",
                column: "VideoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Rentals");

            migrationBuilder.DropTable(
                name: "Customers");

            migrationBuilder.DropTable(
                name: "Videos");
        }
    }
}
