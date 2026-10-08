import React, { useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Layers, SlidersHorizontal } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { ProductionByProductItem } from '../types/dashboard';

interface ProductionByProductWidgetProps {
  lang: Language;
  data: ProductionByProductItem[];
  onDrillDownProduct: (product: string) => void;
}

export const ProductionByProductWidget: React.FC<ProductionByProductWidgetProps> = ({
  lang,
  data,
  onDrillDownProduct,
}) => {
  const t = translations[lang];
  const [chartType, setChartType] = useState<'horizontal' | 'column' | 'line' | 'stacked'>('horizontal');

  const labels = data.map((d) => `${d.product} (${d.productNameVi})`);

  const chartData = {
    labels,
    datasets: [
      {
        label: `${t.kpiPlan} (Plan)`,
        data: data.map((d) => d.planned),
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4,
        stack: chartType === 'stacked' ? 'stack1' : undefined,
      },
      {
        label: `${t.kpiActual} (Actual)`,
        data: data.map((d) => d.actual),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 4,
        stack: chartType === 'stacked' ? 'stack1' : undefined,
      },
    ],
  };

  const isHorizontal = chartType === 'horizontal';

  const options: any = {
    indexAxis: isHorizontal ? ('y' as const) : ('x' as const),
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const item = data[index];
        if (item) onDrillDownProduct(item.product);
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
            const sign = gap > 0 ? '+' : '';
            return `\nGap: ${sign}${gap.toLocaleString()} pcs\nĐạt: ${item.achievementRate}%\nUPH: ${item.uph} | Hiệu suất: ${item.efficiency}%`;
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
      },
    },
  };

  return (
    <div className="industrial-card widget-card-container">
      <div className="industrial-card-header">
        <div className="industrial-card-title">
          <Layers size={18} color="var(--accent-emerald)" />
          <span>{t.productionByProduct}</span>
        </div>

        {/* Chart Type Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <SlidersHorizontal size={13} color="var(--text-dim)" />
          <select
            className="select-custom"
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          >
            <option value="horizontal">Cột ngang (Horizontal Bar)</option>
            <option value="column">Cột đứng (Column)</option>
            <option value="line">{t.line}</option>
            <option value="stacked">{t.stackedBar}</option>
          </select>
        </div>
      </div>

      <div className="chart-wrapper">
        {data.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
            {t.noDataTitle}
          </div>
        ) : chartType === 'line' ? (
          <Line data={chartData} options={options} />
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};
