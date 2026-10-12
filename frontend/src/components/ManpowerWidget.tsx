import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Users, AlertTriangle, SlidersHorizontal, Edit2 } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { ManpowerAnalysisItem } from '../types/dashboard';
import { ProductionCrudContext } from './ProductionCrudModal';

interface ManpowerWidgetProps {
  lang: Language;
  data: ManpowerAnalysisItem[];
  shortageThreshold: number; // e.g. 0.05 for 5%
  onOpenCrud?: (context?: ProductionCrudContext) => void;
}

export const ManpowerWidget: React.FC<ManpowerWidgetProps> = ({
  lang,
  data,
  shortageThreshold,
  onOpenCrud,
}) => {
  const t = translations[lang];
  const [chartMode, setChartMode] = useState<'stacked' | 'grouped'>('stacked');

  // Sort chronologically ascending from left to right
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const labels = sortedData.map((d) => d.date);
  const anyExceeding = sortedData.some((d) => d.shortageRate > shortageThreshold * 100);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Đi làm thực tế (Actual)',
        data: sortedData.map((d) => d.actualManpower),
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4,
        stack: chartMode === 'stacked' ? 'manpower' : undefined,
      },
      {
        label: 'Thiếu hụt (Missing)',
        data: sortedData.map((d) => d.missingManpower),
        backgroundColor: 'rgba(244, 63, 94, 0.85)',
        borderColor: '#f43f5e',
        borderWidth: 1,
        borderRadius: 4,
        stack: chartMode === 'stacked' ? 'manpower' : undefined,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const date = labels[index];
        if (onOpenCrud) onOpenCrud({ date, section: 'manpower' });
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'var(--text-muted)',
          font: { size: 11, family: 'var(--font-sans)' },
          boxWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334e7a',
        borderWidth: 1,
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        padding: 10,
        callbacks: {
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            const item = data[index];
            if (!item) return '';
            return `\nTổng kế hoạch: ${item.plannedManpower} người\nTỷ lệ thiếu: ${item.shortageRate}%`;
          },
        },
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
        title: {
          display: true,
          text: 'Nhân sự (Người)',
          color: 'var(--text-dim)',
          font: { size: 10 },
        },
      },
    },
  };

  return (
    <div className="industrial-card widget-card-container">
      <div className="industrial-card-header">
        <div className="industrial-card-title">
          <Users size={18} color="var(--accent-indigo)" />
          <span>{t.manpowerAnalysis}</span>
        </div>

        {/* Controls & Quick CRUD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {onOpenCrud && (
            <button
              type="button"
              onClick={() => onOpenCrud({ section: 'manpower' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                cursor: 'pointer',
              }}
              title="Thêm, sửa hoặc xóa bố trí nhân lực"
            >
              <Edit2 size={11} />
              <span>Thêm / Sửa</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <SlidersHorizontal size={13} color="var(--text-dim)" />
            <select
              className="select-custom"
              value={chartMode}
              onChange={(e) => setChartMode(e.target.value as any)}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            >
              <option value="stacked">Cột chồng (Stacked Bar)</option>
              <option value="grouped">Cột nhóm (Grouped Bar)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Warning banner if threshold exceeded */}
      {anyExceeding && (
        <div style={{
          backgroundColor: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '6px',
          padding: '0.4rem 0.8rem',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: '#fb7185'
        }}>
          <AlertTriangle size={15} color="#f43f5e" />
          <span>{t.manpowerWarning} (Ngưỡng: {(shortageThreshold * 100).toFixed(0)}%)</span>
        </div>
      )}

      <div className="chart-wrapper">
        {data.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
            {t.noDataTitle}
          </div>
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};
