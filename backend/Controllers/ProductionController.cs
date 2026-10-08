using System;
using System.IO;
using System.Linq;
using System.Text;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProductionDashboard.Api.Data;
using ProductionDashboard.Api.Models;
using ProductionDashboard.Api.Services;

namespace ProductionDashboard.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductionController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ExcelParserService _parserService;
        private readonly DashboardService _dashboardService;

        public ProductionController(AppDbContext context, ExcelParserService parserService, DashboardService dashboardService)
        {
            _context = context;
            _parserService = parserService;
            _dashboardService = dashboardService;
        }

        [HttpPost("upload-excel")]
        public IActionResult UploadExcel(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Không tìm thấy file tải lên." });
            }

            try
            {
                using var stream = file.OpenReadStream();
                // Check if file is production or inventory
                string fname = file.FileName.ToUpperInvariant();
                bool isInventory = fname.Contains("KIỂM KÊ") || 
                                   fname.Contains("KIỂM KÊ") || 
                                   fname.Contains("KIEM KE") || 
                                   fname.Contains("KIEMKE") ||
                                   fname.Contains("D6") || 
                                   fname.Contains("AUDIT") || 
                                   fname.Contains("INVENTORY");

                if (isInventory)
                {
                    var auditItems = _parserService.ParseInventoryExcel(stream);
                    if (auditItems.Count > 0)
                    {
                        // Remove existing inventory records before re-importing to prevent duplicate stacking
                        _context.InventoryAuditRecords.RemoveRange(_context.InventoryAuditRecords);
                        _context.InventoryAuditRecords.AddRange(auditItems);

                        // If production records are currently empty, auto-seed them from sample file so the main dashboard is never blank
                        bool productionWasEmpty = !_context.ProductionRecords.Any();
                        if (productionWasEmpty)
                        {
                            string workspaceRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".."));
                            var cur = new DirectoryInfo(AppContext.BaseDirectory);
                            while (cur != null && !System.IO.File.Exists(Path.Combine(cur.FullName, "Bao_Cao_Tong_Hop_San_Luong_Nhan_Luc_NG (1).xlsx")))
                            {
                                cur = cur.Parent;
                            }
                            if (cur != null) workspaceRoot = cur.FullName;

                            DataSeeder.SeedProductionOnly(_context, _parserService, workspaceRoot);
                        }

                        _context.SaveChanges();

                        return Ok(new { 
                            message = $"Đã nhập thành công {auditItems.Count} mã kiểm kê vật tư D6 vào mục 'Kiểm kê Nguyên vật liệu'!" + (productionWasEmpty ? " (Đồng thời nạp dữ liệu sản xuất để Dashboard chính hiển thị đầy đủ)" : ""), 
                            count = auditItems.Count,
                            isInventory = true,
                            autoSeededProduction = productionWasEmpty
                        });
                    }
                }
                else
                {
                    var result = _parserService.ParseProductionExcel(stream);
                    if (result.ProductionRecords.Count > 0)
                    {
                        // Remove old production records before importing
                        _context.ProductionRecords.RemoveRange(_context.ProductionRecords);
                        _context.ManpowerRecords.RemoveRange(_context.ManpowerRecords);
                        _context.QualityRecords.RemoveRange(_context.QualityRecords);
                        _context.DowntimeRecords.RemoveRange(_context.DowntimeRecords);

                        _context.ProductionRecords.AddRange(result.ProductionRecords);
                        if (result.ManpowerRecords.Count > 0)
                        {
                            _context.ManpowerRecords.AddRange(result.ManpowerRecords);
                        }
                        if (result.QualityRecords.Count > 0)
                        {
                            _context.QualityRecords.AddRange(result.QualityRecords);
                        }
                        if (result.DowntimeRecords.Count > 0)
                        {
                            _context.DowntimeRecords.AddRange(result.DowntimeRecords);
                        }

                        // If inventory records are currently empty, auto-seed them
                        if (!_context.InventoryAuditRecords.Any())
                        {
                            string workspaceRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".."));
                            var cur = new DirectoryInfo(AppContext.BaseDirectory);
                            while (cur != null && !System.IO.File.Exists(Path.Combine(cur.FullName, "KIỂM KÊ D6(1111).xlsx")))
                            {
                                cur = cur.Parent;
                            }
                            if (cur != null) workspaceRoot = cur.FullName;

                            string invFile = Path.Combine(workspaceRoot, "KIỂM KÊ D6(1111).xlsx");
                            if (System.IO.File.Exists(invFile))
                            {
                                using var iStream = System.IO.File.OpenRead(invFile);
                                var iList = _parserService.ParseInventoryExcel(iStream);
                                if (iList.Count > 0)
                                {
                                    _context.InventoryAuditRecords.AddRange(iList);
                                }
                            }
                        }

                        _context.SaveChanges();

                        return Ok(new
                        {
                            message = $"Đã nhập thành công {result.ProductionRecords.Count} bản ghi sản xuất từ file Excel vào Dashboard.",
                            productionCount = result.ProductionRecords.Count,
                            qualityCount = result.QualityRecords.Count,
                            downtimeCount = result.DowntimeRecords.Count,
                            isInventory = false
                        });
                    }
                }

                return BadRequest(new { message = "Không tìm thấy dữ liệu hợp lệ trong file Excel. Vui lòng kiểm tra lại cấu trúc file." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi phân tích file Excel: " + ex.Message });
            }
        }

        [HttpPost("clear-data")]
        public IActionResult ClearData()
        {
            _context.ProductionRecords.RemoveRange(_context.ProductionRecords);
            _context.ManpowerRecords.RemoveRange(_context.ManpowerRecords);
            _context.QualityRecords.RemoveRange(_context.QualityRecords);
            _context.DowntimeRecords.RemoveRange(_context.DowntimeRecords);
            _context.InventoryAuditRecords.RemoveRange(_context.InventoryAuditRecords);
            _context.SaveChanges();
            return Ok(new { message = "Đã xóa toàn bộ dữ liệu. Bây giờ hệ thống trống, bạn có thể tự import file Excel mới." });
        }

        [HttpPost("seed-data")]
        public IActionResult SeedData()
        {
            try
            {
                string workspaceRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".."));
                if (!Directory.Exists(workspaceRoot) || !System.IO.File.Exists(Path.Combine(workspaceRoot, "Bao_Cao_Tong_Hop_San_Luong_Nhan_Luc_NG (1).xlsx")))
                {
                    var cur = new DirectoryInfo(AppContext.BaseDirectory);
                    while (cur != null && !System.IO.File.Exists(Path.Combine(cur.FullName, "Bao_Cao_Tong_Hop_San_Luong_Nhan_Luc_NG (1).xlsx")))
                    {
                        cur = cur.Parent;
                    }
                    if (cur != null) workspaceRoot = cur.FullName;
                }

                DataSeeder.ForceSeed(_context, _parserService, workspaceRoot);

                int prodCount = _context.ProductionRecords.Count();
                int auditCount = _context.InventoryAuditRecords.Count();

                return Ok(new
                {
                    message = $"Đã nạp lại thành công toàn bộ dữ liệu: {prodCount} bản ghi sản xuất (7 ngày qua) và {auditCount} mã kiểm kê (4 tabs D6).",
                    productionCount = prodCount,
                    inventoryCount = auditCount
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi nạp lại dữ liệu: " + ex.Message });
            }
        }

        [HttpGet("export-excel")]
        public IActionResult ExportExcel([FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo, [FromQuery] string? product, [FromQuery] string? shift)
        {
            var filter = new DashboardFilterRequest
            {
                DateFrom = dateFrom,
                DateTo = dateTo,
                Product = product,
                Shift = shift
            };

            var (from, to) = _dashboardService.ResolveDateRange(filter);
            var query = _context.ProductionRecords.Where(p => p.Date >= from && p.Date <= to);
            if (!string.IsNullOrWhiteSpace(product) && !product.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(p => p.ProductCode == product);
            }
            if (!string.IsNullOrWhiteSpace(shift) && !shift.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(p => p.Shift == shift);
            }

            var records = query.OrderBy(p => p.Date).ThenBy(p => p.ProductCode).ToList();
            var quals = _context.QualityRecords.Where(q => q.Date >= from && q.Date <= to).ToList();
            var dts = _context.DowntimeRecords.Where(d => d.Date >= from && d.Date <= to).ToList();

            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("BaoCaoSanXuat");

            // Headers
            string[] headers = new[]
            {
                "Ngày", "Mã hàng", "Tên sản phẩm", "Ca", "Kế hoạch", "Thực tế", "Đạt %", "TCGC (s)", "Giờ công",
                "Hiệu suất %", "UPH", "Tổng NG", "Tỷ lệ NG %", "Dừng máy (phút)", "Ghi chú"
            };

            for (int col = 0; col < headers.Length; col++)
            {
                var cell = ws.Cell(1, col + 1);
                cell.Value = headers[col];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.FromArgb(24, 43, 73);
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }

            int rowIdx = 2;
            foreach (var r in records)
            {
                var q = quals.FirstOrDefault(x => x.Date.Date == r.Date.Date && x.ProductCode == r.ProductCode);
                var dtMinutes = dts.Where(x => x.Date.Date == r.Date.Date && x.ProductCode == r.ProductCode).Sum(x => x.DowntimeMinutes);
                double totalNG = q?.TotalNG ?? 0;
                double ngRate = r.ActualQuantity > 0 ? (totalNG / r.ActualQuantity) * 100 : 0;

                ws.Cell(rowIdx, 1).Value = r.Date.ToString("yyyy-MM-dd");
                ws.Cell(rowIdx, 2).Value = r.ProductCode;
                ws.Cell(rowIdx, 3).Value = r.ProductNameVi;
                ws.Cell(rowIdx, 4).Value = r.Shift;
                ws.Cell(rowIdx, 5).Value = r.PlannedQuantity;
                ws.Cell(rowIdx, 6).Value = r.ActualQuantity;
                ws.Cell(rowIdx, 7).Value = Math.Round(r.AchievementRate * 100, 1);
                ws.Cell(rowIdx, 8).Value = r.StandardWorkingTime;
                ws.Cell(rowIdx, 9).Value = r.WorkingHours;
                ws.Cell(rowIdx, 10).Value = Math.Round(r.Efficiency * 100, 1);
                ws.Cell(rowIdx, 11).Value = Math.Round(r.UPH, 1);
                ws.Cell(rowIdx, 12).Value = totalNG;
                ws.Cell(rowIdx, 13).Value = Math.Round(ngRate, 2);
                ws.Cell(rowIdx, 14).Value = dtMinutes;
                ws.Cell(rowIdx, 15).Value = r.Notes ?? "";

                rowIdx++;
            }

            ws.Columns().AdjustToContents();

            using var memoryStream = new MemoryStream();
            workbook.SaveAs(memoryStream);
            memoryStream.Position = 0;

            string fileName = $"BaoCao_SanXuat_{from:yyyyMMdd}_{to:yyyyMMdd}.xlsx";
            return File(memoryStream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        [HttpGet("export-csv")]
        public IActionResult ExportCsv([FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo, [FromQuery] string? product, [FromQuery] string? shift)
        {
            var filter = new DashboardFilterRequest
            {
                DateFrom = dateFrom,
                DateTo = dateTo,
                Product = product,
                Shift = shift
            };

            var (from, to) = _dashboardService.ResolveDateRange(filter);
            var query = _context.ProductionRecords.Where(p => p.Date >= from && p.Date <= to);
            if (!string.IsNullOrWhiteSpace(product) && !product.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(p => p.ProductCode == product);
            }

            var records = query.OrderBy(p => p.Date).ThenBy(p => p.ProductCode).ToList();
            var sb = new StringBuilder();
            sb.AppendLine("Date,ProductCode,ProductNameVi,Shift,Plan,Actual,AchievementRatePercent,StandardTime,WorkingHours,EfficiencyPercent,UPH,Notes");

            foreach (var r in records)
            {
                sb.AppendLine($"{r.Date:yyyy-MM-dd},\"{r.ProductCode}\",\"{r.ProductNameVi}\",\"{r.Shift}\",{r.PlannedQuantity},{r.ActualQuantity},{Math.Round(r.AchievementRate * 100, 1)},{r.StandardWorkingTime},{r.WorkingHours},{Math.Round(r.Efficiency * 100, 1)},{Math.Round(r.UPH, 1)},\"{r.Notes}\"");
            }

            byte[] bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
            string fileName = $"BaoCao_SanXuat_{from:yyyyMMdd}_{to:yyyyMMdd}.csv";
            return File(bytes, "text/csv; charset=utf-8", fileName);
        }
    }
}
