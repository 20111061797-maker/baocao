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

        // ==========================================
        // FORM 1: PRODUCTION RECORDS CRUD ENDPOINTS
        // ==========================================

        [HttpGet("crud-records")]
        public IActionResult GetCrudRecords(
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] string? product,
            [FromQuery] string? shift,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _context.ProductionRecords.AsQueryable();

            if (dateFrom.HasValue) query = query.Where(p => p.Date >= dateFrom.Value.Date);
            if (dateTo.HasValue) query = query.Where(p => p.Date <= dateTo.Value.Date);
            if (!string.IsNullOrWhiteSpace(product) && !product.Equals("all", StringComparison.OrdinalIgnoreCase))
                query = query.Where(p => p.ProductCode == product);
            if (!string.IsNullOrWhiteSpace(shift) && !shift.Equals("all", StringComparison.OrdinalIgnoreCase))
                query = query.Where(p => p.Shift == shift);
            if (!string.IsNullOrWhiteSpace(search))
            {
                string term = search.Trim().ToLowerInvariant();
                query = query.Where(p => p.ProductCode.ToLower().Contains(term) ||
                                         p.ProductNameVi.ToLower().Contains(term) ||
                                         (p.Notes != null && p.Notes.ToLower().Contains(term)));
            }

            int total = query.Count();
            var list = query.OrderByDescending(p => p.Date).ThenBy(p => p.ProductCode)
                            .Skip((page - 1) * pageSize)
                            .Take(pageSize)
                            .ToList();

            var dates = list.Select(x => x.Date.Date).Distinct().ToList();
            var codes = list.Select(x => x.ProductCode).Distinct().ToList();

            var mans = _context.ManpowerRecords
                .Where(m => dates.Contains(m.Date.Date) && codes.Contains(m.ProductCode))
                .ToList();
            var quals = _context.QualityRecords
                .Where(q => dates.Contains(q.Date.Date) && codes.Contains(q.ProductCode))
                .ToList();
            var dts = _context.DowntimeRecords
                .Where(d => dates.Contains(d.Date.Date) && codes.Contains(d.ProductCode))
                .ToList();

            var dtos = list.Select(r =>
            {
                var m = mans.FirstOrDefault(x => x.Date.Date == r.Date.Date && x.ProductCode == r.ProductCode);
                var q = quals.FirstOrDefault(x => x.Date.Date == r.Date.Date && x.ProductCode == r.ProductCode);
                var dt = dts.FirstOrDefault(x => x.Date.Date == r.Date.Date && x.ProductCode == r.ProductCode);

                return new ProductionRecordCrudDto
                {
                    Id = r.Id,
                    Date = r.Date,
                    ProductCode = r.ProductCode,
                    ProductNameVi = string.IsNullOrEmpty(r.ProductNameVi) ? ExcelParserService.GetVietnameseProductName(r.ProductCode) : r.ProductNameVi,
                    Shift = r.Shift,
                    PlannedQuantity = r.PlannedQuantity,
                    ActualQuantity = r.ActualQuantity,
                    StandardWorkingTime = r.StandardWorkingTime,
                    WorkingHours = r.WorkingHours,
                    AchievementRate = r.AchievementRate,
                    Efficiency = r.Efficiency,
                    UPH = r.UPH,
                    Status = r.Status,
                    Notes = r.Notes,

                    PlannedManpower = m?.PlannedManpower ?? 0,
                    ActualManpower = m?.ActualManpower ?? 0,
                    MissingManpower = m?.MissingManpower ?? 0,

                    FunctionalNG = q?.FunctionalNG ?? 0,
                    AudioNG = q?.AudioNG ?? 0,
                    ScratchNG = q?.ScratchNG ?? 0,
                    EdgeChipNG = q?.EdgeChipNG ?? 0,
                    WireNG = q?.WireNG ?? 0,
                    PCBANG = q?.PCBANG ?? 0,
                    THDNG = q?.THDNG ?? 0,
                    SpeakerNG = q?.SpeakerNG ?? 0,
                    CoverNG = q?.CoverNG ?? 0,
                    NomaliNG = q?.NomaliNG ?? 0,
                    BrokenWireNG = q?.BrokenWireNG ?? 0,
                    TotalNG = q?.TotalNG ?? 0,
                    NGRate = q?.NGRatio ?? 0,

                    DowntimeMinutes = dt?.DowntimeMinutes ?? 0,
                    DowntimeReason = dt?.DowntimeReason ?? "",
                    ImpactDepartment = dt?.ImpactDepartment ?? ""
                };
            }).ToList();

            return Ok(new { total, page, pageSize, records = dtos });
        }

        [HttpPost("record")]
        public IActionResult CreateProductionRecord([FromBody] ProductionRecordCrudDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Dữ liệu không hợp lệ." });
            if (string.IsNullOrWhiteSpace(dto.ProductCode))
                return BadRequest(new { message = "Vui lòng chọn mã sản phẩm / công đoạn." });

            string nameVi = string.IsNullOrWhiteSpace(dto.ProductNameVi)
                ? ExcelParserService.GetVietnameseProductName(dto.ProductCode)
                : dto.ProductNameVi;

            double achieve = dto.PlannedQuantity > 0 ? (dto.ActualQuantity / dto.PlannedQuantity) : 0;
            double uph = dto.WorkingHours > 0 ? (dto.ActualQuantity / dto.WorkingHours) : 0;
            double eff = dto.WorkingHours > 0 ? (dto.ActualQuantity * dto.StandardWorkingTime) / (3600.0 * dto.WorkingHours) : 0;

            var rec = new ProductionRecord
            {
                Date = dto.Date.Date,
                ProductCode = dto.ProductCode.Trim(),
                ProductNameVi = nameVi,
                Shift = string.IsNullOrWhiteSpace(dto.Shift) ? "Ca Ngày" : dto.Shift.Trim(),
                PlannedQuantity = dto.PlannedQuantity,
                ActualQuantity = dto.ActualQuantity,
                AchievementRate = achieve,
                StandardWorkingTime = dto.StandardWorkingTime,
                WorkingHours = dto.WorkingHours,
                Efficiency = eff,
                UPH = uph,
                Status = dto.ActualQuantity > 0 ? "Completed" : "Scheduled",
                Notes = dto.Notes
            };

            _context.ProductionRecords.Add(rec);

            // Manpower
            var man = new ManpowerRecord
            {
                Date = dto.Date.Date,
                ProductCode = dto.ProductCode.Trim(),
                PlannedManpower = dto.PlannedManpower,
                ActualManpower = dto.ActualManpower,
                MissingManpower = dto.PlannedManpower - dto.ActualManpower,
                MissingRate = dto.PlannedManpower > 0 ? ((dto.PlannedManpower - dto.ActualManpower) / dto.PlannedManpower) : 0
            };
            _context.ManpowerRecords.Add(man);

            // Quality
            double totalNG = dto.FunctionalNG + dto.AudioNG + dto.ScratchNG + dto.EdgeChipNG +
                             dto.WireNG + dto.PCBANG + dto.THDNG + dto.SpeakerNG +
                             dto.CoverNG + dto.NomaliNG + dto.BrokenWireNG;
            double ngRate = dto.ActualQuantity > 0 ? (totalNG / dto.ActualQuantity) : 0;

            var qual = new QualityRecord
            {
                Date = dto.Date.Date,
                ProductCode = dto.ProductCode.Trim(),
                FunctionalNG = dto.FunctionalNG,
                AudioNG = dto.AudioNG,
                ScratchNG = dto.ScratchNG,
                EdgeChipNG = dto.EdgeChipNG,
                WireNG = dto.WireNG,
                PCBANG = dto.PCBANG,
                THDNG = dto.THDNG,
                SpeakerNG = dto.SpeakerNG,
                CoverNG = dto.CoverNG,
                NomaliNG = dto.NomaliNG,
                BrokenWireNG = dto.BrokenWireNG,
                TotalNG = totalNG,
                NGRatio = ngRate
            };
            _context.QualityRecords.Add(qual);

            // Downtime
            if (dto.DowntimeMinutes > 0 || !string.IsNullOrWhiteSpace(dto.DowntimeReason))
            {
                var dt = new DowntimeRecord
                {
                    Date = dto.Date.Date,
                    ProductCode = dto.ProductCode.Trim(),
                    DowntimeMinutes = dto.DowntimeMinutes,
                    DowntimeReason = string.IsNullOrWhiteSpace(dto.DowntimeReason) ? "Dừng điều chỉnh thiết bị" : dto.DowntimeReason.Trim(),
                    ImpactDepartment = string.IsNullOrWhiteSpace(dto.ImpactDepartment) ? "Kỹ thuật / Thiết bị" : dto.ImpactDepartment.Trim()
                };
                _context.DowntimeRecords.Add(dt);
            }

            _context.SaveChanges();

            dto.Id = rec.Id;
            dto.ProductNameVi = nameVi;
            dto.AchievementRate = achieve;
            dto.UPH = uph;
            dto.Efficiency = eff;
            dto.TotalNG = totalNG;
            dto.NGRate = ngRate;

            return Ok(new { message = "Đã thêm bản ghi sản xuất thành công.", record = dto });
        }

        [HttpPut("record/{id}")]
        public IActionResult UpdateProductionRecord(int id, [FromBody] ProductionRecordCrudDto dto)
        {
            var rec = _context.ProductionRecords.FirstOrDefault(p => p.Id == id);
            if (rec == null) return NotFound(new { message = "Không tìm thấy bản ghi cần sửa." });

            string nameVi = string.IsNullOrWhiteSpace(dto.ProductNameVi)
                ? ExcelParserService.GetVietnameseProductName(dto.ProductCode)
                : dto.ProductNameVi;

            double achieve = dto.PlannedQuantity > 0 ? (dto.ActualQuantity / dto.PlannedQuantity) : 0;
            double uph = dto.WorkingHours > 0 ? (dto.ActualQuantity / dto.WorkingHours) : 0;
            double eff = dto.WorkingHours > 0 ? (dto.ActualQuantity * dto.StandardWorkingTime) / (3600.0 * dto.WorkingHours) : 0;

            DateTime oldDate = rec.Date.Date;
            string oldProd = rec.ProductCode;

            rec.Date = dto.Date.Date;
            rec.ProductCode = dto.ProductCode.Trim();
            rec.ProductNameVi = nameVi;
            rec.Shift = string.IsNullOrWhiteSpace(dto.Shift) ? "Ca Ngày" : dto.Shift.Trim();
            rec.PlannedQuantity = dto.PlannedQuantity;
            rec.ActualQuantity = dto.ActualQuantity;
            rec.AchievementRate = achieve;
            rec.StandardWorkingTime = dto.StandardWorkingTime;
            rec.WorkingHours = dto.WorkingHours;
            rec.Efficiency = eff;
            rec.UPH = uph;
            rec.Status = dto.ActualQuantity > 0 ? "Completed" : "Scheduled";
            rec.Notes = dto.Notes;

            // Sync Manpower
            var man = _context.ManpowerRecords.FirstOrDefault(m => m.Date.Date == oldDate && m.ProductCode == oldProd);
            if (man == null)
            {
                man = new ManpowerRecord { Date = rec.Date, ProductCode = rec.ProductCode };
                _context.ManpowerRecords.Add(man);
            }
            man.Date = rec.Date;
            man.ProductCode = rec.ProductCode;
            man.PlannedManpower = dto.PlannedManpower;
            man.ActualManpower = dto.ActualManpower;
            man.MissingManpower = dto.PlannedManpower - dto.ActualManpower;
            man.MissingRate = dto.PlannedManpower > 0 ? ((dto.PlannedManpower - dto.ActualManpower) / dto.PlannedManpower) : 0;

            // Sync Quality
            double totalNG = dto.FunctionalNG + dto.AudioNG + dto.ScratchNG + dto.EdgeChipNG +
                             dto.WireNG + dto.PCBANG + dto.THDNG + dto.SpeakerNG +
                             dto.CoverNG + dto.NomaliNG + dto.BrokenWireNG;
            double ngRate = dto.ActualQuantity > 0 ? (totalNG / dto.ActualQuantity) : 0;

            var qual = _context.QualityRecords.FirstOrDefault(q => q.Date.Date == oldDate && q.ProductCode == oldProd);
            if (qual == null)
            {
                qual = new QualityRecord { Date = rec.Date, ProductCode = rec.ProductCode };
                _context.QualityRecords.Add(qual);
            }
            qual.Date = rec.Date;
            qual.ProductCode = rec.ProductCode;
            qual.FunctionalNG = dto.FunctionalNG;
            qual.AudioNG = dto.AudioNG;
            qual.ScratchNG = dto.ScratchNG;
            qual.EdgeChipNG = dto.EdgeChipNG;
            qual.WireNG = dto.WireNG;
            qual.PCBANG = dto.PCBANG;
            qual.THDNG = dto.THDNG;
            qual.SpeakerNG = dto.SpeakerNG;
            qual.CoverNG = dto.CoverNG;
            qual.NomaliNG = dto.NomaliNG;
            qual.BrokenWireNG = dto.BrokenWireNG;
            qual.TotalNG = totalNG;
            qual.NGRatio = ngRate;

            // Sync Downtime
            var dt = _context.DowntimeRecords.FirstOrDefault(d => d.Date.Date == oldDate && d.ProductCode == oldProd);
            if (dto.DowntimeMinutes > 0 || !string.IsNullOrWhiteSpace(dto.DowntimeReason))
            {
                if (dt == null)
                {
                    dt = new DowntimeRecord { Date = rec.Date, ProductCode = rec.ProductCode };
                    _context.DowntimeRecords.Add(dt);
                }
                dt.Date = rec.Date;
                dt.ProductCode = rec.ProductCode;
                dt.DowntimeMinutes = dto.DowntimeMinutes;
                dt.DowntimeReason = string.IsNullOrWhiteSpace(dto.DowntimeReason) ? "Dừng điều chỉnh thiết bị" : dto.DowntimeReason.Trim();
                dt.ImpactDepartment = string.IsNullOrWhiteSpace(dto.ImpactDepartment) ? "Kỹ thuật / Thiết bị" : dto.ImpactDepartment.Trim();
            }
            else if (dt != null)
            {
                _context.DowntimeRecords.Remove(dt);
            }

            _context.SaveChanges();

            dto.Id = rec.Id;
            dto.ProductNameVi = nameVi;
            dto.AchievementRate = achieve;
            dto.UPH = uph;
            dto.Efficiency = eff;
            dto.TotalNG = totalNG;
            dto.NGRate = ngRate;

            return Ok(new { message = "Đã cập nhật bản ghi sản xuất thành công.", record = dto });
        }

        [HttpDelete("record/{id}")]
        public IActionResult DeleteProductionRecord(int id)
        {
            var rec = _context.ProductionRecords.FirstOrDefault(p => p.Id == id);
            if (rec == null) return NotFound(new { message = "Không tìm thấy bản ghi cần xóa." });

            DateTime date = rec.Date.Date;
            string prod = rec.ProductCode;

            _context.ProductionRecords.Remove(rec);

            // If no other record for this date and product, clean up related records
            bool hasOther = _context.ProductionRecords.Any(p => p.Id != id && p.Date.Date == date && p.ProductCode == prod);
            if (!hasOther)
            {
                var mans = _context.ManpowerRecords.Where(m => m.Date.Date == date && m.ProductCode == prod).ToList();
                _context.ManpowerRecords.RemoveRange(mans);

                var quals = _context.QualityRecords.Where(q => q.Date.Date == date && q.ProductCode == prod).ToList();
                _context.QualityRecords.RemoveRange(quals);

                var dts = _context.DowntimeRecords.Where(d => d.Date.Date == date && d.ProductCode == prod).ToList();
                _context.DowntimeRecords.RemoveRange(dts);
            }

            _context.SaveChanges();
            return Ok(new { message = "Đã xóa bản ghi sản xuất thành công." });
        }

        // ==========================================
        // FORM 2: INVENTORY AUDIT CRUD ENDPOINTS
        // ==========================================

        [HttpPost("inventory-record")]
        public IActionResult CreateInventoryRecord([FromBody] InventoryAuditCrudDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Dữ liệu không hợp lệ." });
            if (string.IsNullOrWhiteSpace(dto.MaterialCode))
                return BadRequest(new { message = "Vui lòng nhập mã liệu." });

            string stage = string.IsNullOrWhiteSpace(dto.Stage) ? "LẮP RÁP D6" : dto.Stage.Trim();
            string section = string.IsNullOrWhiteSpace(dto.Section) ? stage : dto.Section.Trim();

            var item = new InventoryAuditRecord
            {
                Stage = stage,
                Section = section,
                MaterialCode = dto.MaterialCode.Trim(),
                UsagePerUnit = dto.UsagePerUnit,
                AuditRequired = dto.AuditRequired,
                RawMaterialWarehouse = dto.RawMaterialWarehouse,
                RawMaterialLine = dto.RawMaterialLine,
                SemiFinishedGoods = dto.SemiFinishedGoods,
                SemiFinishedGoods2 = dto.SemiFinishedGoods2,
                RepairRoom = dto.RepairRoom,
                FailureAnalysisFa = dto.FailureAnalysisFa,
                FinishedGoods = dto.FinishedGoods,
                Discrepancy = dto.Discrepancy,
                NGQuantity = dto.NGQuantity
            };

            _context.InventoryAuditRecords.Add(item);
            _context.SaveChanges();

            dto.Id = item.Id;
            return Ok(new { message = "Đã thêm mã kiểm kê vật tư thành công.", record = dto });
        }

        [HttpPut("inventory-record/{id}")]
        public IActionResult UpdateInventoryRecord(int id, [FromBody] InventoryAuditCrudDto dto)
        {
            var item = _context.InventoryAuditRecords.FirstOrDefault(i => i.Id == id);
            if (item == null) return NotFound(new { message = "Không tìm thấy mã kiểm kê cần sửa." });

            item.Stage = string.IsNullOrWhiteSpace(dto.Stage) ? item.Stage : dto.Stage.Trim();
            item.Section = string.IsNullOrWhiteSpace(dto.Section) ? item.Stage : dto.Section.Trim();
            item.MaterialCode = string.IsNullOrWhiteSpace(dto.MaterialCode) ? item.MaterialCode : dto.MaterialCode.Trim();
            item.UsagePerUnit = dto.UsagePerUnit;
            item.AuditRequired = dto.AuditRequired;
            item.RawMaterialWarehouse = dto.RawMaterialWarehouse;
            item.RawMaterialLine = dto.RawMaterialLine;
            item.SemiFinishedGoods = dto.SemiFinishedGoods;
            item.SemiFinishedGoods2 = dto.SemiFinishedGoods2;
            item.RepairRoom = dto.RepairRoom;
            item.FailureAnalysisFa = dto.FailureAnalysisFa;
            item.FinishedGoods = dto.FinishedGoods;
            item.Discrepancy = dto.Discrepancy;
            item.NGQuantity = dto.NGQuantity;

            _context.SaveChanges();

            dto.Id = item.Id;
            return Ok(new { message = "Đã cập nhật mã kiểm kê vật tư thành công.", record = dto });
        }

        [HttpDelete("inventory-record/{id}")]
        public IActionResult DeleteInventoryRecord(int id)
        {
            var item = _context.InventoryAuditRecords.FirstOrDefault(i => i.Id == id);
            if (item == null) return NotFound(new { message = "Không tìm thấy mã kiểm kê cần xóa." });

            _context.InventoryAuditRecords.Remove(item);
            _context.SaveChanges();

            return Ok(new { message = "Đã xóa mã kiểm kê thành công." });
        }
    }
}
