using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using ProductionDashboard.Api.Data;
using ProductionDashboard.Api.Models;

namespace ProductionDashboard.Api.Services
{
    public class DashboardService
    {
        private readonly AppDbContext _context;

        public DashboardService(AppDbContext context)
        {
            _context = context;
        }

        public (DateTime fromDate, DateTime toDate) ResolveDateRange(DashboardFilterRequest filter)
        {
            DateTime maxDateInDb = _context.ProductionRecords.Any()
                ? _context.ProductionRecords.Max(p => p.Date).Date
                : new DateTime(2026, 10, 8);

            if (!string.IsNullOrWhiteSpace(filter.Preset))
            {
                switch (filter.Preset.ToLower())
                {
                    case "today":
                        return (maxDateInDb, maxDateInDb);
                    case "yesterday":
                        return (maxDateInDb.AddDays(-1), maxDateInDb.AddDays(-1));
                    case "this_week":
                        int diff = (7 + (maxDateInDb.DayOfWeek - DayOfWeek.Monday)) % 7;
                        return (maxDateInDb.AddDays(-diff), maxDateInDb);
                    case "this_month":
                        return (new DateTime(maxDateInDb.Year, maxDateInDb.Month, 1), maxDateInDb);
                    case "last_7_days":
                        return (maxDateInDb.AddDays(-6), maxDateInDb);
                    case "last_30_days":
                        return (maxDateInDb.AddDays(-29), maxDateInDb);
                    case "all":
                        DateTime minDate = _context.ProductionRecords.Any() ? _context.ProductionRecords.Min(p => p.Date).Date : maxDateInDb.AddDays(-30);
                        return (minDate, maxDateInDb);
                }
            }

            DateTime from = filter.DateFrom?.Date ?? maxDateInDb.AddDays(-6);
            DateTime to = filter.DateTo?.Date ?? maxDateInDb;
            if (from > to)
            {
                (from, to) = (to, from);
            }
            return (from, to);
        }

        public FullDashboardResponse GetDashboardData(DashboardFilterRequest filter)
        {
            var (fromDate, toDate) = ResolveDateRange(filter);

            // Filter base production query
            var prodQuery = _context.ProductionRecords
                .Where(p => p.Date >= fromDate && p.Date <= toDate);

            if (!string.IsNullOrWhiteSpace(filter.Product) && !filter.Product.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                prodQuery = prodQuery.Where(p => p.ProductCode == filter.Product || p.ProductNameVi == filter.Product);
            }
            if (!string.IsNullOrWhiteSpace(filter.Shift) && !filter.Shift.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                prodQuery = prodQuery.Where(p => p.Shift == filter.Shift);
            }
            if (!string.IsNullOrWhiteSpace(filter.Status) && !filter.Status.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                prodQuery = prodQuery.Where(p => p.Status == filter.Status);
            }

            var prodRecords = prodQuery.OrderBy(p => p.Date).ToList();

            // Quality query
            var qualQuery = _context.QualityRecords
                .Where(q => q.Date >= fromDate && q.Date <= toDate);
            if (!string.IsNullOrWhiteSpace(filter.Product) && !filter.Product.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                qualQuery = qualQuery.Where(q => q.ProductCode == filter.Product);
            }
            var qualRecords = qualQuery.ToList();

            // Manpower query
            var manQuery = _context.ManpowerRecords
                .Where(m => m.Date >= fromDate && m.Date <= toDate);
            if (!string.IsNullOrWhiteSpace(filter.Product) && !filter.Product.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                manQuery = manQuery.Where(m => m.ProductCode == filter.Product);
            }
            var manRecords = manQuery.ToList();

            // Downtime query
            var dtQuery = _context.DowntimeRecords
                .Where(d => d.Date >= fromDate && d.Date <= toDate);
            if (!string.IsNullOrWhiteSpace(filter.Product) && !filter.Product.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                dtQuery = dtQuery.Where(d => d.ProductCode == filter.Product);
            }
            var dtRecords = dtQuery.ToList();

            // Calculate previous period for Delta comparison
            int daySpan = Math.Max(1, (int)(toDate - fromDate).TotalDays + 1);
            DateTime prevFrom = fromDate.AddDays(-daySpan);
            DateTime prevTo = fromDate.AddDays(-1);

            var prevProdQuery = _context.ProductionRecords
                .Where(p => p.Date >= prevFrom && p.Date <= prevTo);
            if (!string.IsNullOrWhiteSpace(filter.Product) && !filter.Product.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                prevProdQuery = prevProdQuery.Where(p => p.ProductCode == filter.Product);
            }
            var prevProdRecords = prevProdQuery.ToList();

            var prevQualQuery = _context.QualityRecords
                .Where(q => q.Date >= prevFrom && q.Date <= prevTo);
            if (!string.IsNullOrWhiteSpace(filter.Product) && !filter.Product.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                prevQualQuery = prevQualQuery.Where(q => q.ProductCode == filter.Product);
            }
            var prevQualRecords = prevQualQuery.ToList();

            var prevDtQuery = _context.DowntimeRecords
                .Where(d => d.Date >= prevFrom && d.Date <= prevTo);
            if (!string.IsNullOrWhiteSpace(filter.Product) && !filter.Product.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                prevDtQuery = prevDtQuery.Where(d => d.ProductCode == filter.Product);
            }
            var prevDtRecords = prevDtQuery.ToList();

            // 1. KPI Summary
            var kpi = new KpiSummaryDto();
            kpi.TotalPlan = prodRecords.Sum(p => p.PlannedQuantity);
            kpi.TotalActual = prodRecords.Sum(p => p.ActualQuantity);
            kpi.AchievementRate = kpi.TotalPlan > 0 ? Math.Round((kpi.TotalActual / kpi.TotalPlan) * 100, 2) : 0;
            kpi.WorkingHours = Math.Round(prodRecords.Sum(p => p.WorkingHours), 1);
            kpi.AverageUPH = kpi.WorkingHours > 0 ? Math.Round(kpi.TotalActual / kpi.WorkingHours, 1) : 0;
            kpi.TotalManpower = manRecords.Sum(m => m.PlannedManpower);
            kpi.TotalMissingManpower = manRecords.Sum(m => m.MissingManpower);
            kpi.ManpowerShortageRate = kpi.TotalManpower > 0 ? Math.Round((kpi.TotalMissingManpower / kpi.TotalManpower) * 100, 2) : 0;
            kpi.TotalNG = qualRecords.Sum(q => q.TotalNG);
            kpi.NGRate = kpi.TotalActual > 0 ? Math.Round((kpi.TotalNG / kpi.TotalActual) * 100, 2) : 0;
            kpi.TotalDowntimeMinutes = dtRecords.Sum(d => d.DowntimeMinutes);

            double totalStandardSec = prodRecords.Sum(p => p.ActualQuantity * p.StandardWorkingTime);
            kpi.Efficiency = kpi.WorkingHours > 0 ? Math.Round((totalStandardSec / (3600.0 * kpi.WorkingHours)) * 100, 2) : 0;

            // Delta calculations
            double prevPlan = prevProdRecords.Sum(p => p.PlannedQuantity);
            double prevActual = prevProdRecords.Sum(p => p.ActualQuantity);
            double prevAchieve = prevPlan > 0 ? (prevActual / prevPlan) * 100 : 0;
            double prevHours = prevProdRecords.Sum(p => p.WorkingHours);
            double prevUph = prevHours > 0 ? (prevActual / prevHours) : 0;
            double prevNG = prevQualRecords.Sum(q => q.TotalNG);
            double prevDowntime = prevDtRecords.Sum(d => d.DowntimeMinutes);

            kpi.PlanDeltaPercent = prevPlan > 0 ? Math.Round(((kpi.TotalPlan - prevPlan) / prevPlan) * 100, 1) : 0;
            kpi.ActualDeltaPercent = prevActual > 0 ? Math.Round(((kpi.TotalActual - prevActual) / prevActual) * 100, 1) : 0;
            kpi.AchievementDeltaPercent = prevAchieve > 0 ? Math.Round(kpi.AchievementRate - prevAchieve, 1) : 0;
            kpi.UphDeltaPercent = prevUph > 0 ? Math.Round(((kpi.AverageUPH - prevUph) / prevUph) * 100, 1) : 0;
            kpi.NgDeltaPercent = prevNG > 0 ? Math.Round(((kpi.TotalNG - prevNG) / prevNG) * 100, 1) : 0;
            kpi.DowntimeDeltaPercent = prevDowntime > 0 ? Math.Round(((kpi.TotalDowntimeMinutes - prevDowntime) / prevDowntime) * 100, 1) : 0;

            // 2. Plan vs Actual Trend (Daily)
            var planTrend = prodRecords
                .GroupBy(p => p.Date.ToString("yyyy-MM-dd"))
                .OrderBy(g => g.Key)
                .Select(g =>
                {
                    double pQty = g.Sum(x => x.PlannedQuantity);
                    double aQty = g.Sum(x => x.ActualQuantity);
                    return new PlanVsActualTrendItemDto
                    {
                        Date = g.Key,
                        Planned = pQty,
                        Actual = aQty,
                        Gap = Math.Round(aQty - pQty, 1),
                        AchievementRate = pQty > 0 ? Math.Round((aQty / pQty) * 100, 1) : 0
                    };
                }).ToList();

            // 3. Production by Product
            var prodByProduct = prodRecords
                .GroupBy(p => p.ProductCode)
                .Select(g =>
                {
                    string pCode = g.Key;
                    string pNameVi = g.First().ProductNameVi;
                    double pPlan = g.Sum(x => x.PlannedQuantity);
                    double pAct = g.Sum(x => x.ActualQuantity);
                    double pHours = g.Sum(x => x.WorkingHours);
                    double pStdSec = g.Sum(x => x.ActualQuantity * x.StandardWorkingTime);
                    double pNG = qualRecords.Where(q => q.ProductCode == pCode).Sum(q => q.TotalNG);
                    double pDT = dtRecords.Where(d => d.ProductCode == pCode).Sum(d => d.DowntimeMinutes);

                    return new ProductionByProductDto
                    {
                        Product = pCode,
                        ProductNameVi = pNameVi,
                        Planned = pPlan,
                        Actual = pAct,
                        Gap = Math.Round(pAct - pPlan, 1),
                        AchievementRate = pPlan > 0 ? Math.Round((pAct / pPlan) * 100, 1) : 0,
                        UPH = pHours > 0 ? Math.Round(pAct / pHours, 1) : 0,
                        Efficiency = pHours > 0 ? Math.Round((pStdSec / (3600.0 * pHours)) * 100, 1) : 0,
                        TotalNG = pNG,
                        NGRate = pAct > 0 ? Math.Round((pNG / pAct) * 100, 2) : 0,
                        DowntimeMinutes = pDT
                    };
                })
                .OrderByDescending(x => x.Actual)
                .ToList();

            // 4. Performance Trend (Efficiency, UPH, Working Hours)
            var perfTrend = prodRecords
                .GroupBy(p => p.Date.ToString("yyyy-MM-dd"))
                .OrderBy(g => g.Key)
                .Select(g =>
                {
                    double act = g.Sum(x => x.ActualQuantity);
                    double hrs = g.Sum(x => x.WorkingHours);
                    double stdSec = g.Sum(x => x.ActualQuantity * x.StandardWorkingTime);
                    double avgStd = g.Average(x => x.StandardWorkingTime);

                    return new PerformanceTrendDto
                    {
                        Date = g.Key,
                        Efficiency = hrs > 0 ? Math.Round((stdSec / (3600.0 * hrs)) * 100, 1) : 0,
                        UPH = hrs > 0 ? Math.Round(act / hrs, 1) : 0,
                        WorkingHours = Math.Round(hrs, 1),
                        StandardWorkingTime = Math.Round(avgStd, 1)
                    };
                }).ToList();

            // 5. Manpower Analysis
            var userConfig = _context.UserLayoutConfigs.FirstOrDefault(u => u.UserId == "default_user");
            double threshold = userConfig?.ManpowerShortageThreshold ?? 0.10;

            var manpowerAnalysis = manRecords
                .GroupBy(m => m.Date.ToString("yyyy-MM-dd"))
                .OrderBy(g => g.Key)
                .Select(g =>
                {
                    double pMan = g.Sum(x => x.PlannedManpower);
                    double aMan = g.Sum(x => x.ActualManpower);
                    double mMan = g.Sum(x => x.MissingManpower);
                    double sRate = pMan > 0 ? (mMan / pMan) : 0;

                    return new ManpowerAnalysisDto
                    {
                        Date = g.Key,
                        PlannedManpower = pMan,
                        ActualManpower = aMan,
                        MissingManpower = mMan,
                        ShortageRate = Math.Round(sRate * 100, 1),
                        IsExceedingThreshold = sRate > threshold
                    };
                }).ToList();

            // 6. Quality Pareto
            var qualityPareto = CalculatePareto(qualRecords, prodRecords);

            // 7. Defect Heatmap (Product x Defect Type)
            var defectHeatmap = BuildHeatmap(qualRecords, prodRecords);

            // 8. Downtime Analysis
            var downtimeAnalysis = BuildDowntimeAnalysis(dtRecords);

            // 9. UPH Analysis
            var uphAnalysis = BuildUphAnalysis(prodRecords);

            // 10. Product Performance Matrix
            var matrix = BuildProductMatrix(prodRecords, qualRecords, dtRecords);

            // Metadata
            var defaultProducts = new List<string> { "喇叭", "麦克风", "控制盒", "头戴", "组装", "包装" };
            var dbProducts = _context.ProductionRecords
                .Select(p => p.ProductCode)
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Distinct()
                .ToList();
            var availableProducts = defaultProducts
                .Union(dbProducts)
                .OrderBy(p => p)
                .ToList();

            var defaultShifts = new List<string> { "Ca Ngày", "Ca Đêm" };
            var dbShifts = _context.ProductionRecords
                .Select(p => p.Shift)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct()
                .ToList();
            var availableShifts = defaultShifts
                .Union(dbShifts)
                .OrderBy(s => s)
                .ToList();

            string minDateStr = _context.ProductionRecords.Any() ? _context.ProductionRecords.Min(p => p.Date).ToString("yyyy-MM-dd") : fromDate.ToString("yyyy-MM-dd");
            string maxDateStr = _context.ProductionRecords.Any() ? _context.ProductionRecords.Max(p => p.Date).ToString("yyyy-MM-dd") : toDate.ToString("yyyy-MM-dd");

            return new FullDashboardResponse
            {
                Kpis = kpi,
                PlanVsActualTrend = planTrend,
                ProductionByProduct = prodByProduct,
                PerformanceTrend = perfTrend,
                ManpowerAnalysis = manpowerAnalysis,
                QualityPareto = qualityPareto,
                DefectHeatmap = defectHeatmap,
                DowntimeAnalysis = downtimeAnalysis,
                UphAnalysis = uphAnalysis,
                ProductMatrix = matrix,
                AvailableProducts = availableProducts,
                AvailableShifts = availableShifts,
                MinDate = minDateStr,
                MaxDate = maxDateStr
            };
        }

        private QualityParetoDto CalculatePareto(List<QualityRecord> qualRecords, List<ProductionRecord> prodRecords)
        {
            var defectTotals = new Dictionary<string, (string NameVi, string NameZh, double Qty)>
            {
                { "Scratch", ("XƯỚC", "划伤", qualRecords.Sum(q => q.ScratchNG)) },
                { "Audio", ("ÂM THANH", "音频测试", qualRecords.Sum(q => q.AudioNG)) },
                { "EdgeChip", ("MẺ", "崩边", qualRecords.Sum(q => q.EdgeChipNG)) },
                { "Functional", ("CÔNG NĂNG", "功能", qualRecords.Sum(q => q.FunctionalNG)) },
                { "Wire", ("DÂY", "想材 USB", qualRecords.Sum(q => q.WireNG)) },
                { "PCBA", ("PCBA", "PCBA", qualRecords.Sum(q => q.PCBANG)) },
                { "THD", ("THD", "THD", qualRecords.Sum(q => q.THDNG)) },
                { "Speaker", ("LỎM LOA", "喇叭凹陷", qualRecords.Sum(q => q.SpeakerNG)) },
                { "Cover", ("HỞ NẮP", "盖子缝隙", qualRecords.Sum(q => q.CoverNG)) },
                { "Nomali", ("NOMALI", "异常", qualRecords.Sum(q => q.NomaliNG)) },
                { "BrokenWire", ("ĐỨT DÂY", "断线", qualRecords.Sum(q => q.BrokenWireNG)) }
            };

            double totalDefect = defectTotals.Values.Sum(v => v.Qty);
            double totalActual = prodRecords.Sum(p => p.ActualQuantity);

            var sortedDefects = defectTotals
                .OrderByDescending(kv => kv.Value.Qty)
                .ToList();

            double cumulative = 0;
            var defectItems = new List<ParetoDefectItemDto>();
            foreach (var kv in sortedDefects)
            {
                double qty = kv.Value.Qty;
                cumulative += qty;
                double pct = totalDefect > 0 ? (qty / totalDefect) * 100 : 0;
                double cumPct = totalDefect > 0 ? (cumulative / totalDefect) * 100 : 0;

                defectItems.Add(new ParetoDefectItemDto
                {
                    DefectKey = kv.Key,
                    DefectNameVi = kv.Value.NameVi,
                    DefectNameZh = kv.Value.NameZh,
                    Quantity = qty,
                    Percentage = Math.Round(pct, 2),
                    CumulativePercentage = Math.Round(cumPct, 2)
                });
            }

            var worstProductGroup = qualRecords
                .GroupBy(q => q.ProductCode)
                .OrderByDescending(g => g.Sum(x => x.TotalNG))
                .FirstOrDefault();

            return new QualityParetoDto
            {
                TotalNG = totalDefect,
                OverallNGRate = totalActual > 0 ? Math.Round((totalDefect / totalActual) * 100, 2) : 0,
                TopDefect = defectItems.FirstOrDefault()?.DefectNameVi ?? "None",
                WorstProduct = worstProductGroup?.Key ?? "None",
                Defects = defectItems
            };
        }

        private DefectHeatmapDto BuildHeatmap(List<QualityRecord> qualRecords, List<ProductionRecord> prodRecords)
        {
            var defectTypes = new List<(string Key, string NameVi)>
            {
                ("Scratch", "XƯỚC / 划伤"),
                ("Audio", "ÂM THANH / 音频测试"),
                ("EdgeChip", "MẺ / 崩边"),
                ("Functional", "CÔNG NĂNG / 功能"),
                ("Wire", "DÂY / 想材 USB"),
                ("PCBA", "PCBA"),
                ("THD", "THD"),
                ("Speaker", "LỎM LOA"),
                ("Cover", "HỞ NẮP"),
                ("Nomali", "NOMALI"),
                ("BrokenWire", "ĐỨT DÂY")
            };

            var products = qualRecords.Select(q => q.ProductCode).Distinct().OrderBy(p => p).ToList();
            if (products.Count == 0)
            {
                products = prodRecords.Select(p => p.ProductCode).Distinct().OrderBy(p => p).ToList();
            }

            var cells = new List<DefectHeatmapCellDto>();
            double maxQty = 1;

            foreach (var p in products)
            {
                var pQual = qualRecords.Where(q => q.ProductCode == p).ToList();
                double pActual = prodRecords.Where(x => x.ProductCode == p).Sum(x => x.ActualQuantity);

                foreach (var d in defectTypes)
                {
                    double qty = d.Key switch
                    {
                        "Scratch" => pQual.Sum(q => q.ScratchNG),
                        "Audio" => pQual.Sum(q => q.AudioNG),
                        "EdgeChip" => pQual.Sum(q => q.EdgeChipNG),
                        "Functional" => pQual.Sum(q => q.FunctionalNG),
                        "Wire" => pQual.Sum(q => q.WireNG),
                        "PCBA" => pQual.Sum(q => q.PCBANG),
                        "THD" => pQual.Sum(q => q.THDNG),
                        "Speaker" => pQual.Sum(q => q.SpeakerNG),
                        "Cover" => pQual.Sum(q => q.CoverNG),
                        "Nomali" => pQual.Sum(q => q.NomaliNG),
                        "BrokenWire" => pQual.Sum(q => q.BrokenWireNG),
                        _ => 0
                    };

                    if (qty > maxQty) maxQty = qty;

                    double rate = pActual > 0 ? (qty / pActual) * 100 : 0;
                    cells.Add(new DefectHeatmapCellDto
                    {
                        Product = p,
                        DefectKey = d.Key,
                        DefectNameVi = d.NameVi,
                        Quantity = qty,
                        DefectRate = Math.Round(rate, 2),
                        Intensity = 0 // will normalize below
                    });
                }
            }

            foreach (var c in cells)
            {
                c.Intensity = Math.Round(c.Quantity / maxQty, 2);
            }

            return new DefectHeatmapDto
            {
                Products = products,
                DefectTypes = defectTypes.Select(d => d.NameVi).ToList(),
                Cells = cells
            };
        }

        private DowntimeAnalysisDto BuildDowntimeAnalysis(List<DowntimeRecord> dtRecords)
        {
            double totalDT = dtRecords.Sum(d => d.DowntimeMinutes);
            double avgDT = dtRecords.Count > 0 ? Math.Round(dtRecords.Average(d => d.DowntimeMinutes), 1) : 0;
            double longestDT = dtRecords.Count > 0 ? dtRecords.Max(d => d.DowntimeMinutes) : 0;

            var reasonGroups = dtRecords
                .GroupBy(d => d.DowntimeReason)
                .Select(g => new
                {
                    Reason = g.Key,
                    Minutes = g.Sum(x => x.DowntimeMinutes),
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Minutes)
                .ToList();

            double cumulative = 0;
            var reasonDtos = new List<DowntimeReasonItemDto>();
            foreach (var r in reasonGroups)
            {
                cumulative += r.Minutes;
                double pct = totalDT > 0 ? (r.Minutes / totalDT) * 100 : 0;
                double cumPct = totalDT > 0 ? (cumulative / totalDT) * 100 : 0;

                reasonDtos.Add(new DowntimeReasonItemDto
                {
                    Reason = r.Reason,
                    Minutes = r.Minutes,
                    Percentage = Math.Round(pct, 1),
                    CumulativePercentage = Math.Round(cumPct, 1),
                    Occurrences = r.Count
                });
            }

            var dailyTrend = dtRecords
                .GroupBy(d => d.Date.ToString("yyyy-MM-dd"))
                .OrderBy(g => g.Key)
                .Select(g => new DowntimeTrendItemDto
                {
                    Date = g.Key,
                    Minutes = g.Sum(x => x.DowntimeMinutes),
                    IncidentCount = g.Count()
                }).ToList();

            return new DowntimeAnalysisDto
            {
                TotalDowntimeMinutes = totalDT,
                AverageDowntimeMinutes = avgDT,
                LongestDowntimeMinutes = longestDT,
                TopReason = reasonDtos.FirstOrDefault()?.Reason ?? "None",
                Reasons = reasonDtos,
                Trend = dailyTrend
            };
        }

        private UphAnalysisDto BuildUphAnalysis(List<ProductionRecord> prodRecords)
        {
            var byProduct = prodRecords
                .GroupBy(p => p.ProductCode)
                .Select(g =>
                {
                    double act = g.Sum(x => x.ActualQuantity);
                    double hrs = g.Sum(x => x.WorkingHours);
                    double uph = hrs > 0 ? Math.Round(act / hrs, 1) : 0;
                    return new UphProductItemDto
                    {
                        Product = g.Key,
                        UPH = uph,
                        TargetUPH = Math.Round(uph * 1.08, 1) // 8% stretch target
                    };
                })
                .OrderByDescending(x => x.UPH)
                .ToList();

            var dailyTrend = prodRecords
                .GroupBy(p => p.Date.ToString("yyyy-MM-dd"))
                .OrderBy(g => g.Key)
                .Select(g =>
                {
                    double act = g.Sum(x => x.ActualQuantity);
                    double hrs = g.Sum(x => x.WorkingHours);
                    return new UphTrendItemDto
                    {
                        Date = g.Key,
                        UPH = hrs > 0 ? Math.Round(act / hrs, 1) : 0
                    };
                }).ToList();

            double avgUph = byProduct.Count > 0 ? Math.Round(byProduct.Average(x => x.UPH), 1) : 0;
            double bestUph = byProduct.Count > 0 ? byProduct.Max(x => x.UPH) : 0;
            double lowestUph = byProduct.Count > 0 ? byProduct.Min(x => x.UPH) : 0;

            return new UphAnalysisDto
            {
                AverageUPH = avgUph,
                BestUPH = bestUph,
                LowestUPH = lowestUph,
                ByProduct = byProduct,
                Trend = dailyTrend
            };
        }

        private List<ProductMatrixRowDto> BuildProductMatrix(
            List<ProductionRecord> prodRecords,
            List<QualityRecord> qualRecords,
            List<DowntimeRecord> dtRecords)
        {
            var rows = new List<ProductMatrixRowDto>();

            foreach (var p in prodRecords.OrderByDescending(p => p.Date).ThenBy(p => p.ProductCode))
            {
                var qRec = qualRecords.FirstOrDefault(q => q.Date.Date == p.Date.Date && q.ProductCode == p.ProductCode);
                var dtList = dtRecords.Where(d => d.Date.Date == p.Date.Date && d.ProductCode == p.ProductCode).ToList();
                double totalDt = dtList.Sum(d => d.DowntimeMinutes);

                double totalNG = qRec?.TotalNG ?? 0;
                double ngRate = p.ActualQuantity > 0 ? (totalNG / p.ActualQuantity) * 100 : 0;

                rows.Add(new ProductMatrixRowDto
                {
                    Id = p.Id,
                    Date = p.Date.ToString("yyyy-MM-dd"),
                    Product = p.ProductCode,
                    ProductNameVi = p.ProductNameVi,
                    Plan = p.PlannedQuantity,
                    Actual = p.ActualQuantity,
                    Achievement = Math.Round(p.AchievementRate * 100, 1),
                    UPH = Math.Round(p.UPH, 1),
                    TotalNG = totalNG,
                    NGRate = Math.Round(ngRate, 2),
                    Downtime = totalDt,
                    Efficiency = Math.Round(p.Efficiency * 100, 1),
                    WorkingHours = p.WorkingHours,
                    Shift = p.Shift,
                    Status = p.Status,
                    Notes = p.Notes
                });
            }

            return rows;
        }

        public DrillDownDetailDto GetDrillDown(string type, string key)
        {
            var result = new DrillDownDetailDto
            {
                Type = type,
                Key = key
            };

            if (type.Equals("product", StringComparison.OrdinalIgnoreCase))
            {
                result.Title = $"Chi tiết sản phẩm: {key} ({ExcelParserService.GetVietnameseProductName(key)})";
                var records = _context.ProductionRecords.Where(p => p.ProductCode == key).OrderBy(p => p.Date).ToList();
                var quals = _context.QualityRecords.Where(q => q.ProductCode == key).ToList();
                var dts = _context.DowntimeRecords.Where(d => d.ProductCode == key).ToList();

                result.TotalProduction = records.Sum(p => p.ActualQuantity);
                result.TotalNG = quals.Sum(q => q.TotalNG);
                result.NGRate = result.TotalProduction > 0 ? Math.Round((result.TotalNG / result.TotalProduction) * 100, 2) : 0;
                result.TotalDowntime = dts.Sum(d => d.DowntimeMinutes);
                result.RelatedNotes = records.Where(r => !string.IsNullOrWhiteSpace(r.Notes)).Select(r => $"{r.Date:yyyy-MM-dd}: {r.Notes}").Distinct().ToList();

                result.Records = BuildProductMatrix(records, quals, dts);
                result.DefectBreakdown = CalculatePareto(quals, records).Defects;
                result.DowntimeBreakdown = BuildDowntimeAnalysis(dts).Reasons;
                result.Trend = records.GroupBy(r => r.Date.ToString("yyyy-MM-dd")).Select(g => new PlanVsActualTrendItemDto
                {
                    Date = g.Key,
                    Planned = g.Sum(x => x.PlannedQuantity),
                    Actual = g.Sum(x => x.ActualQuantity),
                    Gap = g.Sum(x => x.ActualQuantity) - g.Sum(x => x.PlannedQuantity),
                    AchievementRate = g.Sum(x => x.PlannedQuantity) > 0 ? (g.Sum(x => x.ActualQuantity) / g.Sum(x => x.PlannedQuantity)) * 100 : 0
                }).ToList();
            }
            else if (type.Equals("defect", StringComparison.OrdinalIgnoreCase))
            {
                result.Title = $"Chi tiết phân tích lỗi: {key}";
                var quals = _context.QualityRecords.ToList();
                var prods = _context.ProductionRecords.ToList();

                // Group defect by product
                var byProd = new List<ParetoDefectItemDto>();
                foreach (var g in quals.GroupBy(q => q.ProductCode))
                {
                    double dQty = key.ToLower() switch
                    {
                        "scratch" or "xước" or "划伤" => g.Sum(x => x.ScratchNG),
                        "audio" or "âm thanh" or "音频测试" => g.Sum(x => x.AudioNG),
                        "edgechip" or "mẻ" or "崩边" => g.Sum(x => x.EdgeChipNG),
                        "functional" or "công năng" or "功能" => g.Sum(x => x.FunctionalNG),
                        "wire" or "dây" => g.Sum(x => x.WireNG),
                        "pcba" => g.Sum(x => x.PCBANG),
                        "thd" => g.Sum(x => x.THDNG),
                        "speaker" or "lỏm loa" => g.Sum(x => x.SpeakerNG),
                        "cover" or "hở nắp" => g.Sum(x => x.CoverNG),
                        "nomali" => g.Sum(x => x.NomaliNG),
                        "brokenwire" or "đứt dây" => g.Sum(x => x.BrokenWireNG),
                        _ => g.Sum(x => x.ScratchNG)
                    };
                    byProd.Add(new ParetoDefectItemDto
                    {
                        DefectKey = g.Key,
                        DefectNameVi = g.Key,
                        Quantity = dQty
                    });
                }
                result.DefectBreakdown = byProd.OrderByDescending(x => x.Quantity).ToList();
                result.TotalNG = byProd.Sum(x => x.Quantity);
                result.TotalProduction = prods.Sum(p => p.ActualQuantity);
                result.NGRate = result.TotalProduction > 0 ? Math.Round((result.TotalNG / result.TotalProduction) * 100, 2) : 0;
            }
            else if (type.Equals("date", StringComparison.OrdinalIgnoreCase))
            {
                if (DateTime.TryParse(key, out var dt))
                {
                    result.Title = $"Chi tiết sản xuất ngày: {key}";
                    var prods = _context.ProductionRecords.Where(p => p.Date.Date == dt.Date).ToList();
                    var quals = _context.QualityRecords.Where(q => q.Date.Date == dt.Date).ToList();
                    var dts = _context.DowntimeRecords.Where(d => d.Date.Date == dt.Date).ToList();

                    result.Records = BuildProductMatrix(prods, quals, dts);
                    result.TotalProduction = prods.Sum(p => p.ActualQuantity);
                    result.TotalNG = quals.Sum(q => q.TotalNG);
                    result.NGRate = result.TotalProduction > 0 ? Math.Round((result.TotalNG / result.TotalProduction) * 100, 2) : 0;
                    result.TotalDowntime = dts.Sum(d => d.DowntimeMinutes);
                    result.DefectBreakdown = CalculatePareto(quals, prods).Defects;
                    result.DowntimeBreakdown = BuildDowntimeAnalysis(dts).Reasons;
                }
            }

            return result;
        }

        public EvidenceFor8DDto GenerateEvidence(string product, string? defectType, DateTime? fromDate, DateTime? toDate)
        {
            var (from, to) = ResolveDateRange(new DashboardFilterRequest { DateFrom = fromDate, DateTo = toDate });

            var prods = _context.ProductionRecords
                .Where(p => p.Date >= from && p.Date <= to && p.ProductCode == product)
                .ToList();

            var quals = _context.QualityRecords
                .Where(q => q.Date >= from && q.Date <= to && q.ProductCode == product)
                .ToList();

            var dts = _context.DowntimeRecords
                .Where(d => d.Date >= from && d.Date <= to && d.ProductCode == product)
                .ToList();

            double totalProd = prods.Sum(p => p.ActualQuantity);
            double totalNG = quals.Sum(q => q.TotalNG);
            double ngRate = totalProd > 0 ? Math.Round((totalNG / totalProd) * 100, 2) : 0;

            var pareto = CalculatePareto(quals, prods);
            string topDefect = pareto.Defects.FirstOrDefault()?.DefectNameVi ?? defectType ?? "Ngoại quan";

            return new EvidenceFor8DDto
            {
                Product = product,
                DefectType = defectType ?? topDefect,
                DateRange = $"{from:yyyy-MM-dd} ~ {to:yyyy-MM-dd}",
                ProductionQuantity = totalProd,
                NGQuantity = totalNG,
                NGRate = ngRate,
                TopDefect = topDefect,
                DowntimeMinutes = dts.Sum(d => d.DowntimeMinutes),
                SuggestedProblemStatement = $"Trong khoảng thời gian {from:dd/MM} đến {to:dd/MM}, sản phẩm {product} có tổng sản lượng {totalProd:N0} chiếc, phát sinh {totalNG:N0} sản phẩm NG (Tỷ lệ {ngRate:F2}%), trong đó lỗi {topDefect} chiếm tỷ trọng cao nhất ({pareto.Defects.FirstOrDefault()?.Percentage:F1}%).",
                RelatedDowntimeReasons = dts.Select(d => d.DowntimeReason).Distinct().ToList()
            };
        }
    }
}
