using System;
using System.ComponentModel.DataAnnotations;

namespace ProductionDashboard.Api.Models
{
    public class ProductionRecord
    {
        [Key]
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public string ProductCode { get; set; } = string.Empty; // Mã hàng (e.g. 喇叭, 麦克风, 控制盒, 头戴, 组装, 包装)
        public string ProductNameVi { get; set; } = string.Empty; // Tên Tiếng Việt
        public string Shift { get; set; } = "Ca Ngày"; // Shift
        public double PlannedQuantity { get; set; } // Kế hoạch 企划
        public double ActualQuantity { get; set; } // Thực tế 实际
        public double AchievementRate { get; set; } // % Đạt 达到: IF(Plan=0,0,Actual/Plan)
        public double StandardWorkingTime { get; set; } // TCGC 标准工时 (seconds)
        public double WorkingHours { get; set; } // Giờ Công 公式 (man-hours)
        public double Efficiency { get; set; } // HIỆU XUẤT 效率: Actual*TCGC/3600/WorkingHours
        public double UPH { get; set; } // UPH: IF(WorkingHours=0,0,Actual/WorkingHours)
        public string Status { get; set; } = "Completed";
        public string? Notes { get; set; } // Ghi chú
    }

    public class ManpowerRecord
    {
        [Key]
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public string ProductCode { get; set; } = string.Empty;
        public double PlannedManpower { get; set; } // Nhân lực 人力
        public double ActualManpower { get; set; } // Đi làm 上班
        public double MissingManpower { get; set; } // Thiếu 小 = Planned - Actual
        public double MissingRate { get; set; } // Thiếu / Nhân lực
    }

    public class QualityRecord
    {
        [Key]
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public string ProductCode { get; set; } = string.Empty;

        // 11 Defect types from Excel columns L through V:
        public double FunctionalNG { get; set; } // CÔNG NĂNG 功能
        public double AudioNG { get; set; } // ÂM THANH 音频测试
        public double ScratchNG { get; set; } // XƯỚC 划伤
        public double EdgeChipNG { get; set; } // Mẻ 崩边
        public double WireNG { get; set; } // DÂY 想材 USB
        public double PCBANG { get; set; } // PCBA
        public double THDNG { get; set; } // THD
        public double SpeakerNG { get; set; } // LỎM LOA
        public double CoverNG { get; set; } // HỞ NẮP
        public double NomaliNG { get; set; } // NOMALI
        public double BrokenWireNG { get; set; } // ĐỨT DÂY

        public double TotalNG { get; set; } // NG Tổng = SUM(L:V)
        public double NGRatio { get; set; } // Tỷ lệ NG = TotalNG / ActualQuantity
    }

    public class DowntimeRecord
    {
        [Key]
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public string ProductCode { get; set; } = string.Empty;
        public double DowntimeMinutes { get; set; } // Dừng máy (phút)
        public string DowntimeReason { get; set; } = string.Empty; // Lý do dừng
        public string? ImpactDepartment { get; set; } // Bộ phận ảnh hưởng (Thiết bị, Vật tư, Kỹ thuật, Vận hành)
    }

    public class InventoryAuditRecord
    {
        [Key]
        public int Id { get; set; }
        public string Stage { get; set; } = string.Empty; // SPK,MIC D6 / ĐAI ĐẦU D6 / LẮP RÁP D6 / ĐÓNG GÓI D6
        public string Section { get; set; } = string.Empty; // 喇叭SPK, 麦克风MIC, 头戴ĐAI ĐẦU STREO, 先红花 DÂY D6, 组装LẮP RÁP D6, 包装ĐÓNG GÓI
        public string MaterialCode { get; set; } = string.Empty; // 料号 Mã liệu
        public double UsagePerUnit { get; set; } // LƯỢNG DÙNG
        public double AuditRequired { get; set; } // Cần kiểm 应盘
        public double RawMaterialWarehouse { get; set; } // Liệu Nguyên Kho
        public double RawMaterialLine { get; set; } // Ngoài chuyền
        public double SemiFinishedGoods { get; set; } // Bán thành phẩm 1 / 左耳 ĐÃ LẮP MIC
        public double SemiFinishedGoods2 { get; set; } // Bán thành phẩm 2 / 待入库 BÁN THÀNH PHẨM
        public double RepairRoom { get; set; } // 维修房双耳 PHÒNG SỬA HÀNG
        public double FailureAnalysisFa { get; set; } // FA D6双耳 D6 FA
        public double FinishedGoods { get; set; } // Thành Phẩm
        public double Discrepancy { get; set; } // Chênh lệch 差异
        public double NGQuantity { get; set; } // NG
    }

    public class EightDReport
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString("N");
        public string Title { get; set; } = string.Empty;
        public string Mode { get; set; } = "8D"; // "4D" or "8D"
        public string ProductCode { get; set; } = string.Empty;
        public string? DefectType { get; set; }
        public string DateRange { get; set; } = string.Empty;
        public string Severity { get; set; } = "High"; // Low, Medium, High, Critical
        public string Status { get; set; } = "Open"; // Open, In Progress, Closed
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // D1 Team
        public string TeamLeader { get; set; } = string.Empty;
        public string Champion { get; set; } = string.Empty;
        public string TeamMembers { get; set; } = string.Empty;

        // D2 Problem Description & Evidence
        public string ProblemStatement { get; set; } = string.Empty;
        public string EvidenceDetails { get; set; } = string.Empty; // JSON or formatted text of production evidence
        public double EvidenceProductionQty { get; set; }
        public double EvidenceNGQty { get; set; }
        public double EvidenceNGRate { get; set; }
        public string EvidenceTopDefect { get; set; } = string.Empty;

        // D3 Containment Action (ICA)
        public string ContainmentAction { get; set; } = string.Empty;
        public string ContainmentOwner { get; set; } = string.Empty;
        public string ContainmentDueDate { get; set; } = string.Empty;
        public string ContainmentStatus { get; set; } = "Pending";

        // D4 Root Cause Analysis
        public string RootCauseWhy1 { get; set; } = string.Empty;
        public string RootCauseWhy2 { get; set; } = string.Empty;
        public string RootCauseWhy3 { get; set; } = string.Empty;
        public string RootCauseWhy4 { get; set; } = string.Empty;
        public string RootCauseWhy5 { get; set; } = string.Empty;
        public string RootCauseSummary { get; set; } = string.Empty;

        // D5 Permanent Corrective Actions (PCA)
        public string CorrectiveActions { get; set; } = string.Empty;
        public string ActionOwner { get; set; } = string.Empty;
        public string ActionDueDate { get; set; } = string.Empty;

        // D6 Implementation & Validation
        public string ValidationResult { get; set; } = string.Empty;
        public string ValidationDate { get; set; } = string.Empty;

        // D7 Prevent Recurrence
        public string PreventativeActions { get; set; } = string.Empty;
        public string StandardOperatingProcedure { get; set; } = string.Empty;

        // D8 Closure & Recognition
        public string TeamRecognition { get; set; } = string.Empty;
        public string SignOffPerson { get; set; } = string.Empty;
        public string SignOffDate { get; set; } = string.Empty;
    }

    public class UserLayoutConfig
    {
        [Key]
        public string UserId { get; set; } = "default_user";
        public string Theme { get; set; } = "dark";
        public string Language { get; set; } = "vi";
        public string WidgetsJson { get; set; } = string.Empty;
        public double ManpowerShortageThreshold { get; set; } = 0.10; // 10%
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
