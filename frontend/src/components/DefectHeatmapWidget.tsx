import React from 'react';
import { Grid, Flame } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { DefectHeatmap } from '../types/dashboard';

interface DefectHeatmapWidgetProps {
  lang: Language;
  data: DefectHeatmap;
  onCellClick: (product: string, defectName: string) => void;
}

export const DefectHeatmapWidget: React.FC<DefectHeatmapWidgetProps> = ({
  lang,
  data,
  onCellClick,
}) => {
  const t = translations[lang];

  const getHeatmapColor = (intensity: number, qty: number) => {
    if (qty === 0) return 'rgba(255, 255, 255, 0.02)';
    if (intensity < 0.25) return 'rgba(245, 158, 11, 0.25)'; // low warning amber
    if (intensity < 0.6) return 'rgba(249, 115, 22, 0.45)';  // medium orange
    if (intensity < 0.85) return 'rgba(244, 63, 94, 0.65)';  // high rose
    return 'rgba(225, 29, 72, 0.9)';                          // critical crimson
  };

  return (
    <div className="industrial-card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '100%', width: '100%', overflow: 'hidden' }}>
      <div className="industrial-card-header">
        <div className="industrial-card-title">
          <Grid size={18} color="var(--accent-amber)" />
          <span>{t.defectHeatmap}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <span style={{ width: '10px', height: '10px', background: 'rgba(245, 158, 11, 0.3)', borderRadius: '2px' }} />
            Thấp
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <span style={{ width: '10px', height: '10px', background: 'rgba(249, 115, 22, 0.55)', borderRadius: '2px' }} />
            TB
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <span style={{ width: '10px', height: '10px', background: 'rgba(225, 29, 72, 0.9)', borderRadius: '2px' }} />
            Cao (Critical)
          </span>
        </div>
      </div>

      <div className="mes-table-wrapper" style={{ maxHeight: '360px', width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'auto', display: 'block' }}>
        <table className="mes-table">
          <thead>
            <tr>
              <th style={{ minWidth: '130px' }}>Sản phẩm \ Lỗi</th>
              {data.defectTypes.map((dt) => (
                <th key={dt} style={{ textAlign: 'center', fontSize: '0.75rem', padding: '0.5rem 0.6rem' }}>
                  {dt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.products.map((p) => {
              return (
                <tr key={p}>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                    {p}
                  </td>
                  {data.defectTypes.map((dt) => {
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
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
