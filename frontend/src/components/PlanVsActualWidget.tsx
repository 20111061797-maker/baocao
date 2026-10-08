import React, { useState } from 'react';
import { Chart } from 'react-chartjs-2';
import { BarChart3, TrendingUp, SlidersHorizontal } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { PlanVsActualTrendItem } from '../types/dashboard';

interface PlanVsActualWidgetProps {
  lang: Language;
  data: PlanVsActualTrendItem[];
  onDrillDownDate: (date: string) => void;
}

export const PlanVsActualWidget: React.FC<PlanVsActualWidgetProps> = ({ lang, data, onDrillDownDate }) => {
  const t = translations[lang];
  const [chartType, setChartType] = useState<'combo' | 'stacked' | 'grouped'>('combo');
  const [viewInterval, setViewInterval] = useState<'daily' | 'weekly'>('daily');

  // Labels & datasets
  const labels = data.map((d) => d.date);

  const chartData = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: `${t.kpiPlan} (Plan)`,
        data: data.map((d) => d.planned),
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
        stack: chartType === 'stacked' ? 'stack1' : undefined,
      },
      {
        type: 'bar' as const,
        label: `${t.kpiActual} (Actual)`,
        data: data.map((d) => d.actual),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
        stack: chartType === 'stacked' ? 'stack1' : undefined,
      },
      ...(chartType === 'combo'
        ? [
            {
              type: 'line' as const,
              label: `${t.kpiAchievement} (%)`,
              data: data.map((d) => d.achievementRate),
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderWidth: 2.5,
              pointBackgroundColor: '#f59e0b',
              pointRadius: 4,
              yAxisID: 'y1',
              tension: 0.3,
            },
          ]
        : []),
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const selectedDate = labels[index];
        onDrillDownDate(selectedDate);
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
            const gap = item.gap;
            const gapSign = gap > 0 ? '+' : '';
            return `\nGap (Thực tế - Kế hoạch): ${gapSign}${gap.toLocaleString()} pcs\nĐạt: ${item.achievementRate}%`;
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
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'var(--text-dim)', font: { size: 10 } },
        title: {
          display: true,
          text: 'Sản lượng (pcs)',
          color: 'var(--text-dim)',
          font: { size: 10 },
        },
      },
      ...(chartType === 'combo'
        ? {
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: {
                color: '#f59e0b',
                font: { size: 10 },
                callback: (val: any) => `${val}%`,
              },
              title: {
                display: true,
                text: '% Hoàn thành',
                color: '#f59e0b',
                font: { size: 10 },
              },
            },
          }
        : {}),
    },
  };

  return (
    <div className="industrial-card widget-card-container">
      <div className="industrial-card-header">
        <div className="industrial-card-title">
          <BarChart3 size={18} color="var(--accent-blue)" />
          <span>{t.planVsActual}</span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {/* Interval Switcher */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '6px', padding: '2px' }}>
            <button
              onClick={() => setViewInterval('daily')}
              style={{
                border: 'none',
                background: viewInterval === 'daily' ? 'var(--accent-blue)' : 'transparent',
                color: viewInterval === 'daily' ? '#fff' : 'var(--text-dim)',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Daily
            </button>
            <button
              onClick={() => setViewInterval('weekly')}
              style={{
                border: 'none',
                background: viewInterval === 'weekly' ? 'var(--accent-blue)' : 'transparent',
                color: viewInterval === 'weekly' ? '#fff' : 'var(--text-dim)',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Weekly
            </button>
          </div>

          {/* Chart Type Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <SlidersHorizontal size={13} color="var(--text-dim)" />
            <select
              className="select-custom"
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            >
              <option value="combo">{t.combo}</option>
              <option value="grouped">Cột nhóm (Grouped)</option>
              <option value="stacked">{t.stackedBar}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        {data.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
            {t.noDataTitle}
          </div>
        ) : (
          <Chart type={chartType === 'combo' ? 'bar' : 'bar'} data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};
