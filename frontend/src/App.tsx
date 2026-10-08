import React, { useState, useEffect } from 'react';
import './utils/chartSetup';
import { Language, translations } from './i18n/translations';
import { api } from './services/api';
import { DashboardFilter, FullDashboardData, ProductMatrixRow } from './types/dashboard';

import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KpiCards } from './components/KpiCards';
import { PlanVsActualWidget } from './components/PlanVsActualWidget';
import { ProductionByProductWidget } from './components/ProductionByProductWidget';
import { PerformanceWidget } from './components/PerformanceWidget';
import { ManpowerWidget } from './components/ManpowerWidget';
import { QualityParetoWidget } from './components/QualityParetoWidget';
import { DefectHeatmapWidget } from './components/DefectHeatmapWidget';
import { DowntimeWidget } from './components/DowntimeWidget';
import { UphWidget } from './components/UphWidget';
import { ProductMatrixWidget } from './components/ProductMatrixWidget';

import { DrillDownModal } from './components/DrillDownModal';
import { ProblemSolvingModal } from './components/ProblemSolvingModal';
import { InventoryAuditModal } from './components/InventoryAuditModal';
import { InventoryWidget } from './components/InventoryWidget';
import { UploadExcelModal } from './components/UploadExcelModal';
import { LayoutSettingsModal } from './components/LayoutSettingsModal';

export const App: React.FC = () => {
  // 1. Theme & Localization
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<Language>('vi');

  // 2. Filter State
  const [filter, setFilter] = useState<DashboardFilter>({
    preset: 'last_7_days',
    product: 'all',
    shift: 'all',
  });

  // 3. Dashboard Data & Loading State
  const [dashboardData, setDashboardData] = useState<FullDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 4. Custom Widgets & Layout State
  const defaultWidgets = [
    'kpi',
    'planVsActual',
    'productionByProduct',
    'performance',
    'manpower',
    'qualityPareto',
    'defectHeatmap',
    'downtime',
    'uph',
    'inventoryAudit',
    'productMatrix',
  ];
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(defaultWidgets);
  const [shortageThreshold, setShortageThreshold] = useState<number>(0.10);
  const [dataRefreshKey, setDataRefreshKey] = useState<number>(0);

  // 5. Modals State
  const [drillDown, setDrillDown] = useState<{ open: boolean; type: string; key: string }>({
    open: false,
    type: '',
    key: '',
  });

  const [problemSolving, setProblemSolving] = useState<{
    open: boolean;
    initialProduct?: string;
    initialDefect?: string;
  }>({ open: false });

  const [openAudit, setOpenAudit] = useState<boolean>(() => {
    return typeof window !== 'undefined' && (window.location.hash === '#audit' || window.location.search.includes('audit=true'));
  });
  const [openUpload, setOpenUpload] = useState(false);
  const [openLayout, setOpenLayout] = useState(false);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#audit') setOpenAudit(true);
      if (window.location.hash === '#8d') setProblemSolving({ open: true });
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Synchronize Theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initial load layout config
  useEffect(() => {
    api.getLayoutConfig()
      .then((cfg) => {
        if (cfg.theme) setTheme(cfg.theme);
        if (cfg.language) setLang(cfg.language);
        if (cfg.manpowerShortageThreshold > 0) setShortageThreshold(cfg.manpowerShortageThreshold);
        if (cfg.widgetsJson) {
          try {
            const parsed = JSON.parse(cfg.widgetsJson);
            if (Array.isArray(parsed) && parsed.length > 0) setVisibleWidgets(parsed);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Dashboard Data
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardSummary(filter);
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu Dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [filter.preset]);

  const handleApplyFilter = () => {
    loadDashboardData();
  };

  const handleResetFilter = () => {
    setFilter({
      preset: 'last_7_days',
      product: 'all',
      shift: 'all',
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  // Handlers for Drill-down
  const handleDrillDown = (type: string, key: string) => {
    setDrillDown({ open: true, type, key });
  };

  const handleRowClick = (row: ProductMatrixRow) => {
    handleDrillDown('product', row.product);
  };

  const handleHeatmapCellClick = (product: string, defectName: string) => {
    handleDrillDown('product', product);
  };

  const handleToggleWidget = (widgetId: string) => {
    if (visibleWidgets.includes(widgetId)) {
      setVisibleWidgets(visibleWidgets.filter((id) => id !== widgetId));
    } else {
      setVisibleWidgets([...visibleWidgets, widgetId]);
    }
  };

  const t = translations[lang];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Top Header */}
      <Header
        lang={lang}
        onLanguageChange={setLang}
        theme={theme}
        onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onRefresh={loadDashboardData}
        isLoading={isLoading}
        filter={filter}
        onOpenUpload={() => setOpenUpload(true)}
        onOpen8D={() => setProblemSolving({ open: true })}
        onOpenAudit={() => setOpenAudit(true)}
        onOpenLayout={() => setOpenLayout(true)}
      />

      {/* 2. Global Filter Bar */}
      <FilterBar
        lang={lang}
        filter={filter}
        onChange={setFilter}
        onApply={handleApplyFilter}
        onReset={handleResetFilter}
        availableProducts={dashboardData?.availableProducts || []}
        availableShifts={dashboardData?.availableShifts || []}
      />

      {/* 3. Main Dashboard Body */}
      <main style={{ flex: 1, paddingBottom: '2.5rem' }}>
        {isLoading && !dashboardData ? (
          <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {t.loadingData}
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              Đang kết nối API và tổng hợp chỉ số sản xuất từ hệ thống...
            </div>
          </div>
        ) : error && !dashboardData ? (
          <div style={{ padding: '6rem 2rem', textAlign: 'center', color: '#f43f5e' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Lỗi tải dữ liệu Dashboard
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
              {error}
            </div>
            <button className="btn-primary" onClick={loadDashboardData}>
              Thử lại
            </button>
          </div>
        ) : dashboardData ? (
          <>
            {/* KPI Section */}
            {visibleWidgets.includes('kpi') && (
              <KpiCards
                lang={lang}
                kpis={dashboardData.kpis}
                onDrillDown={handleDrillDown}
              />
            )}

            {/* Grid 1: Plan vs Actual + Production by Product */}
            <div className="dashboard-grid-2col">
              {visibleWidgets.includes('planVsActual') && (
                <PlanVsActualWidget
                  lang={lang}
                  data={dashboardData.planVsActualTrend}
                  onDrillDownDate={(date) => handleDrillDown('date', date)}
                />
              )}

              {visibleWidgets.includes('productionByProduct') && (
                <ProductionByProductWidget
                  lang={lang}
                  data={dashboardData.productionByProduct}
                  onDrillDownProduct={(product) => handleDrillDown('product', product)}
                />
              )}
            </div>

            {/* Grid 2: Performance Efficiency + Manpower Analysis */}
            <div className="dashboard-grid-2col">
              {visibleWidgets.includes('performance') && (
                <PerformanceWidget
                  lang={lang}
                  data={dashboardData.performanceTrend}
                />
              )}

              {visibleWidgets.includes('manpower') && (
                <ManpowerWidget
                  lang={lang}
                  data={dashboardData.manpowerAnalysis}
                  shortageThreshold={shortageThreshold}
                />
              )}
            </div>

            {/* Grid 3: Quality Pareto + Downtime Analysis */}
            <div className="dashboard-grid-2col">
              {visibleWidgets.includes('qualityPareto') && (
                <QualityParetoWidget
                  lang={lang}
                  data={dashboardData.qualityPareto}
                  onDrillDownDefect={(defect) => handleDrillDown('defect', defect)}
                />
              )}

              {visibleWidgets.includes('downtime') && (
                <DowntimeWidget
                  lang={lang}
                  data={dashboardData.downtimeAnalysis}
                />
              )}
            </div>

            {/* Grid 4: Defect Heatmap + UPH Dashboard */}
            <div className="dashboard-grid-2col">
              {visibleWidgets.includes('defectHeatmap') && (
                <DefectHeatmapWidget
                  lang={lang}
                  data={dashboardData.defectHeatmap}
                  onCellClick={handleHeatmapCellClick}
                />
              )}

              {visibleWidgets.includes('uph') && (
                <UphWidget
                  lang={lang}
                  data={dashboardData.uphAnalysis}
                />
              )}
            </div>

            {/* Grid 5: Inventory Audit 4-Tabs Overview */}
            {visibleWidgets.includes('inventoryAudit') && (
              <div className="dashboard-grid-1col">
                <InventoryWidget
                  onOpenFullAudit={() => setOpenAudit(true)}
                  refreshTrigger={dataRefreshKey}
                />
              </div>
            )}

            {/* Grid 6: Full Width Product Performance Matrix Table */}
            {visibleWidgets.includes('productMatrix') && (
              <div className="dashboard-grid-1col">
                <ProductMatrixWidget
                  lang={lang}
                  data={dashboardData.productMatrix}
                  onRowClick={handleRowClick}
                />
              </div>
            )}
          </>
        ) : null}
      </main>

      {/* 4. Modals */}
      {drillDown.open && (
        <DrillDownModal
          type={drillDown.type}
          drillKey={drillDown.key}
          onClose={() => setDrillDown({ open: false, type: '', key: '' })}
          onCreate8D={(prod, def) => setProblemSolving({ open: true, initialProduct: prod, initialDefect: def })}
        />
      )}

      {problemSolving.open && (
        <ProblemSolvingModal
          onClose={() => setProblemSolving({ open: false })}
          initialProduct={problemSolving.initialProduct}
          initialDefect={problemSolving.initialDefect}
          availableProducts={dashboardData?.availableProducts || ['喇叭', '麦克风', '控制盒', '头戴', '组装', '包装']}
        />
      )}

      {openAudit && (
        <InventoryAuditModal
          onClose={() => setOpenAudit(false)}
        />
      )}

      {openUpload && (
        <UploadExcelModal
          onClose={() => setOpenUpload(false)}
          onSuccess={() => {
            setDataRefreshKey((k) => k + 1);
            loadDashboardData();
          }}
          onOpenAudit={() => setOpenAudit(true)}
        />
      )}

      {openLayout && (
        <LayoutSettingsModal
          onClose={() => setOpenLayout(false)}
          visibleWidgets={visibleWidgets}
          onToggleWidget={handleToggleWidget}
          shortageThreshold={shortageThreshold}
          onThresholdChange={setShortageThreshold}
          onResetLayout={() => setVisibleWidgets(defaultWidgets)}
        />
      )}
    </div>
  );
};

export default App;
