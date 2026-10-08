import React, { useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Gauge, SlidersHorizontal, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { UphAnalysis } from '../types/dashboard';

interface UphWidgetProps {
  lang: Language;
  data: UphAnalysis;
}

export const UphWidget: React.FC<UphWidgetProps> = ({ lang, data }) => {
  const t = translations[lang];
  const [viewMode, setViewMode] = useState<'byProduct' | 'trend'>('byProduct');

  const products = data.byProduct || [];
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

  const trend = data.trend || [];
  const trendChartData = {
    labels: trend.map((t) => t.date),
    datasets: [
      {
        label: 'UPH Xu hướng',
        data: trend.map((t) => t.uph),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.2)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: 'var(--text-muted)', font: { size: 10 } },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334e7a',
        borderWidth: 1,
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

        {/* View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <SlidersHorizontal size={13} color="var(--text-dim)" />
          <select
            className="select-custom"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          >
            <option value="byProduct">Theo Sản phẩm</option>
            <option value="trend">Theo Ngày (Trend)</option>
          </select>
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
        {products.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
            {t.noDataTitle}
          </div>
        ) : viewMode === 'byProduct' ? (
          <Bar data={byProductChartData} options={chartOptions} />
        ) : (
          <Line data={trendChartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
};
