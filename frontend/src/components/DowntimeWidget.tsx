import React, { useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { ClockAlert, Wrench, TrendingDown, SlidersHorizontal } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { DowntimeAnalysis } from '../types/dashboard';

interface DowntimeWidgetProps {
  lang: Language;
  data: DowntimeAnalysis;
}

export const DowntimeWidget: React.FC<DowntimeWidgetProps> = ({ lang, data }) => {
  const t = translations[lang];
  const [viewMode, setViewMode] = useState<'reasons' | 'trend'>('reasons');

  const reasons = data.reasons || [];
  const reasonLabels = reasons.map((r) => r.reason);

  const reasonChartData = {
    labels: reasonLabels,
    datasets: [
      {
        label: 'Thời gian dừng (Phút)',
        data: reasons.map((r) => r.minutes),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: '#f59e0b',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const trendLabels = (data.trend || []).map((t) => t.date);
  const trendChartData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Dừng máy theo ngày (Phút)',
        data: (data.trend || []).map((t) => t.minutes),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderWidth: 2.5,
        pointRadius: 4,
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const reasonOptions: any = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334e7a',
        borderWidth: 1,
        callbacks: {
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            const r = reasons[index];
            if (!r) return '';
            return `\nTỷ trọng: ${r.percentage}%\nSố lần phát sinh: ${r.occurrences} lần\nTích lũy: ${r.cumulativePercentage}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'var(--text-dim)', font: { size: 10 } },
        title: { display: true, text: 'Phút dừng', color: 'var(--text-dim)', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'var(--text-main)', font: { size: 9 } },
      },
    },
  };

  const trendOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'var(--text-dim)', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'var(--text-dim)', font: { size: 10 } },
        title: { display: true, text: 'Phút dừng máy', color: 'var(--text-dim)', font: { size: 10 } },
      },
    },
  };

  return (
    <div className="industrial-card widget-card-container">
      <div className="industrial-card-header">
        <div className="industrial-card-title">
          <ClockAlert size={18} color="var(--accent-amber)" />
          <span>{t.downtimeAnalysis}</span>
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
            <option value="reasons">Theo Nguyên nhân (Pareto)</option>
            <option value="trend">Xu hướng theo ngày (Trend)</option>
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
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{t.totalDowntime}</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
            {data.totalDowntimeMinutes} {t.downtimeMinutes}
          </div>
        </div>

        <div style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{t.avgDowntime}</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {data.averageDowntimeMinutes} {t.downtimeMinutes}/vụ
          </div>
        </div>

        <div style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{t.longestDowntime}</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>
            {data.longestDowntimeMinutes} {t.downtimeMinutes}
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        {reasons.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
            {t.noDataTitle}
          </div>
        ) : viewMode === 'reasons' ? (
          <Bar data={reasonChartData} options={reasonOptions} />
        ) : (
          <Line data={trendChartData} options={trendOptions} />
        )}
      </div>
    </div>
  );
};
