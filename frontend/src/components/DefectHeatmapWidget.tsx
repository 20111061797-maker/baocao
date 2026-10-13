import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Grid, Flame, Trophy, AlertOctagon, SlidersHorizontal, Layers } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { DefectHeatmap } from '../types/dashboard';

interface DefectHeatmapWidgetProps {
  lang: Language;
  data: DefectHeatmap;
  onCellClick: (product: string, defectName: string) => void;
}

const PALETTE = [
  { bg: 'rgba(56, 189, 248, 0.85)', border: '#38bdf8' },   // Sky Cyan
  { bg: 'rgba(129, 140, 248, 0.85)', border: '#818cf8' },  // Indigo
  { bg: 'rgba(52, 211, 153, 0.85)', border: '#34d399' },   // Emerald
  { bg: 'rgba(251, 191, 36, 0.85)', border: '#fbbf24' },   // Amber
  { bg: 'rgba(244, 63, 94, 0.85)', border: '#f43f5e' },    // Rose
  { bg: 'rgba(192, 132, 252, 0.85)', border: '#c084fc' },  // Purple
  { bg: 'rgba(45, 212, 191, 0.85)', border: '#2dd4bf' },   // Teal
  { bg: 'rgba(251, 146, 60, 0.85)', border: '#fb923c' },   // Orange
  { bg: 'rgba(244, 114, 182, 0.85)', border: '#f472b6' },  // Pink
  { bg: 'rgba(163, 230, 53, 0.85)', border: '#a3e635' },   // Lime
  { bg: 'rgba(96, 165, 250, 0.85)', border: '#60a5fa' },   // Blue
];

export const DefectHeatmapWidget: React.FC<DefectHeatmapWidgetProps> = ({
  lang,
  data,
  onCellClick,
}) => {
  const t = translations[lang];

  // Default to ascending order (từ thấp đến cao từ trái qua phải) as requested
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  // Default to stacked bar chart (dưới dạng biểu đồ như Pareto)
  const [viewMode, setViewMode] = useState<'stacked' | 'grouped' | 'table'>('stacked');
  // Grouping dimension: by defect types or by products
  const [groupBy, setGroupBy] = useState<'defect' | 'product'>('defect');

  // Compute totals for each defect
  const defectTotals: Record<string, number> = {};
  data.defectTypes.forEach((dt) => {
    defectTotals[dt] = data.cells
      .filter((c) => c.defectNameVi === dt)
      .reduce((sum, c) => sum + c.quantity, 0);
  });

  // Compute totals for each product
  const productTotals: Record<string, number> = {};
  data.products.forEach((p) => {
    productTotals[p] = data.cells
      .filter((c) => c.product === p)
      .reduce((sum, c) => sum + c.quantity, 0);
  });

  const totalNG = Object.values(defectTotals).reduce((a, b) => a + b, 0);

  // Identify top defect and worst product
  let topDefect = 'None';
  let maxDefectQty = -1;
  Object.entries(defectTotals).forEach(([d, qty]) => {
    if (qty > maxDefectQty) {
      maxDefectQty = qty;
      topDefect = d;
    }
  });

  let worstProduct = 'None';
  let maxProdQty = -1;
  Object.entries(productTotals).forEach(([p, qty]) => {
    if (qty > maxProdQty) {
      maxProdQty = qty;
      worstProduct = p;
    }
  });

  // Sort defect types based on total quantity
  const sortedDefects = [...data.defectTypes].sort((a, b) => {
    const qtyA = defectTotals[a] || 0;
    const qtyB = defectTotals[b] || 0;
    return sortOrder === 'asc' ? qtyA - qtyB : qtyB - qtyA;
  });

  // Sort products based on total quantity
  const sortedProducts = [...data.products].sort((a, b) => {
    const qtyA = productTotals[a] || 0;
    const qtyB = productTotals[b] || 0;
    return sortOrder === 'asc' ? qtyA - qtyB : qtyB - qtyA;
  });

  // Build chart labels and datasets
  const isByDefect = groupBy === 'defect';
  const labels = isByDefect ? sortedDefects : sortedProducts;

  const datasets = isByDefect
    ? sortedProducts.map((p, idx) => {
        const color = PALETTE[idx % PALETTE.length];
        return {
          label: p,
          data: sortedDefects.map((d) => {
            const cell = data.cells.find((c) => c.product === p && c.defectNameVi === d);
            return cell ? cell.quantity : 0;
          }),
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 1,
          borderRadius: viewMode === 'stacked' ? 2 : 4,
          stack: viewMode === 'stacked' ? 'defects' : undefined,
        };
      })
    : sortedDefects.map((d, idx) => {
        const color = PALETTE[idx % PALETTE.length];
        return {
          label: d,
          data: sortedProducts.map((p) => {
            const cell = data.cells.find((c) => c.product === p && c.defectNameVi === d);
            return cell ? cell.quantity : 0;
          }),
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 1,
          borderRadius: viewMode === 'stacked' ? 2 : 4,
          stack: viewMode === 'stacked' ? 'products' : undefined,
        };
      });

  const chartData = {
    labels,
    datasets,
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0) {
        const el = elements[0];
        const datasetIndex = el.datasetIndex;
        const dataIndex = el.index;

        if (isByDefect) {
          const product = sortedProducts[datasetIndex];
          const defectName = sortedDefects[dataIndex];
          if (product && defectName) onCellClick(product, defectName);
        } else {
          const defectName = sortedDefects[datasetIndex];
          const product = sortedProducts[dataIndex];
          if (product && defectName) onCellClick(product, defectName);
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'var(--text-muted)',
          font: { size: 10, family: 'var(--font-sans)' },
          boxWidth: 10,
          padding: 8,
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
            const el = context[0];
            const datasetIndex = el.datasetIndex;
            const dataIndex = el.dataIndex;
            let p = '';
            let d = '';
            if (isByDefect) {
              p = sortedProducts[datasetIndex];
              d = sortedDefects[dataIndex];
            } else {
              d = sortedDefects[datasetIndex];
              p = sortedProducts[dataIndex];
            }
            const cell = data.cells.find((c) => c.product === p && c.defectNameVi === d);
            const rate = cell ? cell.defectRate : 0;
            return `\nTỷ lệ lỗi: ${rate}%\n(Nhấn để Drill-down & tạo 8D)`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'var(--text-dim)', font: { size: 9 }, maxRotation: 45 },
        stacked: viewMode === 'stacked',
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'var(--text-dim)', font: { size: 10 } },
        title: {
          display: true,
          text: 'Số lượng lỗi (pcs)',
          color: 'var(--text-dim)',
          font: { size: 10 },
        },
        stacked: viewMode === 'stacked',
      },
    },
  };

  const getHeatmapColor = (intensity: number, qty: number) => {
    if (qty === 0) return 'rgba(255, 255, 255, 0.02)';
    if (intensity < 0.25) return 'rgba(245, 158, 11, 0.25)'; // low warning amber
    if (intensity < 0.6) return 'rgba(249, 115, 22, 0.45)';  // medium orange
    if (intensity < 0.85) return 'rgba(244, 63, 94, 0.65)';  // high rose
    return 'rgba(225, 29, 72, 0.9)';                          // critical crimson
  };

  return (
    <div className="industrial-card widget-card-container">
      {/* Header with Title and Unified Controls */}
      <div className="industrial-card-header">
        <div className="industrial-card-title">
          <Grid size={18} color="var(--accent-amber)" />
          <span>{t.defectHeatmap}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <SlidersHorizontal size={13} color="var(--text-dim)" />
            {/* Sort Order Selector (Thấp -> Cao mặc định) */}
            <select
              className="select-custom"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              title="Thứ tự sắp xếp các cột"
            >
              <option value="asc">📈 Thấp → Cao (Từ trái qua phải)</option>
              <option value="desc">📉 Cao → Thấp</option>
            </select>
          </div>

          {/* Grouping Dimension */}
          <select
            className="select-custom"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            title="Nhóm theo"
          >
            <option value="defect">Phân bổ theo Loại lỗi</option>
            <option value="product">Phân bổ theo Sản phẩm</option>
          </select>

          {/* View Mode (Stacked / Grouped / Heatmap Table) */}
          <select
            className="select-custom"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            title="Kiểu hiển thị"
          >
            <option value="stacked">📊 Cột chồng (Stacked)</option>
            <option value="grouped">📊 Cột nhóm (Grouped)</option>
            <option value="table">▦ Bản đồ nhiệt (Heatmap)</option>
          </select>
        </div>
      </div>

      {/* Mini Quality / Defect KPIs Banner (matching QualityParetoWidget in Image 2) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.5rem',
          marginBottom: '0.6rem',
        }}
      >
        <div
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Flame size={16} color="var(--accent-rose)" />
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{t.topDefect}</div>
            <div
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#f43f5e',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '120px',
              }}
              title={topDefect}
            >
              {topDefect}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Trophy size={16} color="var(--accent-amber)" />
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{t.worstProduct}</div>
            <div
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#f59e0b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '120px',
              }}
              title={worstProduct}
            >
              {worstProduct}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <AlertOctagon size={16} color="var(--accent-cyan)" />
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{t.kpiTotalNG}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {totalNG.toLocaleString()} pcs
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Chart or Table View */}
      {viewMode === 'table' ? (
        <div
          className="mes-table-wrapper"
          style={{
            flex: 1,
            maxHeight: '100%',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            overflowX: 'auto',
            display: 'block',
          }}
        >
          <table className="mes-table">
            <thead>
              <tr>
                <th style={{ minWidth: '110px' }}>Sản phẩm \ Lỗi</th>
                {sortedDefects.map((dt) => (
                  <th
                    key={dt}
                    style={{ textAlign: 'center', fontSize: '0.72rem', padding: '0.4rem 0.5rem' }}
                  >
                    {dt}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((p) => (
                <tr key={p}>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                    {p}
                  </td>
                  {sortedDefects.map((dt) => {
                    const cell = data.cells.find((c) => c.product === p && c.defectNameVi === dt);
                    const qty = cell ? cell.quantity : 0;
                    const intensity = cell ? cell.intensity : 0;
                    const rate = cell ? cell.defectRate : 0;
                    const bg = getHeatmapColor(intensity, qty);

                    return (
                      <td
                        key={dt}
                        onClick={() => onCellClick(p, dt)}
                        title={`Sản phẩm: ${p}\nLỗi: ${dt}\nSố lượng NG: ${qty} pcs\nTỷ lệ lỗi: ${rate}%\n(Nhấn để Drill-down & tạo 8D)`}
                        style={{
                          textAlign: 'center',
                          backgroundColor: bg,
                          color: qty > 0 ? '#ffffff' : 'var(--text-dim)',
                          fontWeight: qty > 10 ? 700 : 500,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'transform 0.1s ease',
                        }}
                      >
                        {qty > 0 ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                            }}
                          >
                            <span>{qty}</span>
                            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>{rate}%</span>
                          </div>
                        ) : (
                          <span style={{ opacity: 0.2 }}>-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-wrapper">
          {labels.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-dim)',
              }}
            >
              {t.noDataTitle}
            </div>
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      )}
    </div>
  );
};
