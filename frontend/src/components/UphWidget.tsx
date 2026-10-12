import React, { useState } from 'react';
import { Chart, Bar } from 'react-chartjs-2';
import { Zap, ArrowUpRight, ArrowDownRight, SlidersHorizontal, Edit2 } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { UphAnalysis } from '../types/dashboard';
import { ProductionCrudContext } from './ProductionCrudModal';

interface UphWidgetProps {
  lang: Language;
  data: UphAnalysis;
  onOpenCrud?: (context?: ProductionCrudContext) => void;
}

export const UphWidget: React.FC<UphWidgetProps> = ({ lang, data, onOpenCrud }) => {
  const t = translations[lang];
  // Default to daily progression trend ("đi lên theo ngày")
  const [viewMode, setViewMode] = useState<'trend' | 'byProduct'>('trend');

  // Trend progression sorted chronologically from earliest to latest date
  const trend = [...(data.trend || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const trendChartData = {
    labels: trend.map((t) => t.date),
    datasets: [
      {
        type: 'bar' as const,
        label: 'UPH Thực tế (pcs/h)',
        data: trend.map((t) => t.uph),
        backgroundColor: 'rgba(6, 182, 212, 0.55)',
        borderColor: '#06b6d4',
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line' as const,
        label: 'Đường Xu Hướng Tăng Dần (Trend)',
        data: trend.map((t) => t.uph),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        borderWidth: 3,
        pointBackgroundColor: '#38bdf8',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        fill: false,
        tension: 0.35,
        yAxisID: 'y',
        order: 1,
      },
    ],
  };

  // Products sorted by UPH ascending for smooth progressive visualization
  const products = [...(data.byProduct || [])].sort((a, b) => a.uph - b.uph);
  const byProductChartData = {
    labels: products.map((p) => p.product),
    datasets: [
      {
        label: 'UPH Thực tế',
        data: products.map((p) => p.uph),
        backgroundColor: 'rgba(6, 182, 212, 0.85)',
        borderColor: '#06b6d4',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'UPH Mục tiêu (Target)',
        data: products.map((p) => p.targetUPH),
        backgroundColor: 'rgba(99, 102, 241, 0.45)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0 && onOpenCrud) {
        const index = elements[0].index;
        if (viewMode === 'trend') {
          const date = trend[index]?.date;
          if (date) onOpenCrud({ date, section: 'uph' });
        } else {
          const prod = products[index]?.product;
          if (prod) onOpenCrud({ product: prod, section: 'uph' });
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'var(--text-muted)',
          font: { size: 10, family: 'var(--font-sans)' },
          boxWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334e7a',
        borderWidth: 1,
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'var(--text-dim)', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'var(--text-dim)', font: { size: 10 } },
        title: { display: true, text: 'pcs / giờ công', color: 'var(--text-dim)', font: { size: 10 } },
      },
    },
  };

  return (
    <div className="industrial-card widget-card-container">
      <div className="industrial-card-header">
        <div className="industrial-card-title">
          <Zap size={18} color="var(--accent-cyan)" />
          <span>{t.uphDashboard}</span>
        </div>

        {/* View Switcher & Quick CRUD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {onOpenCrud && (
            <button
              type="button"
              onClick={() => onOpenCrud({ section: 'uph' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                color: '#06b6d4',
                cursor: 'pointer',
              }}
              title="Thêm, sửa hoặc xóa dữ liệu UPH & sản xuất"
            >
              <Edit2 size={11} />
              <span>Thêm / Sửa</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <SlidersHorizontal size={13} color="var(--text-dim)" />
            <select
              className="select-custom"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            >
              <option value="trend">📈 Theo Ngày (Tiến độ tăng dần)</option>
              <option value="byProduct">📊 Theo Sản phẩm</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mini KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.5rem',
        marginBottom: '0.6rem'
      }}>
        <div style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Trung bình UPH</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
            {data.averageUPH} pcs/h
          </div>
        </div>

        <div style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <ArrowUpRight size={13} color="#10b981" /> UPH Cao nhất
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
            {data.bestUPH} pcs/h
          </div>
        </div>

        <div style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <ArrowDownRight size={13} color="#f43f5e" /> UPH Thấp nhất
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>
            {data.lowestUPH} pcs/h
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        {(viewMode === 'trend' ? trend.length === 0 : products.length === 0) ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
            {t.noDataTitle}
          </div>
        ) : viewMode === 'trend' ? (
          <Chart type="bar" data={trendChartData as any} options={chartOptions} />
        ) : (
          <Bar data={byProductChartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
};
