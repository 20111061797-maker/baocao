import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { InventoryAuditResponse, InventoryStageGroup } from '../types/dashboard';

interface InventoryWidgetProps {
  onOpenFullAudit: () => void;
  refreshTrigger?: number;
}

export const InventoryWidget: React.FC<InventoryWidgetProps> = ({ onOpenFullAudit, refreshTrigger }) => {
  const [data, setData] = useState<InventoryAuditResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeStage, setActiveStage] = useState<string>('LẮP RÁP D6');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.getInventoryAudit()
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => console.error('Error fetching inventory widget:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  if (loading || !data) {
    return (
      <div className="industrial-card" style={{ padding: '1rem', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Đang nạp dữ liệu kiểm kê 4 công đoạn...</div>
      </div>
    );
  }

  const { summary, stageGroups, items } = data;
  const currentItems = items.filter((x) => x.stage === activeStage);
  const shortageItems = items.filter((x) => x.discrepancy < 0);

  return (
    <div className="industrial-card" style={{ padding: '1rem' }}>
      {/* Widget Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}
          >
            <Boxes size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                ĐỐI SOÁT KIỂM KÊ VẬT TƯ & BÁN THÀNH PHẨM (KIỂM KÊ D6)
              </h3>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
                4 TABS / 104 MÃ
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0 }}>
              Cập nhật đồng bộ trực tiếp từ file <code style={{ color: 'var(--accent-cyan)' }}>KIỂM KÊ D6(1111).xlsx</code>
            </p>
          </div>
        </div>

        <button
          className="btn-secondary"
          onClick={onOpenFullAudit}
          style={{ fontSize: '0.76rem', padding: '0.4rem 0.75rem', color: 'var(--accent-cyan)', borderColor: 'rgba(6, 182, 212, 0.3)' }}
        >
          <span>Mở Chi Tiết Đầy Đủ 4 Tabs</span>
          <ExternalLink size={13} />
        </button>
      </div>

      {/* 4 Stage Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.6rem',
          marginBottom: '0.85rem'
        }}
      >
        {stageGroups.map((stg) => {
          const isSelected = activeStage === stg.name;
          const hasShortage = stg.shortageCount > 0;
          const hasNG = stg.ngCount > 0;

          return (
            <div
              key={stg.name}
              onClick={() => setActiveStage(stg.name)}
              style={{
                padding: '0.75rem',
                borderRadius: '10px',
                background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-input)',
                border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-main)' }}>
                  {stg.name}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', background: 'var(--bg-main)', padding: '1px 6px', borderRadius: '999px' }}>
                  {stg.itemCount} mã
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.7rem' }}>
                {hasShortage ? (
                  <span style={{ color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    <AlertTriangle size={12} /> {stg.shortageCount} mã thiếu / âm
                  </span>
                ) : (
                  <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    <CheckCircle2 size={12} /> Khớp / Dư
                  </span>
                )}

                {hasNG && (
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                    | {stg.ngCount} mã có NG
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Phân khu: {stg.sections.join(', ')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Preview Table of Active Stage */}
      <div style={{ border: '1px solid var(--border-card)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-main)' }}>
            <FileSpreadsheet size={14} color="var(--accent-cyan)" />
            <span>Xem trước công đoạn: <strong style={{ color: 'var(--accent-cyan)' }}>{activeStage}</strong> ({currentItems.length} mã liệu)</span>
          </div>

          <button
            onClick={onOpenFullAudit}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}
          >
            <span>Xem toàn bộ cột WIP</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="mes-table-wrapper" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <table className="mes-table" style={{ fontSize: '0.74rem' }}>
            <thead>
              <tr>
                <th style={{ width: '35px' }}>#</th>
                <th>Phân khu</th>
                <th>Mã liệu (料号)</th>
                <th style={{ textAlign: 'right' }}>Cần kiểm</th>
                <th style={{ textAlign: 'right' }}>Kho</th>
                <th style={{ textAlign: 'right' }}>Ngoài chuyền</th>
                <th style={{ textAlign: 'right' }}>Chênh lệch (差异)</th>
                <th style={{ textAlign: 'right' }}>NG</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.slice(0, 8).map((item, idx) => {
                const isNeg = item.discrepancy < 0;
                return (
                  <tr key={idx} style={{ background: isNeg ? 'rgba(239, 68, 68, 0.08)' : undefined }}>
                    <td style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>{idx + 1}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.section}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isNeg ? '#ef4444' : 'var(--text-main)' }}>
                      {item.materialCode}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {item.auditRequired > 0 ? item.auditRequired.toLocaleString() : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {item.rawMaterialWarehouse > 0 ? item.rawMaterialWarehouse.toLocaleString() : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {item.rawMaterialLine > 0 ? item.rawMaterialLine.toLocaleString() : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isNeg ? '#ef4444' : item.discrepancy > 0 ? 'var(--accent-cyan)' : '#10b981' }}>
                      {isNeg ? (
                        <span style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                          {item.discrepancy}
                        </span>
                      ) : (
                        item.discrepancy > 0 ? `+${item.discrepancy.toLocaleString()}` : '0'
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: item.ngQuantity > 0 ? '#f59e0b' : 'var(--text-dim)' }}>
                      {item.ngQuantity > 0 ? item.ngQuantity : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
