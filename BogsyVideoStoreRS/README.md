# Bogsy Video Store (BVS)

ASP.NET Core (.NET 8) video rental system using EF Core + SQL Server.

## Prerequisites

- **.NET 8 SDK**
- **SQL Server LocalDB** (recommended) or SQL Server Express/Full
  - LocalDB is included with Visual Studio (typical install)

## How to run

1. Clone the repository
2. Open the solution in Visual Studio (or use the .NET CLI)
3. Configure the database connection

   - Default is LocalDB via `appsettings.json`:

     - `Server=(localdb)\\MSSQLLocalDB;Database=BVSRS;Trusted_Connection=True;TrustServerCertificate=True`

   - If you don't have LocalDB, create your own connection string in **`appsettings.Development.json`**.
     This file is ignored by Git (see `.gitignore`).

4. Run the app

On startup the app will automatically:
- apply EF Core migrations
- seed initial data

Login:
- Username: `admin`
- Password: `admin123`

## Notes

- Posters are mostly external URLs. If an external image is unavailable, the UI falls back to `wwwroot/images/no-poster.svg`.
- If you get a database error on first run, ensure your connection string points to a working SQL Server instance.
