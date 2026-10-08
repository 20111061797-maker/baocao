import React, { useEffect, useState } from 'react';
import { X, Search, FileText, AlertTriangle, Clock, Layers } from 'lucide-react';
import { api } from '../services/api';
import { DrillDownData } from '../types/dashboard';

interface DrillDownModalProps {
  type: string;
  drillKey: string;
  onClose: () => void;
  onCreate8D: (product: string, defectType?: string) => void;
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
  type,
  drillKey,
  onClose,
  onCreate8D,
}) => {
  const [data, setData] = useState<DrillDownData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.getDrillDown(type, drillKey)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [type, drillKey]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Search size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {data?.title || `Phân tích chi tiết: ${drillKey}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            Đang truy xuất dữ liệu phân tích chi tiết...
          </div>
        ) : !data ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            Không tìm thấy dữ liệu chi tiết.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Quick Metrics Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Tổng Sản Lượng</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#3b82f6', fontFamily: 'var(--font-mono)' }}>
                  {data.totalProduction.toLocaleString()} pcs
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Tổng Phế Phẩm (NG)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>
                  {data.totalNG.toLocaleString()} pcs
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Tỷ Lệ Lỗi (NG Rate)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
                  {data.ngRate}%
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Tổng Thời Gian Dừng</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  {data.totalDowntime} phút
                </div>
              </div>
            </div>

            {/* Action Bar: Create 8D from this defect/product */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#f59e0b' }}>
                <AlertTriangle size={16} />
                <span>Phát hiện sự cố bất thường? Khởi tạo quy trình giải quyết vấn đề với bằng chứng thực tế:</span>
              </div>
              <button
                className="btn-primary"
                onClick={() => {
                  onClose();
                  const pCode = type === 'product' ? drillKey : (data.records[0]?.product || '喇叭');
                  const dName = type === 'defect' ? drillKey : undefined;
                  onCreate8D(pCode, dName);
                }}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                <FileText size={14} />
                <span>Tạo báo cáo 4D/8D từ mục này</span>
              </button>
            </div>

            {/* Defect Breakdown table if available */}
            {data.defectBreakdown && data.defectBreakdown.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={15} color="var(--accent-rose)" /> Phân bổ lỗi chi tiết:
                </h3>
                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  <table className="mes-table">
                    <thead>
                      <tr>
                        <th>Hạng mục lỗi</th>
                        <th style={{ textAlign: 'right' }}>Số lượng NG</th>
                        <th style={{ textAlign: 'right' }}>Tỷ trọng %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.defectBreakdown.map((df) => (
                        <tr key={df.defectKey}>
                          <td style={{ fontWeight: 600 }}>{df.defectNameVi}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#f43f5e' }}>{df.quantity} pcs</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{df.percentage || '-'}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Downtime Breakdown if available */}
            {data.downtimeBreakdown && data.downtimeBreakdown.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={15} color="var(--accent-amber)" /> Nguyên nhân dừng máy phát sinh:
                </h3>
                <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  <table className="mes-table">
                    <thead>
                      <tr>
                        <th>Lý do dừng máy</th>
                        <th style={{ textAlign: 'right' }}>Thời gian dừng (phút)</th>
                        <th style={{ textAlign: 'right' }}>Tỷ trọng %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.downtimeBreakdown.map((dt) => (
                        <tr key={dt.reason}>
                          <td>{dt.reason}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>{dt.minutes} phút</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{dt.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notes if available */}
            {data.relatedNotes && data.relatedNotes.length > 0 && (
              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Ghi chú sản xuất thực tế: </span>
                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.3rem', color: 'var(--text-dim)' }}>
                  {data.relatedNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
