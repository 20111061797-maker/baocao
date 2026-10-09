export interface DashboardFilter {
  dateFrom?: string;
  dateTo?: string;
  product?: string;
  shift?: string;
  status?: string;
  preset?: string;
}

export interface KpiSummary {
  totalPlan: number;
  totalActual: number;
  achievementRate: number;
  averageUPH: number;
  totalManpower: number;
  totalMissingManpower: number;
  manpowerShortageRate: number;
  totalNG: number;
  ngRate: number;
  totalDowntimeMinutes: number;
  efficiency: number;
  workingHours: number;
  planDeltaPercent: number;
  actualDeltaPercent: number;
  achievementDeltaPercent: number;
  uphDeltaPercent: number;
  ngDeltaPercent: number;
  downtimeDeltaPercent: number;
}

export interface PlanVsActualTrendItem {
  date: string;
  planned: number;
  actual: number;
  gap: number;
  achievementRate: number;
}

export interface ProductionByProductItem {
  product: string;
  productNameVi: string;
  planned: number;
  actual: number;
  gap: number;
  achievementRate: number;
  uph: number;
  efficiency: number;
  totalNG: number;
  ngRate: number;
  downtimeMinutes: number;
}

export interface PerformanceTrendItem {
  date: string;
  efficiency: number;
  uph: number;
  workingHours: number;
  standardWorkingTime: number;
}

export interface ManpowerAnalysisItem {
  date: string;
  plannedManpower: number;
  actualManpower: number;
  missingManpower: number;
  shortageRate: number;
  isExceedingThreshold: boolean;
}

export interface ParetoDefectItem {
  defectKey: string;
  defectNameVi: string;
  defectNameZh: string;
  quantity: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface QualityPareto {
  totalNG: number;
  overallNGRate: number;
  topDefect: string;
  worstProduct: string;
  defects: ParetoDefectItem[];
}

export interface DefectHeatmapCell {
  product: string;
  defectKey: string;
  defectNameVi: string;
  quantity: number;
  defectRate: number;
  intensity: number;
}

export interface DefectHeatmap {
  products: string[];
  defectTypes: string[];
  cells: DefectHeatmapCell[];
}

export interface DowntimeReasonItem {
  reason: string;
  minutes: number;
  percentage: number;
  cumulativePercentage: number;
  occurrences: number;
}

export interface DowntimeTrendItem {
  date: string;
  minutes: number;
  incidentCount: number;
}

export interface DowntimeAnalysis {
  totalDowntimeMinutes: number;
  averageDowntimeMinutes: number;
  longestDowntimeMinutes: number;
  topReason: string;
  reasons: DowntimeReasonItem[];
  trend: DowntimeTrendItem[];
}

export interface UphProductItem {
  product: string;
  uph: number;
  targetUPH: number;
}

export interface UphTrendItem {
  date: string;
  uph: number;
}

export interface UphAnalysis {
  averageUPH: number;
  bestUPH: number;
  lowestUPH: number;
  byProduct: UphProductItem[];
  trend: UphTrendItem[];
}

export interface ProductMatrixRow {
  id: number;
  date: string;
  product: string;
  productNameVi: string;
  plan: number;
  actual: number;
  achievement: number;
  uph: number;
  totalNG: number;
  ngRate: number;
  downtime: number;
  efficiency: number;
  workingHours: number;
  shift: string;
  status: string;
  notes?: string;
}

export interface FullDashboardData {
  kpis: KpiSummary;
  planVsActualTrend: PlanVsActualTrendItem[];
  productionByProduct: ProductionByProductItem[];
  performanceTrend: PerformanceTrendItem[];
  manpowerAnalysis: ManpowerAnalysisItem[];
  qualityPareto: QualityPareto;
  defectHeatmap: DefectHeatmap;
  downtimeAnalysis: DowntimeAnalysis;
  uphAnalysis: UphAnalysis;
  productMatrix: ProductMatrixRow[];
  availableProducts: string[];
  availableShifts: string[];
  minDate: string;
  maxDate: string;
}

export interface DrillDownData {
  type: string;
  key: string;
  title: string;
  records: ProductMatrixRow[];
  defectBreakdown: ParetoDefectItem[];
  downtimeBreakdown: DowntimeReasonItem[];
  trend: PlanVsActualTrendItem[];
  totalProduction: number;
  totalNG: number;
  ngRate: number;
  totalDowntime: number;
  relatedNotes: string[];
}

export interface EightDReport {
  id: string;
  title: string;
  mode: '4D' | '8D';
  productCode: string;
  defectType?: string;
  dateRange: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Closed';
  createdAt: string;
  updatedAt: string;
  teamLeader: string;
  champion: string;
  teamMembers: string;
  problemStatement: string;
  evidenceDetails: string;
  evidenceProductionQty: number;
  evidenceNGQty: number;
  evidenceNGRate: number;
  evidenceTopDefect: string;
  containmentAction: string;
  containmentOwner: string;
  containmentDueDate: string;
  containmentStatus: string;
  rootCauseWhy1: string;
  rootCauseWhy2: string;
  rootCauseWhy3: string;
  rootCauseWhy4: string;
  rootCauseWhy5: string;
  rootCauseSummary: string;
  correctiveActions: string;
  actionOwner: string;
  actionDueDate: string;
  validationResult: string;
  validationDate: string;
  preventativeActions: string;
  standardOperatingProcedure: string;
  teamRecognition: string;
  signOffPerson: string;
  signOffDate: string;
}

export interface EvidenceFor8D {
  product: string;
  defectType: string;
  dateRange: string;
  productionQuantity: number;
  ngQuantity: number;
  ngRate: number;
  topDefect: string;
  downtimeMinutes: number;
  suggestedProblemStatement: string;
  relatedDowntimeReasons: string[];
}

export interface UserLayoutConfig {
  userId: string;
  theme: 'dark' | 'light';
  language: 'vi' | 'zh' | 'en';
  widgetsJson: string;
  manpowerShortageThreshold: number;
}

export interface InventoryAuditItem {
  id: number;
  stage: string;
  section: string;
  materialCode: string;
  usagePerUnit: number;
  auditRequired: number;
  rawMaterialWarehouse: number;
  rawMaterialLine: number;
  semiFinishedGoods: number;
  semiFinishedGoods2: number;
  repairRoom: number;
  failureAnalysisFa: number;
  finishedGoods: number;
  discrepancy: number;
  ngQuantity: number;
}

export interface InventoryStageGroup {
  name: string;
  sections: string[];
  itemCount: number;
  shortageCount: number;
  ngCount: number;
  totalDiscrepancy: number;
}

export interface InventoryAuditSummary {
  totalItems: number;
  filteredCount: number;
  balancedItems: number;
  surplusItems: number;
  shortageItems: number;
  totalNGItems: number;
  totalAuditRequired: number;
  totalRawWarehouse: number;
  totalRawLine: number;
  totalSemiFinished: number;
  totalRepairRoom: number;
  totalFA: number;
  totalFinishedGoods: number;
  totalDiscrepancy: number;
  totalNG: number;
}

export interface InventoryAuditResponse {
  summary: InventoryAuditSummary;
  stageGroups: InventoryStageGroup[];
  stages: string[];
  sections: string[];
  items: InventoryAuditItem[];
}

export interface ProductionRecordCrud {
  id: number;
  date: string;
  productCode: string;
  productNameVi: string;
  shift: string;
  plannedQuantity: number;
  actualQuantity: number;
  standardWorkingTime: number;
  workingHours: number;
  achievementRate: number;
  efficiency: number;
  uph: number;
  status: string;
  notes?: string;

  // Manpower
  plannedManpower: number;
  actualManpower: number;
  missingManpower: number;

  // Quality (11 defects)
  functionalNG: number;
  audioNG: number;
  scratchNG: number;
  edgeChipNG: number;
  wireNG: number;
  pcbaNG: number;
  thdNG: number;
  speakerNG: number;
  coverNG: number;
  nomaliNG: number;
  brokenWireNG: number;
  totalNG: number;
  ngRate: number;

  // Downtime
  downtimeMinutes: number;
  downtimeReason?: string;
  impactDepartment?: string;
}

