using Microsoft.AspNetCore.Mvc;
using ProductionDashboard.Api.Models;
using ProductionDashboard.Api.Services;

namespace ProductionDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username))
            {
                return BadRequest(new { message = "Vui lòng nhập tên đăng nhập." });
            }

            var result = _authService.Authenticate(request.Username, request.Password);
            if (result == null)
            {
                return Unauthorized(new { message = "Sai tài khoản hoặc mật khẩu. Gợi ý: admin/123, manager/123, qa/123" });
            }

            return Ok(result);
        }

        [HttpGet("me")]
        public IActionResult GetMe()
        {
            // Default demo account if header token is parsed or returning default profile
            return Ok(new
            {
                username = "admin",
                fullName = "System Administrator",
                role = "Admin",
                permissions = new[]
                {
                    "dashboard.view", "dashboard.production", "dashboard.quality",
                    "dashboard.downtime", "dashboard.reports",
                    "problem-solving.view", "problem-solving.create",
                    "problem-solving.edit", "problem-solving.export"
                }
            });
        }
    }
}
