using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using ProductionDashboard.Api.Models;
using ProductionDashboard.Api.Services;

namespace ProductionDashboard.Api.Data
{
    public static class DataSeeder
    {
        public static void Initialize(AppDbContext context, ExcelParserService parserService, string workspacePath)
        {
            context.Database.EnsureCreated();

            if (context.ProductionRecords.Any() && context.InventoryAuditRecords.Any())
            {
                return; // Already initialized
            }

            ForceSeed(context, parserService, workspacePath);
        }

        public static void ForceSeed(AppDbContext context, ExcelParserService parserService, string workspacePath)
        {
            context.Database.EnsureCreated();

            // Clear old records to guarantee fresh state
            context.ProductionRecords.RemoveRange(context.ProductionRecords);
            context.ManpowerRecords.RemoveRange(context.ManpowerRecords);
            context.QualityRecords.RemoveRange(context.QualityRecords);
            context.DowntimeRecords.RemoveRange(context.DowntimeRecords);
            context.InventoryAuditRecords.RemoveRange(context.InventoryAuditRecords);
            context.SaveChanges();

            // 1. Seed Production
            SeedProductionRecords(context, parserService, workspacePath);

            // 2. Seed Inventory
            string inventoryFilePath = Path.Combine(workspacePath, "KIỂM KÊ D6(1111).xlsx");
            if (!File.Exists(inventoryFilePath))
            {
                var files = Directory.GetFiles(workspacePath, "*KI*M*KE*.xlsx");
                if (files.Length > 0) inventoryFilePath = files[0];
                else
                {
                    var cur = new DirectoryInfo(workspacePath);
                    while (cur != null && !File.Exists(inventoryFilePath))
                    {
                        var found = cur.GetFiles("*KI*M*KE*.xlsx");
                        if (found.Length > 0) { inventoryFilePath = found[0].FullName; break; }
                        cur = cur.Parent;
                    }
                }
            }

            if (File.Exists(inventoryFilePath))
            {
                using var stream = File.OpenRead(inventoryFilePath);
                var auditRecords = parserService.ParseInventoryExcel(stream);
                if (auditRecords.Count > 0)
                {
                    context.InventoryAuditRecords.AddRange(auditRecords);
                }
            }

            context.SaveChanges();
        }

        public static void SeedProductionOnly(AppDbContext context, ExcelParserService parserService, string workspacePath)
        {
            context.Database.EnsureCreated();

            context.ProductionRecords.RemoveRange(context.ProductionRecords);
            context.ManpowerRecords.RemoveRange(context.ManpowerRecords);
            context.QualityRecords.RemoveRange(context.QualityRecords);
            context.DowntimeRecords.RemoveRange(context.DowntimeRecords);
            context.SaveChanges();

            SeedProductionRecords(context, parserService, workspacePath);
        }

        private static void SeedProductionRecords(AppDbContext context, ExcelParserService parserService, string workspacePath)
        {
            // Resolve file paths with robust fallbacks
            string productionFilePath = Path.Combine(workspacePath, "Bao_Cao_Tong_Hop_San_Luong_Nhan_Luc_NG (1).xlsx");
            if (!File.Exists(productionFilePath))
            {
                var pFiles = Directory.GetFiles(workspacePath, "*Bao_Cao_Tong_Hop*.xlsx");
                if (pFiles.Length > 0) productionFilePath = pFiles[0];
                else
                {
                    var cur = new DirectoryInfo(workspacePath);
                    while (cur != null && !File.Exists(productionFilePath))
                    {
                        var found = cur.GetFiles("*Bao_Cao_Tong_Hop*.xlsx");
                        if (found.Length > 0) { productionFilePath = found[0].FullName; break; }
                        cur = cur.Parent;
                    }
                }
            }

            // 1. Parse Excel Files
            if (File.Exists(productionFilePath))
            {
                using var stream = File.OpenRead(productionFilePath);
                var parsed = parserService.ParseProductionExcel(stream);
                if (parsed.ProductionRecords.Count > 0)
                {
                    context.ProductionRecords.AddRange(parsed.ProductionRecords);
                }
                if (parsed.ManpowerRecords.Count > 0)
                {
                    context.ManpowerRecords.AddRange(parsed.ManpowerRecords);
                }
            }
            context.SaveChanges();

            // 2. Enrich historical dates (2026-10-01 to 2026-10-08) for all 6 core products
            // to support rich time-series filtering (Today, Last 7 Days, This Month, etc.)
            var productList = new[]
            {
                new { Code = "喇叭", Name = "Loa SPK", PlanBase = 1300.0, TCGC = 173.0, HoursBase = 100.0, ManBase = 18.0 },
                new { Code = "麦克风", Name = "Microphone (MIC)", PlanBase = 2000.0, TCGC = 367.0, HoursBase = 190.0, ManBase = 24.0 },
                new { Code = "控制盒", Name = "Hộp điều khiển (Control Box)", PlanBase = 1700.0, TCGC = 950.0, HoursBase = 287.0, ManBase = 35.0 },
                new { Code = "头戴", Name = "Đai đầu (Headband)", PlanBase = 1800.0, TCGC = 259.0, HoursBase = 95.0, ManBase = 16.0 },
                new { Code = "组装", Name = "Lắp ráp (Assembly)", PlanBase = 2200.0, TCGC = 1663.0, HoursBase = 732.0, ManBase = 85.0 },
                new { Code = "包装", Name = "Đóng gói (Packaging)", PlanBase = 2200.0, TCGC = 518.0, HoursBase = 280.0, ManBase = 32.0 },
            };

            var historicalDates = new List<DateTime>();
            DateTime today = new DateTime(2026, 10, 8);
            for (int i = 14; i >= 0; i--)
            {
                historicalDates.Add(today.AddDays(-i));
            }

            var rand = new Random(42);

            var downtimeReasons = new[]
            {
                "Hỏng máy hàn siêu âm / Ultrasonic welder failure",
                "Kẹt khuôn dập tai nghe / Jig mold jammed",
                "Chờ cấp liệu dây cáp USB / Waiting for cable materials",
                "Điều chỉnh thông số kiểm tra âm thanh / Audio tester calibration",
                "Thay đầu hàn thiếc tự động / Soldering tip replacement",
                "Lỗi kết nối máy nạp firmware PCBA / PCBA firmware flashing error",
                "Đổi model & Vệ sinh chuyền 5S / Line changeover & 5S cleaning"
            };

            foreach (var dt in historicalDates)
            {
                // Check if already exists for this date
                if (context.ProductionRecords.Any(p => p.Date.Date == dt.Date))
                {
                    continue;
                }

                foreach (var p in productList)
                {
                    double variation = 0.9 + (rand.NextDouble() * 0.22); // 90% - 112%
                    double plan = p.PlanBase;
                    double actual = Math.Round(plan * variation);
                    double workingHours = Math.Round(p.HoursBase * (0.95 + rand.NextDouble() * 0.1), 1);
                    double uph = workingHours > 0 ? Math.Round(actual / workingHours, 1) : 0;
                    double efficiency = workingHours > 0 ? (actual * p.TCGC) / (3600.0 * workingHours) : 0;
                    double achieve = plan > 0 ? (actual / plan) : 0;

                    context.ProductionRecords.Add(new ProductionRecord
                    {
                        Date = dt.Date,
                        ProductCode = p.Code,
                        ProductNameVi = p.Name,
                        Shift = "Ca Ngày",
                        PlannedQuantity = plan,
                        ActualQuantity = actual,
                        AchievementRate = achieve,
                        StandardWorkingTime = p.TCGC,
                        WorkingHours = workingHours,
                        Efficiency = efficiency,
                        UPH = uph,
                        Status = "Completed",
                        Notes = (achieve < 0.95) ? "Chậm tiến độ do chờ cấp vật tư" : "Sản xuất ổn định đạt chỉ tiêu"
                    });

                    // Manpower
                    double plannedMan = p.ManBase;
                    double missingMan = rand.NextDouble() < 0.4 ? rand.Next(1, 3) : 0;
                    double actualMan = plannedMan - missingMan;
                    context.ManpowerRecords.Add(new ManpowerRecord
                    {
                        Date = dt.Date,
                        ProductCode = p.Code,
                        PlannedManpower = plannedMan,
                        ActualManpower = actualMan,
                        MissingManpower = missingMan,
                        MissingRate = missingMan / plannedMan
                    });

                    // Defect distribution across 11 defect types
                    double scratch = rand.Next(4, 16);
                    double audio = rand.Next(3, 14);
                    double edgeChip = rand.Next(2, 9);
                    double func = rand.Next(1, 8);
                    double wire = rand.Next(1, 6);
                    double pcba = rand.Next(1, 7);
                    double thd = rand.Next(0, 5);
                    double speaker = rand.Next(0, 4);
                    double cover = rand.Next(0, 4);
                    double nomali = rand.Next(0, 3);
                    double brokenWire = rand.Next(0, 3);

                    double totalNG = scratch + audio + edgeChip + func + wire + pcba + thd + speaker + cover + nomali + brokenWire;
                    double ngRate = actual > 0 ? (totalNG / actual) : 0;

                    context.QualityRecords.Add(new QualityRecord
                    {
                        Date = dt.Date,
                        ProductCode = p.Code,
                        FunctionalNG = func,
                        AudioNG = audio,
                        ScratchNG = scratch,
                        EdgeChipNG = edgeChip,
                        WireNG = wire,
                        PCBANG = pcba,
                        THDNG = thd,
                        SpeakerNG = speaker,
                        CoverNG = cover,
                        NomaliNG = nomali,
                        BrokenWireNG = brokenWire,
                        TotalNG = totalNG,
                        NGRatio = ngRate
                    });

                    // Downtime records
                    if (rand.NextDouble() < 0.6)
                    {
                        double dtMinutes = rand.Next(10, 45);
                        string reason = downtimeReasons[rand.Next(downtimeReasons.Length)];
                        context.DowntimeRecords.Add(new DowntimeRecord
                        {
                            Date = dt.Date,
                            ProductCode = p.Code,
                            DowntimeMinutes = dtMinutes,
                            DowntimeReason = reason,
                            ImpactDepartment = reason.Contains("vật tư") ? "Kho & Chuỗi cung ứng" : "Bảo trì thiết bị"
                        });
                    }
                }
            }

            // Ensure baseline quality records exist for 2026-07-30 if not already populated
            foreach (var p in productList)
            {
                if (!context.QualityRecords.Any(q => q.ProductCode == p.Code))
                {
                    context.QualityRecords.Add(new QualityRecord
                    {
                        Date = new DateTime(2026, 7, 30),
                        ProductCode = p.Code,
                        FunctionalNG = 4,
                        AudioNG = 12,
                        ScratchNG = 18,
                        EdgeChipNG = 7,
                        WireNG = 3,
                        PCBANG = 5,
                        THDNG = 4,
                        SpeakerNG = 2,
                        CoverNG = 2,
                        NomaliNG = 1,
                        BrokenWireNG = 1,
                        TotalNG = 59,
                        NGRatio = 59.0 / (p.PlanBase)
                    });
                }
            }

            // Seed sample 8D report
            if (!context.EightDReports.Any())
            {
                context.EightDReports.Add(new EightDReport
                {
                    Id = "8D-202610-001",
                    Title = "Xử lý tỷ lệ lỗi Xước vỏ và Âm thanh vượt ngưỡng trên line 喇叭 (Loa SPK)",
                    Mode = "8D",
                    ProductCode = "喇叭",
                    DefectType = "XƯỚC 划伤",
                    DateRange = "2026-10-01 ~ 2026-10-08",
                    Severity = "High",
                    Status = "In Progress",
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    UpdatedAt = DateTime.UtcNow,
                    TeamLeader = "Nguyễn Văn Tuấn (QA Lead)",
                    Champion = "Trần Đình Khang (Production Director)",
                    TeamMembers = "Lê Hoàng Quân (Kỹ thuật), Phạm Thị Mai (Giám sát chuyền), Zhang Wei (Chuyên viên khuôn)",
                    ProblemStatement = "Trong tuần 40/2026, tỷ lệ lỗi Xước ngoại quan và lệch Âm thanh tại công đoạn lắp Loa SPK tăng đột biến lên 2.8%, vượt ngưỡng kiểm soát 1.5%.",
                    EvidenceDetails = "Dữ liệu thực tế: Sản lượng = 9,120 cái; NG Tổng = 248 cái; Lỗi Xước = 98 cái (39.5%), Âm thanh = 65 cái (26.2%). Thời gian dừng máy phát sinh: 135 phút.",
                    EvidenceProductionQty = 9120,
                    EvidenceNGQty = 248,
                    EvidenceNGRate = 0.0272,
                    EvidenceTopDefect = "XƯỚC 划伤",
                    ContainmentAction = "1) Phong tỏa lô hàng SPK ca tối 05/10 để sàng lọc 100%. 2) Dán màng PE chống xước tại bàn gá jig. 3) Hiệu chuẩn lại đầu đo âm thanh Audio Precision.",
                    ContainmentOwner = "Phạm Thị Mai (QA Inspector)",
                    ContainmentDueDate = "2026-10-06",
                    ContainmentStatus = "Completed",
                    RootCauseWhy1 = "Tại sao xuất hiện vết xước? Vỏ loa cọ sát vào cạnh sắc của Jig gá khi nhân viên thao tác.",
                    RootCauseWhy2 = "Tại sao Jig có cạnh sắc? Lớp đệm cao su silicon giảm chấn trên Jig bị mòn rách sau 15,000 chu kỳ mà chưa thay thế.",
                    RootCauseWhy3 = "Tại sao không phát hiện mòn rách? Bảng checklist bảo trì PM hàng ngày chưa có hạng mục đo độ dày lớp đệm silicon.",
                    RootCauseWhy4 = "Tại sao âm thanh bị rè/lệch? Mảnh mạt nhựa và hạt bụi từ vết xước rơi vào khe hở màng loa trong quá trình xoay ép.",
                    RootCauseWhy5 = "Gốc rễ (Root Cause): Thiếu quy trình bảo dưỡng phòng ngừa (TPM) định kỳ cho phụ kiện tiếp xúc chi tiết nhạy cảm và thiếu thiết bị hút chân không khử bụi tại trạm lắp.",
                    RootCauseSummary = "Mòn lớp silicon đệm trên gá Jig và tích tụ mạt bụi tại trạm ép củ loa gây xước bề mặt và tạp âm.",
                    CorrectiveActions = "1) Thiết kế lại gá Jig sử dụng đệm Teflon chống mài mòn cao. 2) Lắp đặt vòi hút thổi ion khử tĩnh điện và bụi tại trạm lắp ráp SPK. 3) Đưa checklist kiểm tra độ bóng Jig vào đầu mỗi ca sản xuất.",
                    ActionOwner = "Lê Hoàng Quân (Kỹ sư Thiết bị)",
                    ActionDueDate = "2026-10-12",
                    ValidationResult = "Thử nghiệm mẫu 500 cái với Jig mới: Tỷ lệ xước giảm còn 0.05%, âm thanh đạt 100% Cpk > 1.67.",
                    ValidationDate = "2026-10-10",
                    PreventativeActions = "Chuẩn hóa tài liệu SOP-MNT-042 về kiểm tra bề mặt đồ gá nhựa. Đào tạo 100% thao tác viên về kỹ năng cầm nắm sản phẩm có bề mặt bóng.",
                    StandardOperatingProcedure = "SOP-PROD-SPK-018 Rev 3.2",
                    TeamRecognition = "Khen thưởng nhóm cải tiến line D6 hoàn thành xử lý containment và thiết kế Jig trong 48 giờ.",
                    SignOffPerson = "Trần Đình Khang",
                    SignOffDate = "2026-10-15"
                });
            }

            // Seed user layout config
            if (!context.UserLayoutConfigs.Any())
            {
                context.UserLayoutConfigs.Add(new UserLayoutConfig
                {
                    UserId = "default_user",
                    Theme = "dark",
                    Language = "vi",
                    ManpowerShortageThreshold = 0.10,
                    WidgetsJson = "[\"kpi\",\"planVsActual\",\"productionByProduct\",\"efficiency\",\"manpower\",\"qualityPareto\",\"defectHeatmap\",\"downtime\",\"uph\",\"productMatrix\",\"problemSolving\"]",
                    UpdatedAt = DateTime.UtcNow
                });
            }

            context.SaveChanges();
        }
    }
}
