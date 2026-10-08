import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Save,
  Trash2,
  Printer,
  Download,
  Sparkles,
  CheckCircle,
  Plus,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../services/api';
import { EightDReport } from '../types/dashboard';

interface ProblemSolvingModalProps {
  onClose: () => void;
  initialProduct?: string;
  initialDefect?: string;
  availableProducts: string[];
}

export const ProblemSolvingModal: React.FC<ProblemSolvingModalProps> = ({
  onClose,
  initialProduct,
  initialDefect,
  availableProducts,
}) => {
  const [reports, setReports] = useState<EightDReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<EightDReport | null>(null);
  const [mode, setMode] = useState<'4D' | '8D'>('8D');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingEvidence, setIsFetchingEvidence] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const list = await api.get8DReports();
      setReports(list);
      if (list.length > 0) {
        // If initialProduct given, select matching report or create new
        if (initialProduct) {
          createNewReport(initialProduct, initialDefect);
        } else {
          setSelectedReport(list[0]);
          setMode(list[0].mode || '8D');
        }
      } else {
        createNewReport(initialProduct || '喇叭', initialDefect);
      }
    } catch (e) {
      console.error(e);
      createNewReport(initialProduct || '喇叭', initialDefect);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewReport = (prod = '喇叭', defect?: string) => {
    const newRep: EightDReport = {
      id: `8D-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`,
      title: `Báo cáo xử lý sự cố chất lượng: ${prod} ${defect ? `(${defect})` : ''}`,
      mode: mode,
      productCode: prod,
      defectType: defect || 'XƯỚC 划伤',
      dateRange: '7 ngày gần nhất',
      severity: 'High',
      status: 'Open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      teamLeader: 'Nguyễn Văn Tuấn (QA Lead)',
      champion: 'Trần Đình Khang (Production Manager)',
      teamMembers: 'Lê Hoàng Quân (Kỹ thuật), Phạm Thị Mai (Giám sát chuyền)',
      problemStatement: '',
      evidenceDetails: '',
      evidenceProductionQty: 0,
      evidenceNGQty: 0,
      evidenceNGRate: 0,
      evidenceTopDefect: defect || '',
      containmentAction: '1) Tạm dừng lô hàng nghi vấn để kiểm tra 100%.\n2) Tăng tần suất kiểm tra tại trạm hoàn thiện.',
      containmentOwner: 'Phạm Thị Mai (QA Inspector)',
      containmentDueDate: new Date().toISOString().slice(0, 10),
      containmentStatus: 'Completed',
      rootCauseWhy1: '',
      rootCauseWhy2: '',
      rootCauseWhy3: '',
      rootCauseWhy4: '',
      rootCauseWhy5: '',
      rootCauseSummary: '',
      correctiveActions: '',
      actionOwner: 'Lê Hoàng Quân (Kỹ sư Thiết bị)',
      actionDueDate: '',
      validationResult: '',
      validationDate: '',
      preventativeActions: '',
      standardOperatingProcedure: '',
      teamRecognition: '',
      signOffPerson: '',
      signOffDate: '',
    };
    setSelectedReport(newRep);
    fetchRealEvidence(newRep);
  };

  const fetchRealEvidence = async (targetReport?: EightDReport) => {
    const r = targetReport || selectedReport;
    if (!r) return;
    setIsFetchingEvidence(true);
    try {
      const ev = await api.generate8DEvidence(r.productCode, r.defectType);
      setSelectedReport((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          evidenceDetails: `Sản lượng: ${ev.productionQuantity.toLocaleString()} pcs | Tổng NG: ${ev.ngQuantity.toLocaleString()} pcs | Tỷ lệ NG: ${ev.ngRate}% | Lỗi chính: ${ev.topDefect} | Dừng máy: ${ev.downtimeMinutes} phút`,
          evidenceProductionQty: ev.productionQuantity,
          evidenceNGQty: ev.ngQuantity,
          evidenceNGRate: ev.ngRate,
          evidenceTopDefect: ev.topDefect,
          problemStatement: prev.problemStatement || ev.suggestedProblemStatement,
        };
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingEvidence(false);
    }
  };

  const handleSave = async () => {
    if (!selectedReport) return;
    try {
      const saved = await api.save8DReport(selectedReport);
      setSelectedReport(saved);
      // update list
      setReports((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [saved, ...prev];
      });
      alert('Đã lưu báo cáo thành công!');
    } catch (e: any) {
      alert('Lỗi lưu báo cáo: ' + e.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedReport || !window.confirm(`Bạn có chắc muốn xóa báo cáo ${selectedReport.id}?`)) return;
    try {
      await api.delete8DReport(selectedReport.id);
      const remaining = reports.filter((r) => r.id !== selectedReport.id);
      setReports(remaining);
      if (remaining.length > 0) setSelectedReport(remaining[0]);
      else createNewReport();
    } catch (e: any) {
      alert('Lỗi xóa báo cáo: ' + e.message);
    }
  };

  const handleExportExcel = () => {
    if (!selectedReport) return;
    const reportData = [
      { 'Mục': 'Mã báo cáo', 'Nội dung': selectedReport.id },
      { 'Mục': 'Tiêu đề', 'Nội dung': selectedReport.title },
      { 'Mục': 'Chế độ', 'Nội dung': selectedReport.mode },
      { 'Mục': 'Sản phẩm', 'Nội dung': selectedReport.productCode },
      { 'Mục': 'Chủng loại lỗi', 'Nội dung': selectedReport.defectType || '' },
      { 'Mục': 'Mức độ nghiêm trọng', 'Nội dung': selectedReport.severity },
      { 'Mục': 'Trạng thái', 'Nội dung': selectedReport.status },
      { 'Mục': 'D1 Trưởng nhóm', 'Nội dung': selectedReport.teamLeader },
      { 'Mục': 'D1 Thành viên', 'Nội dung': selectedReport.teamMembers },
      { 'Mục': 'D2 Mô tả sự cố', 'Nội dung': selectedReport.problemStatement },
      { 'Mục': 'D2 Bằng chứng thực tế', 'Nội dung': selectedReport.evidenceDetails },
      { 'Mục': 'D3 Hành động phong tỏa (ICA)', 'Nội dung': selectedReport.containmentAction },
      { 'Mục': 'D3 Người phụ trách', 'Nội dung': selectedReport.containmentOwner },
      { 'Mục': 'D4 Phân tích nguyên nhân gốc rễ (5 Whys)', 'Nội dung': selectedReport.rootCauseSummary },
      { 'Mục': 'D5 Hành động khắc phục vĩnh viễn (PCA)', 'Nội dung': selectedReport.correctiveActions },
      { 'Mục': 'D6 Kết quả thẩm định hiệu quả', 'Nội dung': selectedReport.validationResult },
      { 'Mục': 'D7 Phòng ngừa tái diễn (SOP)', 'Nội dung': selectedReport.preventativeActions },
      { 'Mục': 'D8 Đóng báo cáo & Khen thưởng', 'Nội dung': selectedReport.teamRecognition },
    ];
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '8D_Report');
    XLSX.writeFile(wb, `BaoCao_${selectedReport.mode}_${selectedReport.id}.xlsx`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px', width: '95vw', padding: '1.5rem' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={20} color="#f59e0b" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                HỆ THỐNG GIẢI QUYẾT SỰ CỐ SẢN XUẤT (4D / 8D PROBLEM SOLVING)
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Chuẩn mực xử lý chất lượng theo tư duy Ford 8D / 4D Quick-Response
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Mode Switcher */}
            <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '2px', borderRadius: '6px' }}>
              <button
                onClick={() => { setMode('4D'); if (selectedReport) setSelectedReport({ ...selectedReport, mode: '4D' }); }}
                style={{
                  border: 'none',
                  background: mode === '4D' ? 'var(--accent-cyan)' : 'transparent',
                  color: mode === '4D' ? '#fff' : 'var(--text-dim)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                4D (Quick Action)
              </button>
              <button
                onClick={() => { setMode('8D'); if (selectedReport) setSelectedReport({ ...selectedReport, mode: '8D' }); }}
                style={{
                  border: 'none',
                  background: mode === '8D' ? 'var(--accent-amber)' : 'transparent',
                  color: mode === '8D' ? '#000' : 'var(--text-dim)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                8D (Standard Discipline)
              </button>
            </div>

            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body Layout: Left list of reports, Right active report editor */}
        <div className="problem-solving-layout">
          {/* Left: Reports Navigator */}
          <div className="problem-solving-nav" style={{ background: 'var(--bg-input)', borderRadius: '8px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button
              className="btn-primary"
              onClick={() => createNewReport()}
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
            >
              <Plus size={15} /> Tạo Báo cáo Mới
            </button>

            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: '0.4rem' }}>
              Danh sách báo cáo:
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '480px' }}>
              {reports.map((r) => {
                const isSelected = selectedReport?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => { setSelectedReport(r); setMode(r.mode as any); }}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: '6px',
                      background: isSelected ? 'var(--bg-card)' : 'transparent',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent-amber)' : 'var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isSelected ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                        {r.mode} • {r.id}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: r.status === 'Closed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: r.status === 'Closed' ? '#10b981' : '#f59e0b'
                      }}>
                        {r.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
                      {r.productCode} - {r.defectType}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Active Report Editor */}
          {selectedReport ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.4rem' }}>
              {/* Meta row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Mã Báo Cáo</label>
                  <input
                    type="text"
                    className="select-custom"
                    style={{ width: '100%', marginTop: '2px', fontFamily: 'var(--font-mono)' }}
                    value={selectedReport.id}
                    readOnly
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Sản Phẩm</label>
                  <select
                    className="select-custom"
                    style={{ width: '100%', marginTop: '2px' }}
                    value={selectedReport.productCode}
                    onChange={(e) => {
                      const updated = { ...selectedReport, productCode: e.target.value };
                      setSelectedReport(updated);
                      fetchRealEvidence(updated);
                    }}
                  >
                    {availableProducts.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Loại Lỗi (Defect)</label>
                  <input
                    type="text"
                    className="select-custom"
                    style={{ width: '100%', marginTop: '2px' }}
                    value={selectedReport.defectType || ''}
                    onChange={(e) => setSelectedReport({ ...selectedReport, defectType: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Mức Độ / Trạng Thái</label>
                  <div style={{ display: 'flex', gap: '0.3rem', marginTop: '2px' }}>
                    <select
                      className="select-custom"
                      value={selectedReport.severity}
                      onChange={(e) => setSelectedReport({ ...selectedReport, severity: e.target.value as any })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>

                    <select
                      className="select-custom"
                      value={selectedReport.status}
                      onChange={(e) => setSelectedReport({ ...selectedReport, status: e.target.value as any })}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Title input */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tiêu Đề Báo Cáo</label>
                <input
                  type="text"
                  className="select-custom"
                  style={{ width: '100%', marginTop: '4px', fontSize: '0.9rem', fontWeight: 600 }}
                  value={selectedReport.title}
                  onChange={(e) => setSelectedReport({ ...selectedReport, title: e.target.value })}
                />
              </div>

              {/* D1: Team (Only for 8D) */}
              {mode === '8D' && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
                    D1: ĐỘI NGŨ THỰC HIỆN (TEAM ASSIGNMENT)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Trưởng nhóm (Leader)</label>
                      <input
                        type="text"
                        className="select-custom"
                        style={{ width: '100%', marginTop: '2px' }}
                        value={selectedReport.teamLeader}
                        onChange={(e) => setSelectedReport({ ...selectedReport, teamLeader: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Người bảo trợ (Champion)</label>
                      <input
                        type="text"
                        className="select-custom"
                        style={{ width: '100%', marginTop: '2px' }}
                        value={selectedReport.champion}
                        onChange={(e) => setSelectedReport({ ...selectedReport, champion: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Thành viên tham gia (Members)</label>
                    <input
                      type="text"
                      className="select-custom"
                      style={{ width: '100%', marginTop: '2px' }}
                      value={selectedReport.teamMembers}
                      onChange={(e) => setSelectedReport({ ...selectedReport, teamMembers: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* D2: Problem Description & Real Evidence */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                    {mode === '8D' ? 'D2: MÔ TẢ VẤN ĐỀ & BẰNG CHỨNG THỰC TẾ' : 'D1/D2: MÔ TẢ SỰ CỐ & DỮ LIỆU ĐO LƯỜNG'}
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={() => fetchRealEvidence()}
                    disabled={isFetchingEvidence}
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', color: '#10b981' }}
                  >
                    <Sparkles size={13} /> {isFetchingEvidence ? 'Đang trích xuất...' : 'Nạp bằng chứng từ Dashboard'}
                  </button>
                </div>

                {/* Evidence Badge Box */}
                {selectedReport.evidenceDetails && (
                  <div style={{
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    marginBottom: '0.6rem',
                    fontSize: '0.76rem',
                    color: 'var(--accent-cyan)'
                  }}>
                    <strong>Bằng chứng thực tế từ hệ thống:</strong> {selectedReport.evidenceDetails}
                  </div>
                )}

                <textarea
                  className="select-custom"
                  rows={3}
                  style={{ width: '100%', resize: 'vertical', fontSize: '0.8rem' }}
                  placeholder="Mô tả cụ thể hiện tượng lỗi, thời điểm phát sinh, công đoạn bị ảnh hưởng..."
                  value={selectedReport.problemStatement}
                  onChange={(e) => setSelectedReport({ ...selectedReport, problemStatement: e.target.value })}
                />
              </div>

              {/* D3: Containment Action */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '0.5rem' }}>
                  D3: HÀNH ĐỘNG PHONG TỎA TỨC THỜI (CONTAINMENT ACTION / ICA)
                </div>
                <textarea
                  className="select-custom"
                  rows={2}
                  style={{ width: '100%', resize: 'vertical', fontSize: '0.8rem' }}
                  placeholder="Hành động tức thời cô lập sản phẩm lỗi, chặn xuất hàng..."
                  value={selectedReport.containmentAction}
                  onChange={(e) => setSelectedReport({ ...selectedReport, containmentAction: e.target.value })}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginTop: '0.4rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Người thực hiện</label>
                    <input
                      type="text"
                      className="select-custom"
                      style={{ width: '100%' }}
                      value={selectedReport.containmentOwner}
                      onChange={(e) => setSelectedReport({ ...selectedReport, containmentOwner: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Hạn hoàn thành</label>
                    <input
                      type="date"
                      className="select-custom"
                      style={{ width: '100%' }}
                      value={selectedReport.containmentDueDate}
                      onChange={(e) => setSelectedReport({ ...selectedReport, containmentDueDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* D4: Root Cause (5 Whys) */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-indigo)', marginBottom: '0.5rem' }}>
                  D4: PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE - 5 WHYS)
                </div>
                {mode === '8D' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Why 1: Tại sao hiện tượng này xảy ra?"
                      className="select-custom"
                      style={{ width: '100%', fontSize: '0.78rem' }}
                      value={selectedReport.rootCauseWhy1}
                      onChange={(e) => setSelectedReport({ ...selectedReport, rootCauseWhy1: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Why 2: Tại sao nguyên nhân trên xảy ra?"
                      className="select-custom"
                      style={{ width: '100%', fontSize: '0.78rem' }}
                      value={selectedReport.rootCauseWhy2}
                      onChange={(e) => setSelectedReport({ ...selectedReport, rootCauseWhy2: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Why 3: Tại sao?"
                      className="select-custom"
                      style={{ width: '100%', fontSize: '0.78rem' }}
                      value={selectedReport.rootCauseWhy3}
                      onChange={(e) => setSelectedReport({ ...selectedReport, rootCauseWhy3: e.target.value })}
                    />
                  </div>
                )}
                <textarea
                  className="select-custom"
                  rows={2}
                  style={{ width: '100%', resize: 'vertical', fontSize: '0.8rem' }}
                  placeholder="Kết luận nguyên nhân gốc rễ (Root cause summary)..."
                  value={selectedReport.rootCauseSummary}
                  onChange={(e) => setSelectedReport({ ...selectedReport, rootCauseSummary: e.target.value })}
                />
              </div>

              {/* D5: Permanent Corrective Action (PCA) */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '0.5rem' }}>
                  {mode === '8D' ? 'D5: HÀNH ĐỘNG KHẮC PHỤC VĨNH VIỄN (PCA)' : 'D4: HÀNH ĐỘNG KHẮC PHỤC & PHÒNG NGỪA'}
                </div>
                <textarea
                  className="select-custom"
                  rows={2}
                  style={{ width: '100%', resize: 'vertical', fontSize: '0.8rem' }}
                  placeholder="Biện pháp khắc phục triệt để không để lỗi tái phát..."
                  value={selectedReport.correctiveActions}
                  onChange={(e) => setSelectedReport({ ...selectedReport, correctiveActions: e.target.value })}
                />
              </div>

              {/* D6, D7, D8 (for 8D only) */}
              {mode === '8D' && (
                <>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.5rem' }}>
                      D6: TRIỂN KHAI & THẨM ĐỊNH HIỆU QUẢ (VALIDATION)
                    </div>
                    <textarea
                      className="select-custom"
                      rows={2}
                      style={{ width: '100%', resize: 'vertical', fontSize: '0.8rem' }}
                      placeholder="Kết quả thử nghiệm, tỷ lệ lỗi sau khi áp dụng PCA, kiểm tra Cpk..."
                      value={selectedReport.validationResult}
                      onChange={(e) => setSelectedReport({ ...selectedReport, validationResult: e.target.value })}
                    />
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a855f7', marginBottom: '0.5rem' }}>
                      D7: PHÒNG NGỪA TÁI DIỄN & CHUẨN HÓA (STANDARDIZATION / SOP)
                    </div>
                    <textarea
                      className="select-custom"
                      rows={2}
                      style={{ width: '100%', resize: 'vertical', fontSize: '0.8rem' }}
                      placeholder="Cập nhật quy trình SOP, FMEA, Control Plan, đào tạo công nhân..."
                      value={selectedReport.preventativeActions}
                      onChange={(e) => setSelectedReport({ ...selectedReport, preventativeActions: e.target.value })}
                    />
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#facc15', marginBottom: '0.5rem' }}>
                      D8: ĐÓNG BÁO CÁO & KHEN THƯỞNG ĐỘI NGŨ (CLOSURE & RECOGNITION)
                    </div>
                    <textarea
                      className="select-custom"
                      rows={2}
                      style={{ width: '100%', resize: 'vertical', fontSize: '0.8rem' }}
                      placeholder="Ghi nhận thành tích, phê duyệt đóng báo cáo của Ban Giám Đốc..."
                      value={selectedReport.teamRecognition}
                      onChange={(e) => setSelectedReport({ ...selectedReport, teamRecognition: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* Action Buttons Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '0.85rem',
                borderTop: '1px solid var(--border-card)',
                marginTop: '0.5rem'
              }}>
                <button
                  className="btn-secondary"
                  onClick={handleDelete}
                  style={{ color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                >
                  <Trash2 size={15} /> Xóa Báo Cáo
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button className="btn-secondary" onClick={() => window.print()}>
                    <Printer size={15} /> In / PDF
                  </button>

                  <button className="btn-secondary" onClick={handleExportExcel}>
                    <Download size={15} color="#10b981" /> Xuất Excel
                  </button>

                  <button className="btn-primary" onClick={handleSave}>
                    <Save size={15} /> Lưu Báo Cáo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              Chọn hoặc tạo báo cáo để bắt đầu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
