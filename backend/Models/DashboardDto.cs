using System;
using System.Collections.Generic;

namespace ProductionDashboard.Api.Models
{
    public class DashboardFilterRequest
    {
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string? Product { get; set; } // specific product or "all"
        public string? Shift { get; set; }
        public string? Status { get; set; }
        public string? Preset { get; set; } // "today", "yesterday", "this_week", "this_month", "last_7_days", "last_30_days", "all"
    }

    public class KpiSummaryDto
    {
        public double TotalPlan { get; set; }
        public double TotalActual { get; set; }
        public double AchievementRate { get; set; } // %
        public double AverageUPH { get; set; }
        public double TotalManpower { get; set; }
        public double TotalMissingManpower { get; set; }
        public double ManpowerShortageRate { get; set; } // %
        public double TotalNG { get; set; }
        public double NGRate { get; set; } // %
        public double TotalDowntimeMinutes { get; set; }
        public double Efficiency { get; set; } // %
        public double WorkingHours { get; set; }

        // Comparison with previous period (delta %)
        public double PlanDeltaPercent { get; set; }
        public double ActualDeltaPercent { get; set; }
        public double AchievementDeltaPercent { get; set; }
        public double UphDeltaPercent { get; set; }
        public double NgDeltaPercent { get; set; }
        public double DowntimeDeltaPercent { get; set; }
    }

    public class PlanVsActualTrendItemDto
    {
        public string Date { get; set; } = string.Empty;
        public double Planned { get; set; }
        public double Actual { get; set; }
        public double Gap { get; set; } // Actual - Planned
        public double AchievementRate { get; set; } // %
    }

    public class ProductionByProductDto
    {
        public string Product { get; set; } = string.Empty;
        public string ProductNameVi { get; set; } = string.Empty;
        public double Planned { get; set; }
        public double Actual { get; set; }
        public double Gap { get; set; }
        public double AchievementRate { get; set; }
        public double UPH { get; set; }
        public double Efficiency { get; set; }
        public double TotalNG { get; set; }
        public double NGRate { get; set; }
        public double DowntimeMinutes { get; set; }
    }

    public class PerformanceTrendDto
    {
        public string Date { get; set; } = string.Empty;
        public double Efficiency { get; set; }
        public double UPH { get; set; }
        public double WorkingHours { get; set; }
        public double StandardWorkingTime { get; set; }
    }

    public class ManpowerAnalysisDto
    {
        public string Date { get; set; } = string.Empty;
        public double PlannedManpower { get; set; }
        public double ActualManpower { get; set; }
        public double MissingManpower { get; set; }
        public double ShortageRate { get; set; } // %
        public bool IsExceedingThreshold { get; set; }
    }

    public class ParetoDefectItemDto
    {
        public string DefectKey { get; set; } = string.Empty;
        public string DefectNameVi { get; set; } = string.Empty;
        public string DefectNameZh { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public double Percentage { get; set; } // % of total defect
        public double CumulativePercentage { get; set; } // % cumulative 0-100%
    }

    public class QualityParetoDto
    {
        public double TotalNG { get; set; }
        public double OverallNGRate { get; set; }
        public string TopDefect { get; set; } = string.Empty;
        public string WorstProduct { get; set; } = string.Empty;
        public List<ParetoDefectItemDto> Defects { get; set; } = new();
    }

    public class DefectHeatmapCellDto
    {
        public string Product { get; set; } = string.Empty;
        public string DefectKey { get; set; } = string.Empty;
        public string DefectNameVi { get; set; } = string.Empty;
        public double Quantity { get; set; }
        public double DefectRate { get; set; } // % of actual production for this product
        public double Intensity { get; set; } // 0 to 1 normalized for heatmap color
    }

    public class DefectHeatmapDto
    {
        public List<string> Products { get; set; } = new();
        public List<string> DefectTypes { get; set; } = new();
        public List<DefectHeatmapCellDto> Cells { get; set; } = new();
    }

    public class DowntimeReasonItemDto
    {
        public string Reason { get; set; } = string.Empty;
        public double Minutes { get; set; }
        public double Percentage { get; set; }
        public double CumulativePercentage { get; set; }
        public int Occurrences { get; set; }
    }

    public class DowntimeTrendItemDto
    {
        public string Date { get; set; } = string.Empty;
        public double Minutes { get; set; }
        public int IncidentCount { get; set; }
    }

    public class DowntimeAnalysisDto
    {
        public double TotalDowntimeMinutes { get; set; }
        public double AverageDowntimeMinutes { get; set; }
        public double LongestDowntimeMinutes { get; set; }
        public string TopReason { get; set; } = string.Empty;
        public List<DowntimeReasonItemDto> Reasons { get; set; } = new();
        public List<DowntimeTrendItemDto> Trend { get; set; } = new();
    }

    public class UphAnalysisDto
    {
        public double AverageUPH { get; set; }
        public double BestUPH { get; set; }
        public double LowestUPH { get; set; }
        public List<UphProductItemDto> ByProduct { get; set; } = new();
        public List<UphTrendItemDto> Trend { get; set; } = new();
    }

    public class UphProductItemDto
    {
        public string Product { get; set; } = string.Empty;
        public double UPH { get; set; }
        public double TargetUPH { get; set; }
    }

    public class UphTrendItemDto
    {
        public string Date { get; set; } = string.Empty;
        public double UPH { get; set; }
    }

    public class ProductMatrixRowDto
    {
        public int Id { get; set; }
        public string Date { get; set; } = string.Empty;
        public string Product { get; set; } = string.Empty;
        public string ProductNameVi { get; set; } = string.Empty;
        public double Plan { get; set; }
        public double Actual { get; set; }
        public double Achievement { get; set; }
        public double UPH { get; set; }
        public double TotalNG { get; set; }
        public double NGRate { get; set; }
        public double Downtime { get; set; }
        public double Efficiency { get; set; }
        public double WorkingHours { get; set; }
        public string Shift { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class DrillDownDetailDto
    {
        public string Type { get; set; } = string.Empty; // "product", "defect", "date"
        public string Key { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public List<ProductMatrixRowDto> Records { get; set; } = new();
        public List<ParetoDefectItemDto> DefectBreakdown { get; set; } = new();
        public List<DowntimeReasonItemDto> DowntimeBreakdown { get; set; } = new();
        public List<PlanVsActualTrendItemDto> Trend { get; set; } = new();
        public double TotalProduction { get; set; }
        public double TotalNG { get; set; }
        public double NGRate { get; set; }
        public double TotalDowntime { get; set; }
        public List<string> RelatedNotes { get; set; } = new();
    }

    public class EvidenceFor8DDto
    {
        public string Product { get; set; } = string.Empty;
        public string DefectType { get; set; } = string.Empty;
        public string DateRange { get; set; } = string.Empty;
        public double ProductionQuantity { get; set; }
        public double NGQuantity { get; set; }
        public double NGRate { get; set; }
        public string TopDefect { get; set; } = string.Empty;
        public double DowntimeMinutes { get; set; }
        public string SuggestedProblemStatement { get; set; } = string.Empty;
        public List<string> RelatedDowntimeReasons { get; set; } = new();
    }

    public class FullDashboardResponse
    {
        public KpiSummaryDto Kpis { get; set; } = new();
        public List<PlanVsActualTrendItemDto> PlanVsActualTrend { get; set; } = new();
        public List<ProductionByProductDto> ProductionByProduct { get; set; } = new();
        public List<PerformanceTrendDto> PerformanceTrend { get; set; } = new();
        public List<ManpowerAnalysisDto> ManpowerAnalysis { get; set; } = new();
        public QualityParetoDto QualityPareto { get; set; } = new();
        public DefectHeatmapDto DefectHeatmap { get; set; } = new();
        public DowntimeAnalysisDto DowntimeAnalysis { get; set; } = new();
        public UphAnalysisDto UphAnalysis { get; set; } = new();
        public List<ProductMatrixRowDto> ProductMatrix { get; set; } = new();
        public List<string> AvailableProducts { get; set; } = new();
        public List<string> AvailableShifts { get; set; } = new();
        public string MinDate { get; set; } = string.Empty;
        public string MaxDate { get; set; } = string.Empty;
    }

    public class ProductionRecordCrudDto
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public string ProductCode { get; set; } = string.Empty;
        public string ProductNameVi { get; set; } = string.Empty;
        public string Shift { get; set; } = "Ca Ngày";
        public double PlannedQuantity { get; set; }
        public double ActualQuantity { get; set; }
        public double StandardWorkingTime { get; set; }
        public double WorkingHours { get; set; }
        public double AchievementRate { get; set; }
        public double Efficiency { get; set; }
        public double UPH { get; set; }
        public string Status { get; set; } = "Completed";
        public string? Notes { get; set; }

        // Manpower
        public double PlannedManpower { get; set; }
        public double ActualManpower { get; set; }
        public double MissingManpower { get; set; }

        // Quality (11 defects)
        public double FunctionalNG { get; set; }
        public double AudioNG { get; set; }
        public double ScratchNG { get; set; }
        public double EdgeChipNG { get; set; }
        public double WireNG { get; set; }
        public double PCBANG { get; set; }
        public double THDNG { get; set; }
        public double SpeakerNG { get; set; }
        public double CoverNG { get; set; }
        public double NomaliNG { get; set; }
        public double BrokenWireNG { get; set; }
        public double TotalNG { get; set; }
        public double NGRate { get; set; }

        // Downtime
        public double DowntimeMinutes { get; set; }
        public string? DowntimeReason { get; set; }
        public string? ImpactDepartment { get; set; }
    }

    public class InventoryAuditCrudDto
    {
        public int Id { get; set; }
        public string Stage { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string MaterialCode { get; set; } = string.Empty;
        public double UsagePerUnit { get; set; }
        public double AuditRequired { get; set; }
        public double RawMaterialWarehouse { get; set; }
        public double RawMaterialLine { get; set; }
        public double SemiFinishedGoods { get; set; }
        public double SemiFinishedGoods2 { get; set; }
        public double RepairRoom { get; set; }
        public double FailureAnalysisFa { get; set; }
        public double FinishedGoods { get; set; }
        public double Discrepancy { get; set; }
        public double NGQuantity { get; set; }
    }
}
