using System;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using ProductionDashboard.Api.Data;
using ProductionDashboard.Api.Models;

namespace ProductionDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomizationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CustomizationController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("layout")]
        public IActionResult GetLayout([FromQuery] string userId = "default_user")
        {
            var config = _context.UserLayoutConfigs.FirstOrDefault(u => u.UserId == userId);
            if (config == null)
            {
                config = new UserLayoutConfig
                {
                    UserId = userId,
                    Theme = "dark",
                    Language = "vi",
                    ManpowerShortageThreshold = 0.10,
                    WidgetsJson = "[\"kpi\",\"planVsActual\",\"productionByProduct\",\"efficiency\",\"manpower\",\"qualityPareto\",\"defectHeatmap\",\"downtime\",\"uph\",\"productMatrix\",\"problemSolving\"]",
                    UpdatedAt = DateTime.UtcNow
                };
                _context.UserLayoutConfigs.Add(config);
                _context.SaveChanges();
            }

            return Ok(config);
        }

        [HttpPost("layout")]
        public IActionResult SaveLayout([FromBody] UserLayoutConfig incoming)
        {
            if (incoming == null) return BadRequest();
            string uId = string.IsNullOrWhiteSpace(incoming.UserId) ? "default_user" : incoming.UserId;

            var existing = _context.UserLayoutConfigs.FirstOrDefault(u => u.UserId == uId);
            if (existing != null)
            {
                existing.Theme = incoming.Theme ?? existing.Theme;
                existing.Language = incoming.Language ?? existing.Language;
                existing.WidgetsJson = incoming.WidgetsJson ?? existing.WidgetsJson;
                existing.ManpowerShortageThreshold = incoming.ManpowerShortageThreshold > 0 ? incoming.ManpowerShortageThreshold : existing.ManpowerShortageThreshold;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                incoming.UserId = uId;
                incoming.UpdatedAt = DateTime.UtcNow;
                _context.UserLayoutConfigs.Add(incoming);
            }

            _context.SaveChanges();
            return Ok(existing ?? incoming);
        }
    }
}
