using System;
using System.Collections.Generic;
using System.IO;
using ClosedXML.Excel;
using ProductionDashboard.Api.Models;

namespace ProductionDashboard.Api.Services
{
    public class ExcelParserResult
    {
        public List<ProductionRecord> ProductionRecords { get; set; } = new();
        public List<ManpowerRecord> ManpowerRecords { get; set; } = new();
        public List<QualityRecord> QualityRecords { get; set; } = new();
        public List<DowntimeRecord> DowntimeRecords { get; set; } = new();
        public List<InventoryAuditRecord> InventoryRecords { get; set; } = new();
        public int TotalProcessedRows { get; set; }
        public List<string> Warnings { get; set; } = new();
    }

    public class ExcelParserService
    {
        public static string GetVietnameseProductName(string productCode)
        {
            if (string.IsNullOrWhiteSpace(productCode)) return string.Empty;
            return productCode.Trim() switch
            {
                "喇叭" => "Loa SPK",
                "麦克风" => "Microphone (MIC)",
                "控制盒" => "Hộp điều khiển (Control Box)",
                "头戴" => "Đai đầu (Headband)",
                "组装" => "Lắp ráp (Assembly)",
                "包装" => "Đóng gói (Packaging)",
                _ => productCode
            };
        }

        public ExcelParserResult ParseProductionExcel(Stream fileStream)
        {
            var result = new ExcelParserResult();

            using var workbook = new XLWorkbook(fileStream);
            var worksheet = workbook.Worksheet(1); // First sheet: BaoCaoTongHop

            var rows = worksheet.RowsUsed();
            DateTime lastValidDate = new DateTime(2026, 7, 30); // fallback if relative

            bool isFirstRow = true;
            foreach (var row in rows)
            {
                if (isFirstRow)
                {
                    isFirstRow = false;
                    continue; // Skip header row
                }

                // Check Product Code (Col B)
                var prodCell = row.Cell(2);
                string productCode = prodCell.GetString()?.Trim() ?? string.Empty;

                if (string.IsNullOrWhiteSpace(productCode) || productCode.Equals("#DIV/0!", StringComparison.OrdinalIgnoreCase))
                {
                    continue; // Skip empty rows or template formulas
                }

                // Parse Date (Col A)
                var dateCell = row.Cell(1);
                DateTime recordDate;
                if (!dateCell.IsEmpty())
                {
                    if (dateCell.DataType == XLDataType.DateTime)
                    {
                        recordDate = dateCell.GetDateTime();
                        lastValidDate = recordDate;
                    }
                    else if (dateCell.DataType == XLDataType.Number)
                    {
                        double oaDate = dateCell.GetDouble();
                        recordDate = DateTime.FromOADate(oaDate);
                        lastValidDate = recordDate;
                    }
                    else if (DateTime.TryParse(dateCell.GetString(), out var parsedDate))
                    {
                        recordDate = parsedDate;
                        lastValidDate = recordDate;
                    }
                    else
                    {
                        recordDate = lastValidDate;
                    }
                }
                else
                {
                    recordDate = lastValidDate;
                }

                // Numbers with safe double parsing
                double plannedManpower = SafeGetDouble(row.Cell(3));
                double actualManpower = SafeGetDouble(row.Cell(4));
                double missingManpower = SafeGetDouble(row.Cell(5));
                if (missingManpower == 0 && (plannedManpower > 0 || actualManpower > 0))
                {
                    missingManpower = Math.Max(0, plannedManpower - actualManpower);
                }

                double planQty = SafeGetDouble(row.Cell(6));
                double actualQty = SafeGetDouble(row.Cell(7));
                double standardTime = SafeGetDouble(row.Cell(8));
                double workingHours = SafeGetDouble(row.Cell(9));

                // Formulas
                double efficiency = SafeGetDouble(row.Cell(10));
                if (efficiency == 0 && workingHours > 0)
                {
                    efficiency = (actualQty * standardTime) / (3600.0 * workingHours);
                }

                double achievementRate = SafeGetDouble(row.Cell(11));
                if (achievementRate == 0 && planQty > 0)
                {
                    achievementRate = actualQty / planQty;
                }

                // Defect types (Columns L to V)
                double funcNG = SafeGetDouble(row.Cell(12));
                double audioNG = SafeGetDouble(row.Cell(13));
                double scratchNG = SafeGetDouble(row.Cell(14));
                double edgeChipNG = SafeGetDouble(row.Cell(15));
                double wireNG = SafeGetDouble(row.Cell(16));
                double pcbaNG = SafeGetDouble(row.Cell(17));
                double thdNG = SafeGetDouble(row.Cell(18));
                double speakerNG = SafeGetDouble(row.Cell(19));
                double coverNG = SafeGetDouble(row.Cell(20));
                double nomaliNG = SafeGetDouble(row.Cell(21));
                double brokenWireNG = SafeGetDouble(row.Cell(22));

                double totalNG = SafeGetDouble(row.Cell(23));
                double calculatedNG = funcNG + audioNG + scratchNG + edgeChipNG + wireNG + pcbaNG + thdNG + speakerNG + coverNG + nomaliNG + brokenWireNG;
                if (totalNG == 0 && calculatedNG > 0)
                {
                    totalNG = calculatedNG;
                }

                double ngRate = SafeGetDouble(row.Cell(24));
                if (ngRate == 0 && actualQty > 0)
                {
                    ngRate = totalNG / actualQty;
                }

                double uph = SafeGetDouble(row.Cell(25));
                if (uph == 0 && workingHours > 0)
                {
                    uph = actualQty / workingHours;
                }

                double downtimeMin = SafeGetDouble(row.Cell(26));
                string downtimeReason = row.Cell(27).GetString()?.Trim() ?? string.Empty;
                string notes = row.Cell(28).GetString()?.Trim() ?? string.Empty;

                // 1. ProductionRecord
                var prodRecord = new ProductionRecord
                {
                    Date = recordDate.Date,
                    ProductCode = productCode,
                    ProductNameVi = GetVietnameseProductName(productCode),
                    Shift = "Ca Ngày",
                    PlannedQuantity = planQty,
                    ActualQuantity = actualQty,
                    AchievementRate = achievementRate,
                    StandardWorkingTime = standardTime,
                    WorkingHours = workingHours,
                    Efficiency = efficiency,
                    UPH = uph,
                    Status = actualQty > 0 ? "Completed" : "Scheduled",
                    Notes = string.IsNullOrWhiteSpace(notes) ? null : notes
                };
                result.ProductionRecords.Add(prodRecord);

                // 2. ManpowerRecord
                if (plannedManpower > 0 || actualManpower > 0)
                {
                    var manRecord = new ManpowerRecord
                    {
                        Date = recordDate.Date,
                        ProductCode = productCode,
                        PlannedManpower = plannedManpower,
                        ActualManpower = actualManpower,
                        MissingManpower = missingManpower,
                        MissingRate = plannedManpower > 0 ? (missingManpower / plannedManpower) : 0
                    };
                    result.ManpowerRecords.Add(manRecord);
                }

                // 3. QualityRecord
                var qualityRecord = new QualityRecord
                {
                    Date = recordDate.Date,
                    ProductCode = productCode,
                    FunctionalNG = funcNG,
                    AudioNG = audioNG,
                    ScratchNG = scratchNG,
                    EdgeChipNG = edgeChipNG,
                    WireNG = wireNG,
                    PCBANG = pcbaNG,
                    THDNG = thdNG,
                    SpeakerNG = speakerNG,
                    CoverNG = coverNG,
                    NomaliNG = nomaliNG,
                    BrokenWireNG = brokenWireNG,
                    TotalNG = totalNG,
                    NGRatio = ngRate
                };
                result.QualityRecords.Add(qualityRecord);

                // 4. DowntimeRecord
                if (downtimeMin > 0 || !string.IsNullOrWhiteSpace(downtimeReason))
                {
                    var dtRecord = new DowntimeRecord
                    {
                        Date = recordDate.Date,
                        ProductCode = productCode,
                        DowntimeMinutes = downtimeMin,
                        DowntimeReason = string.IsNullOrWhiteSpace(downtimeReason) ? "Dừng điều chỉnh máy" : downtimeReason,
                        ImpactDepartment = "Kỹ thuật / Thiết bị"
                    };
                    result.DowntimeRecords.Add(dtRecord);
                }

                result.TotalProcessedRows++;
            }

            return result;
        }

        public List<InventoryAuditRecord> ParseInventoryExcel(Stream fileStream)
        {
            var auditRecords = new List<InventoryAuditRecord>();

            using var workbook = new XLWorkbook(fileStream);
            foreach (var worksheet in workbook.Worksheets)
            {
                string sheetName = worksheet.Name.Trim();
                var firstRow = worksheet.FirstRowUsed();
                if (firstRow == null) continue;

                // 1. Check if this worksheet is a tabular export/table with column headers in row 1
                var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                foreach (var cell in firstRow.CellsUsed())
                {
                    string h = cell.GetString()?.Trim().ToLowerInvariant() ?? "";
                    if (!string.IsNullOrEmpty(h) && !headerMap.ContainsKey(h))
                    {
                        headerMap[h] = cell.Address.ColumnNumber;
                    }
                }

                int colMat = GetColIndex(headerMap, "materialcode", "mã liệu", "mã vật tư", "料号", "material");
                if (colMat > 0)
                {
                    // Tabular mode: Map headers and parse row-by-row
                    int colStage = GetColIndex(headerMap, "stage", "công đoạn", "xưởng");
                    int colSection = GetColIndex(headerMap, "section", "phân khu", "vị trí");
                    int colUsage = GetColIndex(headerMap, "usageperunit", "lượng dùng", "usage", "định mức");
                    int colAudit = GetColIndex(headerMap, "auditrequired", "cần kiểm", "cần đối soát", "audit", "应盘");
                    int colWarehouse = GetColIndex(headerMap, "rawmaterialwarehouse", "kho", "kho nguyên liệu", "kho nvl");
                    int colLine = GetColIndex(headerMap, "rawmaterialline", "ngoài chuyền", "line", "chuyền");
                    int colSemi1 = GetColIndex(headerMap, "semifinishedgoods", "bán thành phẩm", "wip", "đã lắp mic", "bán thành phẩm 1");
                    int colSemi2 = GetColIndex(headerMap, "semifinishedgoods2", "bán thành phẩm 2", "chờ nhập kho");
                    int colRepair = GetColIndex(headerMap, "repairroom", "phòng sửa", "phòng sửa hàng", "sửa chữa");
                    int colFa = GetColIndex(headerMap, "failureanalysisfa", "fa", "phân tích lỗi", "d6 fa");
                    int colFinished = GetColIndex(headerMap, "finishedgoods", "thành phẩm", "hoàn thiện");
                    int colDiscrepancy = GetColIndex(headerMap, "discrepancy", "chênh lệch", "lệch kho", "diff");
                    int colNG = GetColIndex(headerMap, "ngquantity", "ng", "phế phẩm", "lỗi");

                    var rows = worksheet.RowsUsed().Skip(1);
                    foreach (var row in rows)
                    {
                        string matCode = row.Cell(colMat).GetString()?.Trim() ?? "";
                        if (string.IsNullOrWhiteSpace(matCode) || matCode.Length < 3 || matCode.Equals("materialCode", StringComparison.OrdinalIgnoreCase))
                            continue;

                        string stageVal = colStage > 0 ? (row.Cell(colStage).GetString()?.Trim() ?? sheetName) : sheetName;
                        if (string.IsNullOrWhiteSpace(stageVal) || stageVal.Equals("InventoryAudit", StringComparison.OrdinalIgnoreCase))
                        {
                            stageVal = "LẮP RÁP D6";
                        }

                        string sectionVal = colSection > 0 ? (row.Cell(colSection).GetString()?.Trim() ?? stageVal) : stageVal;

                        var rec = new InventoryAuditRecord
                        {
                            Stage = stageVal,
                            Section = sectionVal,
                            MaterialCode = matCode,
                            UsagePerUnit = colUsage > 0 ? SafeGetDouble(row.Cell(colUsage)) : 0,
                            AuditRequired = colAudit > 0 ? SafeGetDouble(row.Cell(colAudit)) : 0,
                            RawMaterialWarehouse = colWarehouse > 0 ? SafeGetDouble(row.Cell(colWarehouse)) : 0,
                            RawMaterialLine = colLine > 0 ? SafeGetDouble(row.Cell(colLine)) : 0,
                            SemiFinishedGoods = colSemi1 > 0 ? SafeGetDouble(row.Cell(colSemi1)) : 0,
                            SemiFinishedGoods2 = colSemi2 > 0 ? SafeGetDouble(row.Cell(colSemi2)) : 0,
                            RepairRoom = colRepair > 0 ? SafeGetDouble(row.Cell(colRepair)) : 0,
                            FailureAnalysisFa = colFa > 0 ? SafeGetDouble(row.Cell(colFa)) : 0,
                            FinishedGoods = colFinished > 0 ? SafeGetDouble(row.Cell(colFinished)) : 0,
                            Discrepancy = colDiscrepancy > 0 ? SafeGetDouble(row.Cell(colDiscrepancy)) : 0,
                            NGQuantity = colNG > 0 ? SafeGetDouble(row.Cell(colNG)) : 0
                        };

                        auditRecords.Add(rec);
                    }
                    continue;
                }

                // 2. Factory layout parsing for multi-sheet layout
                string currentSection = sheetName;
                var factoryRows = worksheet.RowsUsed();

                foreach (var row in factoryRows)
                {
                    string col1 = row.Cell(1).GetString()?.Trim() ?? string.Empty;

                    // 1. Detect section title headers
                    if (!string.IsNullOrEmpty(col1) && (
                        col1.Contains("SPK") || col1.Contains("MIC") || 
                        col1.Contains("头戴") || col1.Contains("先红花") || 
                        col1.Contains("组装") || col1.Contains("包装") || 
                        col1.Contains("ĐAI ĐẦU") || col1.Contains("DÂY") || 
                        col1.Contains("LẮP RÁP") || col1.Contains("ĐÓNG GÓI")))
                    {
                        currentSection = col1.Replace("\r", " ").Replace("\n", " ").Trim();
                        continue;
                    }

                    // 2. Skip table headers and non-item rows
                    if (string.IsNullOrWhiteSpace(col1) || 
                        col1.Contains("料号") || col1.Contains("Mã liệu") || 
                        col1.Contains("CÔNG LỆNH") || col1.Contains("CẦN KIỂM") || 
                        col1.Contains("NHẬP KHO") || col1.Length < 3)
                    {
                        continue;
                    }

                    // 3. Parse fields based on worksheet layout
                    var rec = new InventoryAuditRecord
                    {
                        Stage = sheetName,
                        Section = currentSection,
                        MaterialCode = col1
                    };

                    if (sheetName.Contains("ĐÓNG GÓI") || sheetName.Contains("DONG GOI") || sheetName.Contains("包装"))
                    {
                        rec.UsagePerUnit = 0;
                        rec.AuditRequired = SafeGetDouble(row.Cell(2));
                        rec.RawMaterialWarehouse = SafeGetDouble(row.Cell(3));
                        rec.RawMaterialLine = SafeGetDouble(row.Cell(4));
                        rec.FinishedGoods = SafeGetDouble(row.Cell(5));
                        rec.Discrepancy = SafeGetDouble(row.Cell(6));
                        rec.SemiFinishedGoods = 0;
                        rec.SemiFinishedGoods2 = 0;
                        rec.RepairRoom = 0;
                        rec.FailureAnalysisFa = 0;
                        rec.NGQuantity = 0;
                    }
                    else if (sheetName.Contains("LẮP RÁP") || sheetName.Contains("LAP RAP") || sheetName.Contains("组装"))
                    {
                        rec.UsagePerUnit = SafeGetDouble(row.Cell(2));
                        rec.AuditRequired = SafeGetDouble(row.Cell(3));
                        rec.RawMaterialWarehouse = SafeGetDouble(row.Cell(4));
                        rec.RawMaterialLine = SafeGetDouble(row.Cell(5));
                        rec.SemiFinishedGoods = SafeGetDouble(row.Cell(6));
                        rec.SemiFinishedGoods2 = SafeGetDouble(row.Cell(7));
                        rec.RepairRoom = SafeGetDouble(row.Cell(8));
                        rec.FailureAnalysisFa = SafeGetDouble(row.Cell(9));
                        rec.FinishedGoods = 0;
                        rec.Discrepancy = SafeGetDouble(row.Cell(10));
                        rec.NGQuantity = SafeGetDouble(row.Cell(11));
                    }
                    else
                    {
                        rec.UsagePerUnit = SafeGetDouble(row.Cell(2));
                        rec.AuditRequired = SafeGetDouble(row.Cell(3));
                        rec.RawMaterialWarehouse = SafeGetDouble(row.Cell(4));
                        rec.RawMaterialLine = SafeGetDouble(row.Cell(5));
                        rec.SemiFinishedGoods = SafeGetDouble(row.Cell(6));
                        rec.SemiFinishedGoods2 = SafeGetDouble(row.Cell(7));
                        rec.RepairRoom = 0;
                        rec.FailureAnalysisFa = 0;
                        rec.FinishedGoods = SafeGetDouble(row.Cell(8));
                        rec.Discrepancy = SafeGetDouble(row.Cell(9));
                        rec.NGQuantity = SafeGetDouble(row.Cell(10));
                    }

                    auditRecords.Add(rec);
                }
            }

            return auditRecords;
        }

        private static int GetColIndex(Dictionary<string, int> headerMap, params string[] names)
        {
            foreach (var n in names)
            {
                if (headerMap.TryGetValue(n, out int idx)) return idx;
            }
            return -1;
        }

        private static double SafeGetDouble(IXLCell cell)
        {
            if (cell == null || cell.IsEmpty()) return 0;
            try
            {
                if (cell.TryGetValue<double>(out double outVal)) return outVal;
                if (cell.DataType == XLDataType.Number) return cell.GetDouble();
                if (cell.DataType == XLDataType.Text)
                {
                    string str = cell.GetString()?.Trim() ?? "";
                    if (string.IsNullOrWhiteSpace(str) || str.StartsWith("#")) return 0;
                    if (double.TryParse(str, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double val))
                    {
                        return val;
                    }
                    if (double.TryParse(str, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.CurrentCulture, out double valCurrent))
                    {
                        return valCurrent;
                    }
                }
                var valObj = cell.Value;
                if (valObj.IsNumber) return valObj.GetNumber();
                if (double.TryParse(valObj.ToString(), out double parsedObj)) return parsedObj;
            }
            catch
            {
                return 0;
            }
            return 0;
        }
    }
}
