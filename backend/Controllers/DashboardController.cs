using System;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using ProductionDashboard.Api.Data;
using ProductionDashboard.Api.Models;
using ProductionDashboard.Api.Services;

namespace ProductionDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly DashboardService _dashboardService;
        private readonly AppDbContext _context;

        public DashboardController(DashboardService dashboardService, AppDbContext context)
        {
            _dashboardService = dashboardService;
            _context = context;
        }

        [HttpPost("summary")]
        public IActionResult GetSummary([FromBody] DashboardFilterRequest filter)
        {
            try
            {
                var data = _dashboardService.GetDashboardData(filter ?? new DashboardFilterRequest());
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi xử lý dữ liệu Dashboard.", error = ex.Message });
            }
        }

        [HttpGet("drilldown")]
        public IActionResult GetDrillDown([FromQuery] string type, [FromQuery] string key)
        {
            if (string.IsNullOrWhiteSpace(type) || string.IsNullOrWhiteSpace(key))
            {
                return BadRequest(new { message = "Thiếu tham số type hoặc key." });
            }

            var detail = _dashboardService.GetDrillDown(type, key);
            return Ok(detail);
        }

        [HttpGet("inventory-audit")]
        public IActionResult GetInventoryAudit(
            [FromQuery] string? stage,
            [FromQuery] string? section,
            [FromQuery] string? search,
            [FromQuery] string? statusFilter)
        {
            var allRecords = _context.InventoryAuditRecords.ToList();
            if (allRecords.Count == 0)
            {
                return Ok(new
                {
                    summary = new { totalItems = 0, shortageItems = 0, surplusItems = 0, balancedItems = 0, totalNGItems = 0 },
                    stages = new List<string>(),
                    stageGroups = new List<object>(),
                    sections = new List<string>(),
                    items = new List<object>()
                });
            }

            var stageGroups = allRecords
                .GroupBy(r => r.Stage)
                .Select(g => new
                {
                    name = g.Key,
                    sections = g.Select(x => x.Section).Where(s => !string.IsNullOrEmpty(s)).Distinct().ToList(),
                    itemCount = g.Count(),
                    shortageCount = g.Count(x => x.Discrepancy < 0),
                    ngCount = g.Count(x => x.NGQuantity > 0),
                    totalDiscrepancy = g.Sum(x => x.Discrepancy)
                })
                .ToList();

            var query = allRecords.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(stage) && !stage.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(i => string.Equals(i.Stage, stage, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(section) && !section.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(i => string.Equals(i.Section, section, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string term = search.Trim().ToLowerInvariant();
                query = query.Where(i => 
                    i.MaterialCode.ToLowerInvariant().Contains(term) ||
                    i.Section.ToLowerInvariant().Contains(term) ||
                    i.Stage.ToLowerInvariant().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(statusFilter))
            {
                switch (statusFilter.ToLowerInvariant())
                {
                    case "shortage":
                        query = query.Where(i => i.Discrepancy < 0);
                        break;
                    case "surplus":
                        query = query.Where(i => i.Discrepancy > 0);
                        break;
                    case "balanced":
                        query = query.Where(i => i.Discrepancy == 0);
                        break;
                    case "ng":
                        query = query.Where(i => i.NGQuantity > 0);
                        break;
                }
            }

            var items = query.ToList();

            var summary = new
            {
                totalItems = allRecords.Count,
                filteredCount = items.Count,
                balancedItems = allRecords.Count(r => r.Discrepancy == 0),
                surplusItems = allRecords.Count(r => r.Discrepancy > 0),
                shortageItems = allRecords.Count(r => r.Discrepancy < 0),
                totalNGItems = allRecords.Count(r => r.NGQuantity > 0),
                totalAuditRequired = allRecords.Sum(r => r.AuditRequired),
                totalRawWarehouse = allRecords.Sum(r => r.RawMaterialWarehouse),
                totalRawLine = allRecords.Sum(r => r.RawMaterialLine),
                totalSemiFinished = allRecords.Sum(r => r.SemiFinishedGoods + r.SemiFinishedGoods2),
                totalRepairRoom = allRecords.Sum(r => r.RepairRoom),
                totalFA = allRecords.Sum(r => r.FailureAnalysisFa),
                totalFinishedGoods = allRecords.Sum(r => r.FinishedGoods),
                totalDiscrepancy = allRecords.Sum(r => r.Discrepancy),
                totalNG = allRecords.Sum(r => r.NGQuantity)
            };

            var distinctStages = allRecords.Select(r => r.Stage).Distinct().ToList();
            var availableSections = (!string.IsNullOrWhiteSpace(stage) && !stage.Equals("all", StringComparison.OrdinalIgnoreCase))
                ? allRecords.Where(r => r.Stage == stage).Select(r => r.Section).Distinct().ToList()
                : allRecords.Select(r => r.Section).Distinct().ToList();

            return Ok(new
            {
                summary,
                stageGroups,
                stages = distinctStages,
                sections = availableSections,
                items
            });
        }
    }
}
