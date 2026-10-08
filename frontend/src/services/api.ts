import {
  DashboardFilter,
  FullDashboardData,
  DrillDownData,
  EightDReport,
  EvidenceFor8D,
  UserLayoutConfig,
  InventoryAuditResponse
} from '../types/dashboard';

const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/api` : '/api';

export const api = {
  async getDashboardSummary(filter: DashboardFilter): Promise<FullDashboardData> {
    const res = await fetch(`${API_BASE}/dashboard/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể tải dữ liệu Dashboard.');
    }
    return res.json();
  },

  async getDrillDown(type: string, key: string): Promise<DrillDownData> {
    const params = new URLSearchParams({ type, key });
    const res = await fetch(`${API_BASE}/dashboard/drilldown?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Không thể tải dữ liệu chi tiết Drill-Down.');
    }
    return res.json();
  },

  async getInventoryAudit(params?: {
    stage?: string;
    section?: string;
    search?: string;
    statusFilter?: string;
  }): Promise<InventoryAuditResponse> {
    const query = new URLSearchParams();
    if (params?.stage && params.stage !== 'all') query.append('stage', params.stage);
    if (params?.section && params.section !== 'all') query.append('section', params.section);
    if (params?.search) query.append('search', params.search);
    if (params?.statusFilter && params.statusFilter !== 'all') query.append('statusFilter', params.statusFilter);

    const queryString = query.toString();
    const url = queryString ? `${API_BASE}/dashboard/inventory-audit?${queryString}` : `${API_BASE}/dashboard/inventory-audit`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể tải dữ liệu kiểm kê.');
    return res.json();
  },

  async uploadExcel(file: File): Promise<{ message: string; count?: number; productionCount?: number; isInventory?: boolean; autoSeededProduction?: boolean }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/production/upload-excel`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Lỗi khi upload file Excel.');
    }
    return res.json();
  },

  async clearProductionData(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/production/clear-data`, { method: 'POST' });
    if (!res.ok) throw new Error('Không thể xóa dữ liệu.');
    return res.json();
  },

  async seedSampleData(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/production/seed-data`, { method: 'POST' });
    if (!res.ok) throw new Error('Không thể nạp dữ liệu mẫu.');
    return res.json();
  },

  getExportExcelUrl(filter: DashboardFilter): string {
    const params = new URLSearchParams();
    if (filter.dateFrom) params.append('dateFrom', filter.dateFrom);
    if (filter.dateTo) params.append('dateTo', filter.dateTo);
    if (filter.product && filter.product !== 'all') params.append('product', filter.product);
    if (filter.shift && filter.shift !== 'all') params.append('shift', filter.shift);
    return `${API_BASE}/production/export-excel?${params.toString()}`;
  },

  getExportCsvUrl(filter: DashboardFilter): string {
    const params = new URLSearchParams();
    if (filter.dateFrom) params.append('dateFrom', filter.dateFrom);
    if (filter.dateTo) params.append('dateTo', filter.dateTo);
    if (filter.product && filter.product !== 'all') params.append('product', filter.product);
    if (filter.shift && filter.shift !== 'all') params.append('shift', filter.shift);
    return `${API_BASE}/production/export-csv?${params.toString()}`;
  },

  async get8DReports(mode?: string): Promise<EightDReport[]> {
    const url = mode ? `${API_BASE}/problem-solving/reports?mode=${encodeURIComponent(mode)}` : `${API_BASE}/problem-solving/reports`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể tải danh sách báo cáo 4D/8D.');
    return res.json();
  },

  async save8DReport(report: EightDReport): Promise<EightDReport> {
    const res = await fetch(`${API_BASE}/problem-solving/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể lưu báo cáo 4D/8D.');
    }
    return res.json();
  },

  async delete8DReport(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/problem-solving/reports/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Không thể xóa báo cáo 4D/8D.');
  },

  async generate8DEvidence(product: string, defectType?: string, fromDate?: string, toDate?: string): Promise<EvidenceFor8D> {
    const params = new URLSearchParams({ product });
    if (defectType) params.append('defectType', defectType);
    if (fromDate) params.append('dateFrom', fromDate);
    if (toDate) params.append('dateTo', toDate);

    const res = await fetch(`${API_BASE}/problem-solving/generate-evidence?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Không thể tạo bằng chứng thực tế từ Dashboard.');
    }
    return res.json();
  },

  async getLayoutConfig(): Promise<UserLayoutConfig> {
    const res = await fetch(`${API_BASE}/customization/layout`);
    if (!res.ok) throw new Error('Không thể tải cấu hình layout.');
    return res.json();
  },

  async saveLayoutConfig(config: Partial<UserLayoutConfig>): Promise<UserLayoutConfig> {
    const res = await fetch(`${API_BASE}/customization/layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Không thể lưu cấu hình layout.');
    return res.json();
  }
};
