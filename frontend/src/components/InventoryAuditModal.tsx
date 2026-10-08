import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Boxes,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Layers,
  FileSpreadsheet,
  Filter,
  PackageCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../services/api';
import {
  InventoryAuditItem,
  InventoryAuditResponse,
  InventoryStageGroup
} from '../types/dashboard';

interface InventoryAuditModalProps {
  onClose: () => void;
}

export const InventoryAuditModal: React.FC<InventoryAuditModalProps> = ({ onClose }) => {
  const [data, setData] = useState<InventoryAuditResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'shortage' | 'ng' | 'surplus' | 'balanced'>('all');

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const res = await api.getInventoryAudit({
        stage: selectedStage === 'all' ? undefined : selectedStage,
        section: selectedSection === 'all' ? undefined : selectedSection,
        statusFilter: statusFilter === 'all' ? undefined : statusFilter
      });
      setData(res);
    } catch (err) {
      console.error('Error fetching inventory audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [selectedStage, selectedSection, statusFilter]);

  // Reset section when stage changes
  const handleStageChange = (stageName: string) => {
    setSelectedStage(stageName);
    setSelectedSection('all');
  };

  // Get available sub-sections for selected stage
  const currentStageGroup = useMemo(() => {
    if (!data?.stageGroups) return null;
    return data.stageGroups.find((g) => g.name === selectedStage);
  }, [data?.stageGroups, selectedStage]);

  // Client-side search filtering
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (!searchTerm.trim()) return data.items;
    const term = searchTerm.toLowerCase().trim();
    return data.items.filter(
      (item) =>
        item.materialCode.toLowerCase().includes(term) ||
        item.section.toLowerCase().includes(term) ||
        item.stage.toLowerCase().includes(term)
    );
  }, [data?.items, searchTerm]);

  // Export full multi-sheet Excel file matching factory layout
  const handleExportFullExcel = () => {
    if (!data?.items) return;
    const wb = XLSX.utils.book_new();

    // 1. Overview sheet
    const summaryRows = [
      { 'CHỈ SỐ KIỂM KÊ D6': 'Tổng số mã liệu đối soát', 'GIÁ TRỊ': data.summary.totalItems },
      { 'CHỈ SỐ KIỂM KÊ D6': 'Số mã liệu cân bằng (Chênh lệch = 0)', 'GIÁ TRỊ': data.summary.balancedItems },
      { 'CHỈ SỐ KIỂM KÊ D6': 'Số mã liệu thừa hàng (Chênh lệch > 0)', 'GIÁ TRỊ': data.summary.surplusItems },
      { 'CHỈ SỐ KIỂM KÊ D6': 'Số mã liệu thiếu hụt / âm kho (Chênh lệch < 0)', 'GIÁ TRỊ': data.summary.shortageItems },
      { 'CHỈ SỐ KIỂM KÊ D6': 'Số mã liệu có phát sinh NG', 'GIÁ TRỊ': data.summary.totalNGItems },
      { 'CHỈ SỐ KIỂM KÊ D6': 'Tổng lượng Cần kiểm (应盘)', 'GIÁ TRỊ': data.summary.totalAuditRequired },
      { 'CHỈ SỐ KIỂM KÊ D6': 'Tổng tồn kho nguyên liệu (Kho)', 'GIÁ TRỊ': data.summary.totalRawWarehouse },
      { 'CHỈ SỐ KIỂM KÊ D6': 'Tổng nguyên liệu Ngoài chuyền', 'GIÁ TRỊ': data.summary.totalRawLine },
      { 'CHỈ SỐ KIỂM KÊ D6': 'Tổng Bán thành phẩm (WIP)', 'GIÁ TRỊ': data.summary.totalSemiFinished },
      { 'CHỈ SỐ KIỂM KÊ D6': 'Tổng Thành phẩm hoàn tất', 'GIÁ TRỊ': data.summary.totalFinishedGoods },
      { 'CHỈ SỐ KIỂM KÊ D6': 'Tổng số lượng Phế phẩm (NG)', 'GIÁ TRỊ': data.summary.totalNG },
      { 'CHỈ SỐ KIỂM KÊ D6': 'Tổng chênh lệch ròng (Net Discrepancy)', 'GIÁ TRỊ': data.summary.totalDiscrepancy }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'TỔNG HỢP KIỂM KÊ');

    // 2. Individual stage sheets
    const stageNames = ['SPK,MIC D6', 'ĐAI ĐẦU D6', 'LẮP RÁP D6', 'ĐÓNG GÓI D6'];
    stageNames.forEach((sName) => {
      const stageItems = data.items.filter((x) => x.stage === sName);
      if (stageItems.length > 0) {
        let exportRows: any[] = [];
        if (sName === 'ĐÓNG GÓI D6') {
          exportRows = stageItems.map((item) => ({
            'Mã liệu (料号)': item.materialCode,
            'Cần kiểm (应盘)': item.auditRequired,
            'Kho': item.rawMaterialWarehouse,
            'Ngoài chuyền': item.rawMaterialLine,
            'Thành Phẩm': item.finishedGoods,
            'Chênh lệch (差异)': item.discrepancy
          }));
        } else if (sName === 'LẮP RÁP D6') {
          exportRows = stageItems.map((item) => ({
            'Mã liệu (料号)': item.materialCode,
            'Lượng dùng': item.usagePerUnit,
            'Cần kiểm (应盘)': item.auditRequired,
            'Kho': item.rawMaterialWarehouse,
            'Ngoài chuyền': item.rawMaterialLine,
            'Đã lắp MIC (左耳)': item.semiFinishedGoods,
            'Bán thành phẩm (待入库)': item.semiFinishedGoods2,
            'Phòng sửa hàng (维修房)': item.repairRoom,
            'D6 FA (FA D6)': item.failureAnalysisFa,
            'Chênh lệch (差异)': item.discrepancy,
            'NG': item.ngQuantity
          }));
        } else {
          exportRows = stageItems.map((item) => ({
            'Phân khu (Section)': item.section,
            'Mã liệu (料号)': item.materialCode,
            'Lượng dùng': item.usagePerUnit,
            'Cần kiểm (应盘)': item.auditRequired,
            'Kho': item.rawMaterialWarehouse,
            'Ngoài chuyền': item.rawMaterialLine,
            'Bán thành phẩm 1': item.semiFinishedGoods,
            'Bán thành phẩm 2': item.semiFinishedGoods2,
            'Thành Phẩm': item.finishedGoods,
            'Chênh lệch (差异)': item.discrepancy,
            'NG': item.ngQuantity
          }));
        }
        const wsStage = XLSX.utils.json_to_sheet(exportRows);
        // Clean sheet title for Excel limits
        const safeSheetName = sName.replace(/[,\/\*\?:]/g, '_').slice(0, 31);
        XLSX.utils.book_append_sheet(wb, wsStage, safeSheetName);
      }
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `KIEM_KE_D6_FULL_${dateStr}.xlsx`);
  };

  const summary = data?.summary;
  const stageGroups: InventoryStageGroup[] = data?.stageGroups || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1280px',
          width: '96vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem',
          gap: '1rem',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-card), 0 25px 50px -12px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* 1. Modal Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            borderBottom: '1px solid var(--border-card)',
            paddingBottom: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: 'var(--shadow-glow-cyan)',
                  flexShrink: 0
                }}
              >
                <Boxes size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
                  <h2
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      color: 'var(--text-main)',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    KIỂM KÊ VẬT TƯ & BÁN THÀNH PHẨM D6
                  </h2>
                </div>
                <p
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-dim)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Đối soát 4 công đoạn: SPK/MIC, Đai đầu, Lắp ráp, Đóng gói
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Sub Header Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(6, 182, 212, 0.15)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(6, 182, 212, 0.3)'
              }}
            >
              104 MÃ LIỆU • 4 TABS CÔNG ĐOẠN (EXCEL D6)
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                className="btn-secondary"
                onClick={fetchAuditData}
                disabled={loading}
                title="Làm mới dữ liệu"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
              >
                <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                <span>Làm mới</span>
              </button>

              <button
                className="btn-secondary"
                onClick={handleExportFullExcel}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.72rem',
                  color: '#10b981',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                  background: 'rgba(16, 185, 129, 0.08)'
                }}
              >
                <FileSpreadsheet size={14} />
                <span>Xuất Excel (4 Tabs)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Top KPI Cards */}
        {summary && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.6rem'
            }}
          >
            <div
              className="industrial-card"
              style={{
                padding: '0.65rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem'
              }}
            >
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                TỔNG MÃ LIỆU
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  {summary.totalItems}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>mã</span>
              </div>
            </div>

            <div
              className="industrial-card"
              onClick={() => setStatusFilter(statusFilter === 'shortage' ? 'all' : 'shortage')}
              style={{
                padding: '0.65rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                cursor: 'pointer',
                border: statusFilter === 'shortage' ? '1px solid #ef4444' : undefined,
                background: statusFilter === 'shortage' ? 'rgba(239, 68, 68, 0.12)' : undefined
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>
                  🚨 THIẾU HỤT / ÂM KHO
                </span>
                {summary.shortageItems > 0 && (
                  <span className="live-dot" style={{ background: '#ef4444' }} />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                  {summary.shortageItems}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>mã âm</span>
              </div>
            </div>

            <div
              className="industrial-card"
              onClick={() => setStatusFilter(statusFilter === 'ng' ? 'all' : 'ng')}
              style={{
                padding: '0.65rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                cursor: 'pointer',
                border: statusFilter === 'ng' ? '1px solid #f59e0b' : undefined,
                background: statusFilter === 'ng' ? 'rgba(245, 158, 11, 0.12)' : undefined
              }}
            >
              <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>
                ⚠️ PHÁT SINH LỖI NG
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                  {summary.totalNGItems}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  mã ({summary.totalNG.toLocaleString()} pcs)
                </span>
              </div>
            </div>

            <div
              className="industrial-card"
              onClick={() => setStatusFilter(statusFilter === 'surplus' ? 'all' : 'surplus')}
              style={{
                padding: '0.65rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                cursor: 'pointer',
                border: statusFilter === 'surplus' ? '1px solid var(--accent-cyan)' : undefined
              }}
            >
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                📈 DƯ THỪA (+DIFF)
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  {summary.surplusItems}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>mã</span>
              </div>
            </div>

            <div
              className="industrial-card"
              onClick={() => setStatusFilter(statusFilter === 'balanced' ? 'all' : 'balanced')}
              style={{
                padding: '0.65rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                cursor: 'pointer',
                border: statusFilter === 'balanced' ? '1px solid #10b981' : undefined
              }}
            >
              <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                ✅ KHỚP CHUẨN (=0)
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                  {summary.balancedItems}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>mã</span>
              </div>
            </div>

            <div
              className="industrial-card"
              style={{
                padding: '0.65rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem'
              }}
            >
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                TỔNG CẦN KIỂM (应盘)
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  {summary.totalAuditRequired.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>pcs</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Primary Excel Stage Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              overflowX: 'auto',
              paddingBottom: '4px',
              borderBottom: '2px solid var(--border-card)',
              scrollbarWidth: 'none'
            }}
          >
            {/* All Tabs Button */}
            <button
              onClick={() => handleStageChange('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.9rem',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                borderBottom: selectedStage === 'all' ? '3px solid var(--accent-cyan)' : '3px solid transparent',
                background: selectedStage === 'all' ? 'var(--bg-card-hover)' : 'transparent',
                color: selectedStage === 'all' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontWeight: selectedStage === 'all' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Layers size={15} />
              <span>TẤT CẢ CÔNG ĐOẠN</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: 'var(--bg-main)',
                  color: 'var(--text-dim)'
                }}
              >
                {summary?.totalItems || 0}
              </span>
            </button>

            {/* Individual Stage Tabs */}
            {stageGroups.map((stage) => {
              const isActive = selectedStage === stage.name;
              const hasShortage = stage.shortageCount > 0;
              const hasNG = stage.ngCount > 0;

              return (
                <button
                  key={stage.name}
                  onClick={() => handleStageChange(stage.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: '8px 8px 0 0',
                    border: 'none',
                    borderBottom: isActive ? '3px solid var(--accent-cyan)' : '3px solid transparent',
                    background: isActive ? 'var(--bg-card-hover)' : 'transparent',
                    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FileSpreadsheet size={15} color={isActive ? 'var(--accent-cyan)' : undefined} />
                  <span>{stage.name}</span>

                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      background: 'var(--bg-main)',
                      color: 'var(--text-dim)'
                    }}
                  >
                    {stage.itemCount}
                  </span>

                  {hasShortage && (
                    <span
                      title={`${stage.shortageCount} mã thiếu hụt / âm kho`}
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: '#ef4444',
                        color: '#ffffff'
                      }}
                    >
                      -{stage.shortageCount} âm
                    </span>
                  )}

                  {hasNG && (
                    <span
                      title={`${stage.ngCount} mã có lỗi NG`}
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245, 158, 11, 0.4)'
                      }}
                    >
                      NG:{stage.ngCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-sections if stage has multiple sections (e.g. SPK vs MIC, ĐAI ĐẦU vs DÂY D6) */}
          {currentStageGroup && currentStageGroup.sections.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.5rem',
                background: 'var(--bg-main)',
                borderRadius: '8px',
                fontSize: '0.75rem'
              }}
            >
              <span style={{ color: 'var(--text-dim)', fontWeight: 600, marginRight: '4px' }}>
                Phân khu / Mục:
              </span>
              <button
                className={`chart-type-chip ${selectedSection === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedSection('all')}
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              >
                Tất cả các mục ({currentStageGroup.sections.length})
              </button>
              {currentStageGroup.sections.map((sec) => (
                <button
                  key={sec}
                  className={`chart-type-chip ${selectedSection === sec ? 'active' : ''}`}
                  onClick={() => setSelectedSection(sec)}
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                >
                  {sec}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Controls, Status Filter Chips & Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem',
            flexWrap: 'wrap'
          }}
        >
          {/* Status Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              Bộ lọc đối soát:
            </span>
            <button
              className={`chart-type-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
            >
              Tất cả ({data?.summary?.totalItems || 0})
            </button>
            <button
              className={`chart-type-chip ${statusFilter === 'shortage' ? 'active' : ''}`}
              onClick={() => setStatusFilter('shortage')}
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                color: statusFilter === 'shortage' ? '#ffffff' : '#ef4444',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                background: statusFilter === 'shortage' ? '#ef4444' : undefined
              }}
            >
              🚨 Thiếu hụt / Âm ({data?.summary?.shortageItems || 0})
            </button>
            <button
              className={`chart-type-chip ${statusFilter === 'ng' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ng')}
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                color: statusFilter === 'ng' ? '#ffffff' : '#f59e0b',
                borderColor: 'rgba(245, 158, 11, 0.4)',
                background: statusFilter === 'ng' ? '#f59e0b' : undefined
              }}
            >
              ⚠️ Có phế phẩm NG ({data?.summary?.totalNGItems || 0})
            </button>
            <button
              className={`chart-type-chip ${statusFilter === 'surplus' ? 'active' : ''}`}
              onClick={() => setStatusFilter('surplus')}
              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
            >
              📈 Dư thừa (+) ({data?.summary?.surplusItems || 0})
            </button>
            <button
              className={`chart-type-chip ${statusFilter === 'balanced' ? 'active' : ''}`}
              onClick={() => setStatusFilter('balanced')}
              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
            >
              ✅ Cân bằng ({data?.summary?.balancedItems || 0})
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '9px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)'
              }}
            />
            <input
              type="text"
              placeholder="Tìm mã liệu (料号), phân khu..."
              className="select-custom"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: '28px',
                paddingRight: '8px',
                width: '100%',
                fontSize: '0.75rem',
                borderRadius: '8px'
              }}
            />
          </div>
        </div>

        {/* 5. Inventory Table with Custom Stage-Aware Layout */}
        <div
          className="mes-table-wrapper"
          style={{
            flex: 1,
            maxHeight: '52vh',
            overflowY: 'auto',
            border: '1px solid var(--border-card)',
            borderRadius: '10px'
          }}
        >
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
              <div>Đang tải dữ liệu kiểm kê 4 công đoạn...</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              <AlertCircle size={28} style={{ color: 'var(--text-dim)', marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                Không tìm thấy mã liệu nào khớp với điều kiện lọc hiện tại.
              </div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                Vui lòng thử chọn trạng thái khác hoặc xóa từ khóa tìm kiếm.
              </div>
            </div>
          ) : (
            <table className="mes-table" style={{ fontSize: '0.76rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  {selectedStage === 'all' && <th>Công đoạn (Tab)</th>}
                  <th>Phân khu (Section)</th>
                  <th style={{ position: 'sticky', left: 0, zIndex: 2, background: 'var(--bg-card)' }}>
                    Mã liệu (料号)
                  </th>
                  {selectedStage !== 'ĐÓNG GÓI D6' && (
                    <th style={{ textAlign: 'right' }}>Lượng dùng</th>
                  )}
                  <th style={{ textAlign: 'right', color: 'var(--accent-blue)' }}>Cần kiểm (应盘)</th>
                  <th style={{ textAlign: 'right' }}>Kho (原料)</th>
                  <th style={{ textAlign: 'right' }}>Ngoài chuyền</th>

                  {/* Stage-specific WIP Columns */}
                  {selectedStage === 'LẮP RÁP D6' ? (
                    <>
                      <th style={{ textAlign: 'right' }}>左耳 ĐÃ LẮP MIC</th>
                      <th style={{ textAlign: 'right' }}>待入库 BTP</th>
                      <th style={{ textAlign: 'right' }}>维修房 SỬA HÀNG</th>
                      <th style={{ textAlign: 'right' }}>FA D6 SONG TAI</th>
                    </>
                  ) : selectedStage === 'ĐÓNG GÓI D6' ? (
                    <>
                      <th style={{ textAlign: 'right' }}>Thành Phẩm (成品)</th>
                    </>
                  ) : (
                    <>
                      <th style={{ textAlign: 'right' }}>Bán thành phẩm 1</th>
                      <th style={{ textAlign: 'right' }}>Bán thành phẩm 2</th>
                      <th style={{ textAlign: 'right' }}>Thành Phẩm</th>
                    </>
                  )}

                  <th style={{ textAlign: 'right' }}>Chênh lệch (差异)</th>
                  {selectedStage !== 'ĐÓNG GÓI D6' && (
                    <th style={{ textAlign: 'right', color: '#f59e0b' }}>NG</th>
                  )}
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const isNegative = item.discrepancy < 0;
                  const isSurplus = item.discrepancy > 0;
                  const isBalanced = item.discrepancy === 0;
                  const hasNG = item.ngQuantity > 0;

                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        background: isNegative ? 'rgba(239, 68, 68, 0.06)' : undefined
                      }}
                    >
                      <td style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                        {idx + 1}
                      </td>

                      {selectedStage === 'all' && (
                        <td style={{ fontWeight: 600, color: 'var(--accent-cyan)', whiteSpace: 'nowrap' }}>
                          {item.stage}
                        </td>
                      )}

                      <td style={{ color: 'var(--text-muted)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        {item.section || item.stage}
                      </td>

                      {/* Sticky Material Code */}
                      <td
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: isNegative ? '#ef4444' : 'var(--text-main)',
                          position: 'sticky',
                          left: 0,
                          background: isNegative ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card)',
                          zIndex: 1,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.materialCode}
                      </td>

                      {selectedStage !== 'ĐÓNG GÓI D6' && (
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {item.usagePerUnit > 0 ? item.usagePerUnit : '-'}
                        </td>
                      )}

                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          color: 'var(--accent-blue)'
                        }}
                      >
                        {item.auditRequired > 0 ? item.auditRequired.toLocaleString() : '-'}
                      </td>

                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {item.rawMaterialWarehouse > 0 ? item.rawMaterialWarehouse.toLocaleString() : '-'}
                      </td>

                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {item.rawMaterialLine > 0 ? item.rawMaterialLine.toLocaleString() : '-'}
                      </td>

                      {/* Dynamic Stage Columns */}
                      {selectedStage === 'LẮP RÁP D6' ? (
                        <>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {item.semiFinishedGoods > 0 ? item.semiFinishedGoods.toLocaleString() : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {item.semiFinishedGoods2 > 0 ? item.semiFinishedGoods2.toLocaleString() : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {item.repairRoom > 0 ? item.repairRoom.toLocaleString() : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {item.failureAnalysisFa > 0 ? item.failureAnalysisFa.toLocaleString() : '-'}
                          </td>
                        </>
                      ) : selectedStage === 'ĐÓNG GÓI D6' ? (
                        <>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {item.finishedGoods > 0 ? item.finishedGoods.toLocaleString() : '-'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {item.semiFinishedGoods > 0 ? item.semiFinishedGoods.toLocaleString() : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {item.semiFinishedGoods2 > 0 ? item.semiFinishedGoods2.toLocaleString() : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {item.finishedGoods > 0 ? item.finishedGoods.toLocaleString() : '-'}
                          </td>
                        </>
                      )}

                      {/* Discrepancy Highlight */}
                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          color: isNegative ? '#ef4444' : isSurplus ? 'var(--accent-cyan)' : '#10b981'
                        }}
                      >
                        {isNegative ? (
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid rgba(239, 68, 68, 0.4)'
                            }}
                          >
                            {item.discrepancy}
                          </span>
                        ) : isSurplus ? (
                          `+${item.discrepancy.toLocaleString()}`
                        ) : (
                          '0'
                        )}
                      </td>

                      {/* NG Quantity Highlight */}
                      {selectedStage !== 'ĐÓNG GÓI D6' && (
                        <td
                          style={{
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: hasNG ? 700 : 400,
                            color: hasNG ? '#f59e0b' : 'var(--text-dim)'
                          }}
                        >
                          {hasNG ? (
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(245, 158, 11, 0.2)',
                                border: '1px solid rgba(245, 158, 11, 0.4)'
                              }}
                            >
                              {item.ngQuantity}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      )}

                      {/* Status Badge */}
                      <td style={{ textAlign: 'center' }}>
                        {isNegative ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#ef4444',
                              color: '#ffffff'
                            }}
                          >
                            <AlertTriangle size={11} /> Âm kho
                          </span>
                        ) : hasNG ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.3)'
                            }}
                          >
                            Lỗi NG
                          </span>
                        ) : isSurplus ? (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(6, 182, 212, 0.15)',
                              color: 'var(--accent-cyan)'
                            }}
                          >
                            Dư thừa
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981'
                            }}
                          >
                            <CheckCircle2 size={11} /> Cân bằng
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 6. Modal Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            borderTop: '1px solid var(--border-card)',
            paddingTop: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <div>
            Hiển thị <strong>{filteredItems.length}</strong> / <strong>{data?.summary?.totalItems || 0}</strong> dòng vật tư kiểm kê.
            {selectedStage !== 'all' && (
              <span> | Đang lọc theo công đoạn: <strong style={{ color: 'var(--accent-cyan)' }}>{selectedStage}</strong></span>
            )}
            {selectedSection !== 'all' && (
              <span> ({selectedSection})</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.7rem' }}>
              Công thức kiểm kê: <code style={{ color: 'var(--accent-cyan)' }}>Chênh lệch = (Tồn kho + Ngoài chuyền + BTP + Thành phẩm + NG) - Cần kiểm</code>
            </span>
            <button className="btn-secondary" onClick={onClose} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
