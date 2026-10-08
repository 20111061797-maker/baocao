import React, { useState } from 'react';
import { Chart } from 'react-chartjs-2';
import { AlertOctagon, Flame, Trophy, SlidersHorizontal } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { QualityPareto } from '../types/dashboard';

interface QualityParetoWidgetProps {
  lang: Language;
  data: QualityPareto;
  onDrillDownDefect: (defect: string) => void;
}

export const QualityParetoWidget: React.FC<QualityParetoWidgetProps> = ({
  lang,
  data,
  onDrillDownDefect,
}) => {
  const t = translations[lang];
  const [limit, setLimit] = useState<'top5' | 'top10' | 'all'>('all');

  let displayedDefects = data.defects || [];
  if (limit === 'top5') displayedDefects = displayedDefects.slice(0, 5);
  else if (limit === 'top10') displayedDefects = displayedDefects.slice(0, 10);

  const labels = displayedDefects.map((d) => `${d.defectNameVi} (${d.defectNameZh})`);

  const chartData = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: `${t.defectQuantity} (pcs)`,
        data: displayedDefects.map((d) => d.quantity),
        backgroundColor: 'rgba(244, 63, 94, 0.85)',
        borderColor: '#f43f5e',
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: `${t.cumulativePercent} (%)`,
        data: displayedDefects.map((d) => d.cumulativePercentage),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        borderWidth: 2.5,
        pointBackgroundColor: '#06b6d4',
        pointRadius: 4,
        yAxisID: 'y1',
        tension: 0.2,
      },
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
        const item = displayedDefects[index];
        if (item) onDrillDownDefect(item.defectNameVi);
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
            const item = displayedDefects[index];
            if (!item) return '';
            return `\nTỷ trọng lỗi: ${item.percentage}%\nTích lũy: ${item.cumulativePercentage}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'var(--text-dim)', font: { size: 9 }, maxRotation: 45 },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'var(--text-dim)', font: { size: 10 } },
        title: { display: true, text: 'Số lượng lỗi (pcs)', color: 'var(--text-dim)', font: { size: 10 } },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        max: 100,
        min: 0,
        grid: { drawOnChartArea: false },
        ticks: {
          color: '#06b6d4',
          font: { size: 10 },
          callback: (val: any) => `${val}%`,
        },
        title: { display: true, text: 'Tích lũy %', color: '#06b6d4', font: { size: 10 } },
      },
    },
  };

  return (
    <div className="industrial-card widget-card-container">
      <div className="industrial-card-header">
        <div className="industrial-card-title">
          <AlertOctagon size={18} color="var(--accent-rose)" />
          <span>{t.qualityPareto}</span>
        </div>

        {/* Controls: Top 5 / 10 / All */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <SlidersHorizontal size={13} color="var(--text-dim)" />
          <select
            className="select-custom"
            value={limit}
            onChange={(e) => setLimit(e.target.value as any)}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          >
            <option value="top5">Top 5 Lỗi chính</option>
            <option value="top10">Top 10 Lỗi</option>
            <option value="all">Tất cả 11 loại lỗi</option>
          </select>
        </div>
      </div>

      {/* Mini Quality KPIs Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.5rem',
        marginBottom: '0.6rem'
      }}>
        <div style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Flame size={16} color="var(--accent-rose)" />
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{t.topDefect}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f43f5e' }}>{data.topDefect}</div>
          </div>
        </div>

        <div style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Trophy size={16} color="var(--accent-amber)" />
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{t.worstProduct}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b' }}>{data.worstProduct}</div>
          </div>
        </div>

        <div style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertOctagon size={16} color="var(--accent-cyan)" />
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{t.kpiNgRate}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{data.overallNGRate}%</div>
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        {displayedDefects.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
            {t.noDataTitle}
          </div>
        ) : (
          <Chart type="bar" data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};
