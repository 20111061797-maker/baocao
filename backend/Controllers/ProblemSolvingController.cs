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
    [Route("api/problem-solving")]
    [Route("api/problemsolving")]
    public class ProblemSolvingController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly DashboardService _dashboardService;

        public ProblemSolvingController(AppDbContext context, DashboardService dashboardService)
        {
            _context = context;
            _dashboardService = dashboardService;
        }

        [HttpGet("reports")]
        public IActionResult GetReports([FromQuery] string? mode, [FromQuery] string? status)
        {
            var query = _context.EightDReports.AsQueryable();
            if (!string.IsNullOrWhiteSpace(mode))
            {
                query = query.Where(r => r.Mode == mode);
            }
            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(r => r.Status == status);
            }

            var list = query.OrderByDescending(r => r.CreatedAt).ToList();
            return Ok(list);
        }

        [HttpGet("reports/{id}")]
        public IActionResult GetReportById(string id)
        {
            var report = _context.EightDReports.FirstOrDefault(r => r.Id == id);
            if (report == null)
            {
                return NotFound(new { message = $"Không tìm thấy báo cáo {id}." });
            }
            return Ok(report);
        }

        [HttpPost("reports")]
        public IActionResult SaveReport([FromBody] EightDReport report)
        {
            if (report == null || string.IsNullOrWhiteSpace(report.Title))
            {
                return BadRequest(new { message = "Tiêu đề báo cáo không được để trống." });
            }

            var existing = _context.EightDReports.FirstOrDefault(r => r.Id == report.Id);
            if (existing != null)
            {
                // Update
                existing.Title = report.Title;
                existing.Mode = report.Mode;
                existing.ProductCode = report.ProductCode;
                existing.DefectType = report.DefectType;
                existing.DateRange = report.DateRange;
                existing.Severity = report.Severity;
                existing.Status = report.Status;
                existing.UpdatedAt = DateTime.UtcNow;

                existing.TeamLeader = report.TeamLeader;
                existing.Champion = report.Champion;
                existing.TeamMembers = report.TeamMembers;

                existing.ProblemStatement = report.ProblemStatement;
                existing.EvidenceDetails = report.EvidenceDetails;
                existing.EvidenceProductionQty = report.EvidenceProductionQty;
                existing.EvidenceNGQty = report.EvidenceNGQty;
                existing.EvidenceNGRate = report.EvidenceNGRate;
                existing.EvidenceTopDefect = report.EvidenceTopDefect;

                existing.ContainmentAction = report.ContainmentAction;
                existing.ContainmentOwner = report.ContainmentOwner;
                existing.ContainmentDueDate = report.ContainmentDueDate;
                existing.ContainmentStatus = report.ContainmentStatus;

                existing.RootCauseWhy1 = report.RootCauseWhy1;
                existing.RootCauseWhy2 = report.RootCauseWhy2;
                existing.RootCauseWhy3 = report.RootCauseWhy3;
                existing.RootCauseWhy4 = report.RootCauseWhy4;
                existing.RootCauseWhy5 = report.RootCauseWhy5;
                existing.RootCauseSummary = report.RootCauseSummary;

                existing.CorrectiveActions = report.CorrectiveActions;
                existing.ActionOwner = report.ActionOwner;
                existing.ActionDueDate = report.ActionDueDate;

                existing.ValidationResult = report.ValidationResult;
                existing.ValidationDate = report.ValidationDate;

                existing.PreventativeActions = report.PreventativeActions;
                existing.StandardOperatingProcedure = report.StandardOperatingProcedure;

                existing.TeamRecognition = report.TeamRecognition;
                existing.SignOffPerson = report.SignOffPerson;
                existing.SignOffDate = report.SignOffDate;

                _context.SaveChanges();
                return Ok(existing);
            }
            else
            {
                if (string.IsNullOrWhiteSpace(report.Id))
                {
                    report.Id = $"8D-{DateTime.Now:yyyyMMdd}-{_context.EightDReports.Count() + 1:D3}";
                }
                report.CreatedAt = DateTime.UtcNow;
                report.UpdatedAt = DateTime.UtcNow;
                _context.EightDReports.Add(report);
                _context.SaveChanges();
                return Ok(report);
            }
        }

        [HttpDelete("reports/{id}")]
        public IActionResult DeleteReport(string id)
        {
            var report = _context.EightDReports.FirstOrDefault(r => r.Id == id);
            if (report == null)
            {
                return NotFound(new { message = $"Không tìm thấy báo cáo {id}." });
            }
            _context.EightDReports.Remove(report);
            _context.SaveChanges();
            return Ok(new { message = $"Đã xóa báo cáo {id} thành công." });
        }

        [HttpGet("generate-evidence")]
        public IActionResult GenerateEvidence(
            [FromQuery] string product,
            [FromQuery] string? defectType,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo)
        {
            if (string.IsNullOrWhiteSpace(product))
            {
                return BadRequest(new { message = "Vui lòng chọn mã sản phẩm để tạo bằng chứng." });
            }

            var evidence = _dashboardService.GenerateEvidence(product, defectType, dateFrom, dateTo);
            return Ok(evidence);
        }
    }
}
