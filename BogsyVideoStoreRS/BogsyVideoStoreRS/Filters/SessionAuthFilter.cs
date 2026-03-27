using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BogsyVideoStoreRS.Filters;

/// <summary>
/// Action filter that rejects requests to API controllers when no session is active.
/// Apply via [ServiceFilter(typeof(SessionAuthFilter))] or register globally.
/// </summary>
public class SessionAuthFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        var session = context.HttpContext.Session;
        var user    = session.GetString("user");

        if (string.IsNullOrEmpty(user))
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Not authenticated. Please log in." });
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
