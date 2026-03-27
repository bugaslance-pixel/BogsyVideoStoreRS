using Microsoft.AspNetCore.Mvc;

namespace BogsyVideoStoreRS.Controllers;

public class HomeController : Controller
{
    private readonly IConfiguration _config;

    public HomeController(IConfiguration config) => _config = config;

    public IActionResult Index()
    {
        // If already logged in, pass flag to view so it skips login screen
        ViewBag.IsLoggedIn = HttpContext.Session.GetString("user") != null;
        return View();
    }

    [HttpPost]
    public IActionResult Login([FromBody] LoginRequest req)
    {
        var adminUser = _config["AdminCredentials:Username"];
        var adminPass = _config["AdminCredentials:Password"];

        if (req.Username == adminUser && req.Password == adminPass)
        {
            HttpContext.Session.SetString("user", req.Username);
            return Ok(new { success = true });
        }
        return Unauthorized(new { success = false, message = "Invalid username or password." });
    }

    [HttpPost]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return Ok(new { success = true });
    }
}

public record LoginRequest(string Username, string Password);
