import React, { useEffect, useState } from 'react';
import { X, Search, FileText, AlertTriangle, Clock, Layers, Edit2, Trash2, Plus, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { DrillDownData, ProductMatrixRow } from '../types/dashboard';
import { ProductionCrudContext } from './ProductionCrudModal';

interface DrillDownModalProps {
  type: string;
  drillKey: string;
  onClose: () => void;
  onCreate8D: (product: string, defectType?: string) => void;
  onEditRecord?: (recordId: number) => void;
  onCreateRecord?: (context: ProductionCrudContext) => void;
  onDataChanged?: () => void;
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
  type,
  drillKey,
  onClose,
  onCreate8D,
  onEditRecord,
  onCreateRecord,
  onDataChanged,
}) => {
  const [data, setData] = useState<DrillDownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchDrillData = () => {
    setLoading(true);
    api.getDrillDown(type, drillKey)
      .then((res) => {
        setData(res);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDrillData();
  }, [type, drillKey]);

  const handleDeleteRecord = async (row: ProductMatrixRow) => {
    const desc = `${row.date} - ${row.product} (${row.shift || 'Ca Ngày'})`;
    if (!window.confirm(`Xác nhận xóa bản ghi sản xuất:\n${desc}\n\nThao tác này sẽ xóa vĩnh viễn dữ liệu khỏi hệ thống!`)) {
      return;
    }

    try {
      setDeletingId(row.id);
      await api.deleteProductionRecord(row.id);
      fetchDrillData();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Lỗi khi xóa bản ghi');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateNew = () => {
    if (onCreateRecord) {
      onCreateRecord({
        product: type === 'product' ? drillKey : undefined,
        date: type === 'date' ? drillKey : undefined,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '950px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Search size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {data?.title || `Phân tích chi tiết: ${drillKey}`}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {onCreateRecord && (
              <button
                type="button"
                onClick={handleCreateNew}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#10b981',
                  cursor: 'pointer',
                }}
                title="Thêm bản ghi sản xuất mới"
              >
                <Plus size={13} />
                <span>Thêm bản ghi</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>
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
                  const pCode = type === 'product' ? drillKey : (data.records?.[0]?.product || '喇叭');
                  const dName = type === 'defect' ? drillKey : undefined;
                  onCreate8D(pCode, dName);
                }}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                <FileText size={14} />
                <span>Tạo báo cáo 4D/8D từ mục này</span>
              </button>
            </div>

            {/* Detailed Records Table with Direct Edit / Delete Actions */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={15} color="var(--accent-cyan)" /> Danh sách bản ghi & Thao tác dữ liệu:
                </h3>
                {onCreateRecord && (
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={11} /> Thêm bản ghi mới
                  </button>
                )}
              </div>

              {(!data.records || data.records.length === 0) ? (
                <div style={{
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: 'var(--bg-input)',
                  borderRadius: '6px',
                  border: '1px dashed var(--border-subtle)',
                  fontSize: '0.82rem',
                  color: 'var(--text-dim)',
                }}>
                  Chưa có bản ghi sản xuất chi tiết được lưu cho mục này.
                  {onCreateRecord && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        className="btn-primary"
                        onClick={handleCreateNew}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                      >
                        <Plus size={12} /> Nhập bản ghi mới ngay
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                  <table className="mes-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Sản phẩm</th>
                        <th>Ca</th>
                        <th style={{ textAlign: 'right' }}>Kế hoạch</th>
                        <th style={{ textAlign: 'right' }}>Thực tế</th>
                        <th style={{ textAlign: 'right' }}>Đạt %</th>
                        <th style={{ textAlign: 'right' }}>UPH</th>
                        <th style={{ textAlign: 'right' }}>Tổng NG</th>
                        <th style={{ textAlign: 'center', width: '90px' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.records.map((r) => {
                        const isAchieved = r.achievement >= 100;
                        return (
                          <tr key={r.id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                              {r.date}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{r.product}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: '4px' }}>
                                ({r.productNameVi})
                              </span>
                            </td>
                            <td style={{ fontSize: '0.72rem' }}>{r.shift || 'Ca Ngày'}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                              {r.plan.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              {r.actual.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span style={{
                                color: isAchieved ? '#10b981' : '#f43f5e',
                                fontWeight: 600,
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                              }}>
                                {r.achievement}%
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                              {r.uph}
                            </td>
                            <td style={{
                              textAlign: 'right',
                              fontFamily: 'var(--font-mono)',
                              color: r.totalNG > 0 ? '#f43f5e' : 'var(--text-dim)',
                            }}>
                              {r.totalNG}
                            </td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {onEditRecord && (
                                  <button
                                    type="button"
                                    onClick={() => onEditRecord(r.id)}
                                    style={{
                                      background: 'rgba(56, 189, 248, 0.15)',
                                      border: '1px solid rgba(56, 189, 248, 0.35)',
                                      color: '#38bdf8',
                                      padding: '3px 6px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                      fontSize: '0.7rem',
                                    }}
                                    title="Sửa bản ghi này"
                                  >
                                    <Edit2 size={11} /> Sửa
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(r)}
                                  disabled={deletingId === r.id}
                                  style={{
                                    background: 'rgba(244, 63, 94, 0.15)',
                                    border: '1px solid rgba(244, 63, 94, 0.35)',
                                    color: '#f43f5e',
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    cursor: deletingId === r.id ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    fontSize: '0.7rem',
                                  }}
                                  title="Xóa bản ghi này"
                                >
                                  <Trash2 size={11} /> Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
                  {data.relatedNotes
                    .map((note) => note.replace(/<!--DEFECT_META:.*?-->/g, '').trim())
                    .filter((note) => note.length > 0)
                    .map((cleanNote, idx) => (
                      <li key={idx}>{cleanNote}</li>
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

