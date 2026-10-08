import React, { useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Gauge, SlidersHorizontal } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { PerformanceTrendItem } from '../types/dashboard';

interface PerformanceWidgetProps {
  lang: Language;
  data: PerformanceTrendItem[];
}

export const PerformanceWidget: React.FC<PerformanceWidgetProps> = ({ lang, data }) => {
  const t = translations[lang];
  const [metric, setMetric] = useState<'efficiency' | 'uph' | 'hours'>('efficiency');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area');

  const labels = data.map((d) => d.date);

  const getMetricData = () => {
    switch (metric) {
      case 'uph':
        return {
          label: 'UPH (Sản phẩm / Giờ công)',
          data: data.map((d) => d.uph),
          borderColor: '#06b6d4',
          bgColor: 'rgba(6, 182, 212, 0.25)',
          unit: 'pcs/h',
        };
      case 'hours':
        return {
          label: 'Giờ công (Working Hours)',
          data: data.map((d) => d.workingHours),
          borderColor: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.25)',
          unit: 'giờ/h',
        };
      case 'efficiency':
      default:
        return {
          label: 'Hiệu suất sản xuất (Efficiency %)',
          data: data.map((d) => d.efficiency),
          borderColor: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.25)',
          unit: '%',
        };
    }
  };

  const metricInfo = getMetricData();

  const chartData = {
    labels,
    datasets: [
      {
        label: metricInfo.label,
        data: metricInfo.data,
        borderColor: metricInfo.borderColor,
        backgroundColor: chartType === 'bar' ? metricInfo.borderColor : metricInfo.bgColor,
        fill: chartType === 'area',
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 4,
        borderRadius: chartType === 'bar' ? 4 : 0,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
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
          label: (context: any) => `${context.dataset.label}: ${context.raw} ${metricInfo.unit}`,
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
        ticks: {
          color: 'var(--text-dim)',
          font: { size: 10 },
          callback: (val: any) => `${val} ${metric === 'efficiency' ? '%' : ''}`,
        },
      },
    },
  };

  return (
    <div className="industrial-card widget-card-container">
      <div className="industrial-card-header">
        <div className="industrial-card-title">
          <Gauge size={18} color="var(--accent-cyan)" />
          <span>{t.performanceTrend}</span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {/* Metric Selector */}
          <select
            className="select-custom"
            value={metric}
            onChange={(e) => setMetric(e.target.value as any)}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          >
            <option value="efficiency">Hiệu suất (Efficiency %)</option>
            <option value="uph">Năng suất (UPH)</option>
            <option value="hours">Giờ công (Working Hours)</option>
          </select>

          {/* Chart Type Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <SlidersHorizontal size={13} color="var(--text-dim)" />
            <select
              className="select-custom"
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            >
              <option value="area">{t.area}</option>
              <option value="line">{t.line}</option>
              <option value="bar">Cột (Bar)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        {data.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
            {t.noDataTitle}
          </div>
        ) : chartType === 'bar' ? (
          <Bar data={chartData} options={options} />
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};
