import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Save,
  Search,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Sliders,
  Users,
  AlertTriangle,
  Clock,
  Sparkles,
  Sun,
  Moon,
  Zap,
  Target,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { ProductionRecordCrud } from '../types/dashboard';

export interface ProductionCrudContext {
  date?: string;
  product?: string;
  section?: 'plan' | 'product' | 'manpower' | 'uph' | string;
  recordId?: number;
}

interface ProductionCrudModalProps {
  onClose: () => void;
  onSuccess: () => void;
  availableProducts?: string[];
  initialContext?: ProductionCrudContext;
}

const PRODUCT_PRESETS: { [key: string]: { nameVi: string; tcgc: number; manBase: number } } = {
  '喇叭': { nameVi: 'Loa SPK', tcgc: 173, manBase: 18 },
  '麦克风': { nameVi: 'Microphone (MIC)', tcgc: 367, manBase: 24 },
  '控制盒': { nameVi: 'Hộp điều khiển (Control Box)', tcgc: 950, manBase: 35 },
  '头戴': { nameVi: 'Đai đầu (Headband)', tcgc: 259, manBase: 16 },
  '组装': { nameVi: 'Lắp ráp (Assembly)', tcgc: 1663, manBase: 85 },
  '包装': { nameVi: 'Đóng gói (Packaging)', tcgc: 518, manBase: 32 },
};

const SHIFT_PRESETS = [
  { key: 'Ca Ngày', label: 'Ca Ngày ☀️' },
  { key: 'Ca Đêm', label: 'Ca Đêm 🌙' },
  { key: 'Ca 1', label: 'Ca 1 (Sáng)' },
  { key: 'Ca 2', label: 'Ca 2 (Chiều)' },
  { key: 'Ca 3', label: 'Ca 3 (Đêm)' },
  { key: 'Ca Tăng ca', label: 'Tăng ca ⚡' },
];

const INITIAL_FORM: ProductionRecordCrud = {
  id: 0,
  date: new Date().toISOString().slice(0, 10),
  productCode: '组装',
  productNameVi: 'Lắp ráp (Assembly)',
  shift: 'Ca Ngày',
  plannedQuantity: 2200,
  actualQuantity: 2180,
  standardWorkingTime: 1663,
  workingHours: 750,
  achievementRate: 0.99,
  efficiency: 1.25,
  uph: 2.9,
  status: 'Completed',
  notes: 'Sản xuất ổn định đạt chỉ tiêu',

  plannedManpower: 85,
  actualManpower: 84,
  missingManpower: 1,

  functionalNG: 4,
  audioNG: 6,
  scratchNG: 12,
  edgeChipNG: 3,
  wireNG: 2,
  pcbaNG: 3,
  thdNG: 1,
  speakerNG: 0,
  coverNG: 2,
  nomaliNG: 1,
  brokenWireNG: 0,
  totalNG: 34,
  ngRate: 0.015,

  downtimeMinutes: 15,
  downtimeReason: 'Điều chỉnh khuôn hàn',
  impactDepartment: 'Kỹ thuật / Thiết bị'
};

const DEFAULT_DEFECT_CONFIG: Array<{ key: keyof ProductionRecordCrud; defaultName: string; color: string }> = [
  { key: 'scratchNG', defaultName: 'XƯỚC (划伤)', color: '#f43f5e' },
  { key: 'audioNG', defaultName: 'ÂM THANH (音频)', color: '#f97316' },
  { key: 'edgeChipNG', defaultName: 'MẺ (崩边)', color: '#eab308' },
  { key: 'functionalNG', defaultName: 'CÔNG NĂNG (功能)', color: '#06b6d4' },
  { key: 'wireNG', defaultName: 'DÂY USB (想材)', color: '#3b82f6' },
  { key: 'pcbaNG', defaultName: 'PCBA', color: '#8b5cf6' },
  { key: 'thdNG', defaultName: 'THD', color: '#a855f7' },
  { key: 'speakerNG', defaultName: 'LỎM LOA', color: '#ec4899' },
  { key: 'coverNG', defaultName: 'HỞ NẮP', color: '#14b8a6' },
  { key: 'nomaliNG', defaultName: 'NOMALI (异常)', color: '#64748b' },
  { key: 'brokenWireNG', defaultName: 'ĐỨT DÂY (断线)', color: '#ef4444' },
];

interface CustomDefectItem {
  id: string;
  name: string;
  qty: number;
}

export const ProductionCrudModal: React.FC<ProductionCrudModalProps> = ({ onClose, onSuccess, initialContext }) => {
  const [activeTab, setActiveTab] = useState<'form' | 'table'>('table');
  const [formData, setFormData] = useState<ProductionRecordCrud>(INITIAL_FORM);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Shift state
  const [isCustomShift, setIsCustomShift] = useState<boolean>(false);

  // Dynamic Defects state
  const [customDefects, setCustomDefects] = useState<CustomDefectItem[]>([]);
  const [defectLabels, setDefectLabels] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    DEFAULT_DEFECT_CONFIG.forEach(d => { init[d.key as string] = d.defaultName; });
    return init;
  });
  const [editingLabelKey, setEditingLabelKey] = useState<string | null>(null);

  // Table state
  const [records, setRecords] = useState<ProductionRecordCrud[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Feedback state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (initialContext) {
      if (initialContext.recordId) {
        api.getProductionCrudRecords({ pageSize: 100 })
          .then((res) => {
            const found = (res.records || []).find((r) => r.id === initialContext.recordId);
            if (found) {
              handleEditClick(found);
            }
          })
          .catch(() => {});
      } else {
        const pCode = initialContext.product || '组装';
        const preset = PRODUCT_PRESETS[pCode];
        setFormData((prev) => ({
          ...prev,
          date: initialContext.date || new Date().toISOString().slice(0, 10),
          productCode: pCode,
          productNameVi: preset ? preset.nameVi : pCode,
          standardWorkingTime: preset ? preset.tcgc : prev.standardWorkingTime,
          plannedManpower: preset ? preset.manBase : prev.plannedManpower,
          actualManpower: preset ? preset.manBase : prev.actualManpower,
        }));
        setIsEditing(false);
        setActiveTab('form');
      }
    }
  }, [initialContext]);

  // Calculations
  const standardDefectsSum = DEFAULT_DEFECT_CONFIG.reduce((acc, d) => {
    return acc + Number((formData as any)[d.key] || 0);
  }, 0);

  const customDefectsSum = customDefects.reduce((acc, d) => acc + (Number(d.qty) || 0), 0);
  const totalNG = standardDefectsSum + customDefectsSum;

  const planQty = Number(formData.plannedQuantity || 0);
  const actualQty = Number(formData.actualQuantity || 0);
  const hours = Number(formData.workingHours || 0);
  const tcgc = Number(formData.standardWorkingTime || 0);

  const calculatedAchieve = planQty > 0 ? (actualQty / planQty) * 100 : 0;
  const calculatedUPH = hours > 0 ? actualQty / hours : 0;
  const calculatedEff = hours > 0 ? ((actualQty * tcgc) / (3600 * hours)) * 100 : 0;
  const calculatedNGRate = actualQty > 0 ? (totalNG / actualQty) * 100 : 0;
  const calculatedMissingMan = Number(formData.plannedManpower || 0) - Number(formData.actualManpower || 0);

  // Gather unique shifts for table filter
  const availableShifts = useMemo(() => {
    const set = new Set<string>(SHIFT_PRESETS.map(s => s.key));
    records.forEach(r => {
      if (r.shift && r.shift.trim()) set.add(r.shift.trim());
    });
    return Array.from(set);
  }, [records]);

  // Load records from backend
  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const res = await api.getProductionCrudRecords({
        page: currentPage,
        pageSize,
        product: filterProduct,
        shift: filterShift,
        search: searchTerm,
      });
      // Sort strictly newest date first
      const sorted = [...(res.records || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setRecords(sorted);
      setTotalCount(res.total);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [currentPage, filterProduct, filterShift, searchTerm]);

  const handleProductChange = (code: string) => {
    const preset = PRODUCT_PRESETS[code];
    setFormData((prev) => ({
      ...prev,
      productCode: code,
      productNameVi: preset ? preset.nameVi : code,
      standardWorkingTime: preset ? preset.tcgc : prev.standardWorkingTime,
      plannedManpower: preset ? preset.manBase : prev.plannedManpower,
      actualManpower: preset ? preset.manBase : prev.actualManpower,
    }));
  };

  const handleAddCustomDefect = () => {
    setCustomDefects((prev) => [
      ...prev,
      { id: Date.now().toString(), name: `Lỗi bổ sung ${prev.length + 1}`, qty: 1 },
    ]);
  };

  const handleUpdateCustomDefect = (id: string, field: 'name' | 'qty', value: any) => {
    setCustomDefects((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleRemoveCustomDefect = (id: string) => {
    setCustomDefects((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const cleanNote = (formData.notes || '').replace(/<!--DEFECT_META:.*?-->/g, '').trim();
      const hasCustomDefects = customDefects.length > 0;
      const hasCustomLabels = Object.keys(defectLabels).some(
        (k) => defectLabels[k] !== DEFAULT_DEFECT_CONFIG.find(c => c.key === k)?.defaultName
      );

      let notesWithMeta = cleanNote;
      if (hasCustomDefects || hasCustomLabels) {
        const meta = JSON.stringify({ customDefects, defectLabels });
        notesWithMeta = `${cleanNote} <!--DEFECT_META:${meta}-->`.trim();
      }

      const payload: Partial<ProductionRecordCrud> = {
        ...formData,
        notes: notesWithMeta,
        achievementRate: calculatedAchieve / 100,
        uph: Math.round(calculatedUPH * 10) / 10,
        efficiency: calculatedEff / 100,
        totalNG,
        ngRate: calculatedNGRate / 100,
        missingManpower: calculatedMissingMan,
      };

      if (isEditing && formData.id > 0) {
        await api.updateProductionRecord(formData.id, payload);
        setFeedback({ type: 'success', text: `Đã cập nhật thành công bản ghi #${formData.id}!` });
      } else {
        await api.createProductionRecord(payload);
        setFeedback({ type: 'success', text: 'Đã lưu bản ghi sản xuất mới vào cơ sở dữ liệu!' });
      }

      onSuccess();
      loadRecords();
      setTimeout(() => {
        setActiveTab('table');
        setFeedback(null);
      }, 1000);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Lỗi khi lưu dữ liệu.' });
    }
  };

  const handleEditClick = (rec: ProductionRecordCrud) => {
    const isCustom = !SHIFT_PRESETS.some(s => s.key === rec.shift);
    setIsCustomShift(isCustom);

    let cleanNotes = rec.notes || '';
    let parsedDefects: CustomDefectItem[] = [];
    const initLabels: Record<string, string> = {};
    DEFAULT_DEFECT_CONFIG.forEach(d => { initLabels[d.key as string] = d.defaultName; });

    const metaMatch = cleanNotes.match(/<!--DEFECT_META:(.*?)-->/);
    if (metaMatch) {
      try {
        const parsed = JSON.parse(metaMatch[1]);
        if (Array.isArray(parsed.customDefects)) parsedDefects = parsed.customDefects;
        if (parsed.defectLabels) Object.assign(initLabels, parsed.defectLabels);
      } catch (e) {
        console.error('Failed to parse metadata', e);
      }
      cleanNotes = cleanNotes.replace(/<!--DEFECT_META:.*?-->/g, '').trim();
    }

    setCustomDefects(parsedDefects);
    setDefectLabels(initLabels);
    setFormData({
      ...rec,
      notes: cleanNotes,
      date: rec.date.slice(0, 10),
    });
    setIsEditing(true);
    setActiveTab('form');
    setFeedback(null);
  };

  const handleDeleteClick = async (rec: ProductionRecordCrud) => {
    if (!window.confirm(`Xác nhận xóa bản ghi ngày ${rec.date.slice(0, 10)} (${rec.productNameVi || rec.productCode})?`)) {
      return;
    }
    try {
      await api.deleteProductionRecord(rec.id);
      onSuccess();
      loadRecords();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa bản ghi.');
    }
  };

  const handleNewRecord = () => {
    setFormData({
      ...INITIAL_FORM,
      date: new Date().toISOString().slice(0, 10),
    });
    setIsCustomShift(false);
    setCustomDefects([]);
    const resetLabels: Record<string, string> = {};
    DEFAULT_DEFECT_CONFIG.forEach(d => { resetLabels[d.key as string] = d.defaultName; });
    setDefectLabels(resetLabels);
    setIsEditing(false);
    setActiveTab('form');
    setFeedback(null);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="modern-modal-overlay" onClick={onClose}>
      <div className="modern-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modern-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)',
                flexShrink: 0,
              }}
            >
              <ClipboardList size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                  Phiếu Nhập & Quản Lý Sản Xuất
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: 'var(--accent-cyan)',
                    fontWeight: 700,
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                  }}
                >
                  Live Database
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                Cập nhật sản lượng, ca làm việc, cân đối nhân lực và chi tiết các loại lỗi phế phẩm
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Segmented Control */}
            <div className="modern-tab-group">
              <button
                className={`modern-tab-btn ${activeTab === 'table' ? 'active' : ''}`}
                onClick={() => setActiveTab('table')}
              >
                <ClipboardList size={14} />
                <span>Danh Sách ({totalCount})</span>
              </button>
              <button
                className={`modern-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
                onClick={handleNewRecord}
              >
                <Plus size={14} />
                <span>{isEditing ? 'Sửa Bản Ghi' : 'Thêm Mới'}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            style={{
              margin: '0.85rem 1.75rem 0 1.75rem',
              padding: '0.7rem 1rem',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#f43f5e'}`,
              color: feedback.type === 'success' ? '#10b981' : '#f43f5e',
              animation: 'modalFadeIn 0.2s ease',
            }}
          >
            {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Tab 1: Form View */}
        {activeTab === 'form' && (
          <form
            onSubmit={handleSave}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.25rem 1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {/* Live KPI Metric HUD */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '0.65rem',
                marginBottom: '1rem',
              }}
            >
              <div className="form-kpi-pill">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Tỷ lệ đạt</span>
                  <Target size={14} color={calculatedAchieve >= 100 ? '#10b981' : calculatedAchieve >= 90 ? '#f59e0b' : '#f43f5e'} />
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: calculatedAchieve >= 100 ? '#10b981' : calculatedAchieve >= 90 ? '#f59e0b' : '#f43f5e' }}>
                  {calculatedAchieve.toFixed(1)}%
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                  {actualQty.toLocaleString()} / {planQty.toLocaleString()} pcs
                </span>
              </div>

              <div className="form-kpi-pill">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Năng suất UPH</span>
                  <Zap size={14} color="#38bdf8" />
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                  {calculatedUPH.toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>pcs/h</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{hours} giờ công</span>
              </div>

              <div className="form-kpi-pill">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Hiệu suất</span>
                  <TrendingUp size={14} color="#a855f7" />
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#a855f7' }}>
                  {calculatedEff.toFixed(1)}%
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>TCGC: {tcgc}s</span>
              </div>

              <div className="form-kpi-pill">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Tổng Phế Phẩm NG</span>
                  <Percent size={14} color={totalNG > 50 ? '#f43f5e' : '#f59e0b'} />
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: totalNG > 50 ? '#f43f5e' : '#f59e0b' }}>
                  {totalNG} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>cái</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: calculatedNGRate > 2 ? '#f43f5e' : 'var(--text-dim)' }}>
                  Tỷ lệ: {calculatedNGRate.toFixed(2)}%
                </span>
              </div>

              <div className="form-kpi-pill">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Nhân Lực Thiếu</span>
                  <Users size={14} color={calculatedMissingMan > 0 ? '#f43f5e' : '#10b981'} />
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: calculatedMissingMan > 0 ? '#f43f5e' : '#10b981' }}>
                  {calculatedMissingMan > 0 ? `-${calculatedMissingMan}` : '0'} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>người</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                  {formData.actualManpower}/{formData.plannedManpower} đi làm
                </span>
              </div>
            </div>

            {/* Section 1: Thông Tin Chung & Sản Lượng */}
            <div className="form-section-card">
              <div className="form-section-title" style={{ color: 'var(--accent-cyan)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <Sliders size={18} />
                  <span>1. THÔNG TIN CHUNG & SẢN LƯỢNG KẾ HOẠCH / THỰC TẾ</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Kế hoạch & Thời gian chuẩn</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Ngày sản xuất */}
                <div className="form-field-group">
                  <label className="form-label">Ngày sản xuất</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                {/* Sản phẩm */}
                <div className="form-field-group">
                  <label className="form-label">Sản phẩm / Công đoạn</label>
                  <select
                    className="form-input"
                    value={formData.productCode}
                    onChange={(e) => handleProductChange(e.target.value)}
                  >
                    {Object.keys(PRODUCT_PRESETS).map((code) => (
                      <option key={code} value={code}>
                        {code} - {PRODUCT_PRESETS[code].nameVi}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ca làm việc */}
                <div className="form-field-group" style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="form-label">Ca làm việc</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomShift(!isCustomShift)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-cyan)',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {isCustomShift ? '← Chọn ca có sẵn' : '✏️ Tự nhập ca tùy chỉnh...'}
                    </button>
                  </div>

                  {isCustomShift ? (
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nhập tên ca (VD: Ca 1, Ca Tăng ca đêm, Ca Hành chính...)"
                      value={formData.shift}
                      onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                      required
                      autoFocus
                    />
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {SHIFT_PRESETS.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          className={`shift-pill-btn ${formData.shift === s.key ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, shift: s.key })}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Kế hoạch */}
                <div className="form-field-group">
                  <label className="form-label">Kế hoạch (Planned)</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.plannedQuantity}
                      onChange={(e) => setFormData({ ...formData, plannedQuantity: Number(e.target.value) })}
                      required
                    />
                    <span className="form-input-addon">pcs</span>
                  </div>
                </div>

                {/* Thực tế */}
                <div className="form-field-group">
                  <label className="form-label">Thực tế (Actual)</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.actualQuantity}
                      onChange={(e) => setFormData({ ...formData, actualQuantity: Number(e.target.value) })}
                      required
                    />
                    <span className="form-input-addon">pcs</span>
                  </div>
                </div>

                {/* TCGC Tiêu chuẩn */}
                <div className="form-field-group">
                  <label className="form-label">TCGC Tiêu chuẩn</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.standardWorkingTime}
                      onChange={(e) => setFormData({ ...formData, standardWorkingTime: Number(e.target.value) })}
                    />
                    <span className="form-input-addon">giây</span>
                  </div>
                </div>

                {/* Giờ công thực tế */}
                <div className="form-field-group">
                  <label className="form-label">Giờ công thực tế</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      step="0.1"
                      className="form-input form-input-with-addon"
                      value={formData.workingHours}
                      onChange={(e) => setFormData({ ...formData, workingHours: Number(e.target.value) })}
                    />
                    <span className="form-input-addon">giờ</span>
                  </div>
                </div>

                {/* Trạng thái */}
                <div className="form-field-group">
                  <label className="form-label">Trạng thái sản xuất</label>
                  <select
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Completed">🟢 Hoàn thành (Completed)</option>
                    <option value="In Progress">🟡 Đang chạy (In Progress)</option>
                    <option value="Scheduled">⚪ Lên lịch (Scheduled)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Nhân Lực */}
            <div className="form-section-card">
              <div className="form-section-title" style={{ color: '#38bdf8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <Users size={18} />
                  <span>2. BỐ TRÍ & THIẾU HỤT NHÂN LỰC</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Kế hoạch vs Đi làm thực tế</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-field-group">
                  <label className="form-label">Nhân lực kế hoạch</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.plannedManpower}
                      onChange={(e) => setFormData({ ...formData, plannedManpower: Number(e.target.value) })}
                    />
                    <span className="form-input-addon">người</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Nhân lực thực tế đi làm</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.actualManpower}
                      onChange={(e) => setFormData({ ...formData, actualManpower: Number(e.target.value) })}
                    />
                    <span className="form-input-addon">người</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Thiếu hụt tự động tính</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={calculatedMissingMan}
                      disabled
                      style={{
                        background: calculatedMissingMan > 0 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: calculatedMissingMan > 0 ? '#f43f5e' : '#10b981',
                        fontWeight: 700,
                      }}
                    />
                    <span className="form-input-addon">người</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Chi Tiết Các Loại Lỗi Phế Phẩm NG */}
            <div className="form-section-card">
              <div className="form-section-title" style={{ color: '#f59e0b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <AlertTriangle size={18} />
                  <span>3. CHI TIẾT CÁC LOẠI LỖI PHẾ PHẨM NG</span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 400 }}>
                    (Bấm tên lỗi để đổi tên theo ý muốn)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: totalNG > 50 ? '#f43f5e' : '#f59e0b' }}>
                    Tổng: {totalNG} cái ({calculatedNGRate.toFixed(2)}%)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCustomDefect}
                    className="btn-secondary"
                    style={{
                      fontSize: '0.74rem',
                      padding: '0.35rem 0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      borderColor: '#f59e0b',
                      color: '#f59e0b',
                      borderRadius: '8px',
                    }}
                  >
                    <Plus size={13} />
                    <span>+ Thêm Lỗi Mới</span>
                  </button>
                </div>
              </div>

              {/* 11 Defect Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                {DEFAULT_DEFECT_CONFIG.map((d) => {
                  const label = defectLabels[d.key as string] || d.defaultName;
                  const isEditingThis = editingLabelKey === d.key;

                  return (
                    <div key={d.key as string} className="defect-modern-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {isEditingThis ? (
                          <input
                            type="text"
                            value={label}
                            onChange={(e) => setDefectLabels({ ...defectLabels, [d.key as string]: e.target.value })}
                            onBlur={() => setEditingLabelKey(null)}
                            onKeyDown={(e) => { if (e.key === 'Enter') setEditingLabelKey(null); }}
                            autoFocus
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 4px',
                              background: 'var(--bg-input)',
                              border: '1px solid var(--accent-cyan)',
                              borderRadius: '4px',
                              color: '#fff',
                              width: '100%',
                            }}
                          />
                        ) : (
                          <div
                            onClick={() => setEditingLabelKey(d.key as string)}
                            title="Bấm để đổi tên lỗi này"
                            style={{
                              fontSize: '0.73rem',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '100%',
                            }}
                          >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                            <Edit2 size={10} style={{ opacity: 0.4, marginLeft: 'auto', flexShrink: 0 }} />
                          </div>
                        )}
                      </div>

                      <div className="form-input-wrapper">
                        <input
                          type="number"
                          className="form-input form-input-with-addon"
                          style={{ height: '36px', fontSize: '0.85rem', fontWeight: 700 }}
                          value={(formData as any)[d.key] || 0}
                          onChange={(e) => setFormData({ ...formData, [d.key]: Number(e.target.value) })}
                        />
                        <span className="form-input-addon" style={{ fontSize: '0.68rem' }}>cái</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Defects */}
              {customDefects.length > 0 && (
                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={14} />
                    <span>Loại Lỗi Tùy Chỉnh Do Bạn Thêm ({customDefects.length})</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {customDefects.map((cd) => (
                      <div
                        key={cd.id}
                        style={{
                          background: 'rgba(56, 189, 248, 0.06)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '10px',
                          padding: '0.65rem 0.8rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input
                            type="text"
                            placeholder="Tên loại lỗi..."
                            value={cd.name}
                            onChange={(e) => handleUpdateCustomDefect(cd.id, 'name', e.target.value)}
                            style={{
                              flex: 1,
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              padding: '4px 8px',
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              color: '#fff',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomDefect(cd.id)}
                            title="Xóa lỗi này"
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              color: '#f43f5e',
                              borderRadius: '6px',
                              padding: '5px',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="form-input-wrapper">
                          <input
                            type="number"
                            className="form-input form-input-with-addon"
                            style={{ height: '34px', fontSize: '0.85rem', fontWeight: 700 }}
                            value={cd.qty}
                            onChange={(e) => handleUpdateCustomDefect(cd.id, 'qty', Number(e.target.value))}
                          />
                          <span className="form-input-addon" style={{ fontSize: '0.68rem' }}>cái</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Dừng Máy & Ghi Chú */}
            <div className="form-section-card">
              <div className="form-section-title" style={{ color: '#a855f7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <Clock size={18} />
                  <span>4. THỜI GIAN DỪNG MÁY & GHI CHÚ SẢN XUẤT</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Downtime & Bộ phận xử lý</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-field-group">
                  <label className="form-label">Dừng máy (phút)</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.downtimeMinutes}
                      onChange={(e) => setFormData({ ...formData, downtimeMinutes: Number(e.target.value) })}
                    />
                    <span className="form-input-addon">phút</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Lý do dừng máy</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Kẹt khuôn dập, hỏng máy hàn, chờ NVL..."
                    value={formData.downtimeReason || ''}
                    onChange={(e) => setFormData({ ...formData, downtimeReason: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">Bộ phận ảnh hưởng</label>
                  <select
                    className="form-input"
                    value={formData.impactDepartment || 'Kỹ thuật / Thiết bị'}
                    onChange={(e) => setFormData({ ...formData, impactDepartment: e.target.value })}
                  >
                    <option value="Kỹ thuật / Thiết bị">Kỹ thuật / Thiết bị</option>
                    <option value="Kho & Chuỗi cung ứng">Kho & Chuỗi cung ứng</option>
                    <option value="Vận hành chuyền">Vận hành chuyền</option>
                    <option value="Chất lượng QA/QC">Chất lượng QA/QC</option>
                  </select>
                </div>

                <div className="form-field-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Ghi chú sản xuất thực tế</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nhập ghi chú sản xuất thực tế trong ca..."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.85rem',
                paddingTop: '0.85rem',
                marginTop: '0.5rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveTab('table')}
                style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem', borderRadius: '10px' }}
              >
                Hủy / Quay Lại Bảng
              </button>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.6rem 1.75rem',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Save size={16} />
                <span>{isEditing ? 'Lưu Cập Nhật Bản Ghi' : 'Lưu Bản Ghi Mới Vào Database'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Table View */}
        {activeTab === 'table' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '1.25rem 1.75rem' }}>
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tìm kiếm sản phẩm, ghi chú..."
                  style={{ paddingLeft: '36px', height: '38px', fontSize: '0.82rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="form-input"
                style={{ width: 'auto', height: '38px', fontSize: '0.82rem' }}
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
              >
                <option value="all">Tất cả sản phẩm</option>
                {Object.keys(PRODUCT_PRESETS).map((code) => (
                  <option key={code} value={code}>
                    {PRODUCT_PRESETS[code].nameVi}
                  </option>
                ))}
              </select>

              <select
                className="form-input"
                style={{ width: 'auto', height: '38px', fontSize: '0.82rem' }}
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
              >
                <option value="all">Tất cả ca làm việc</option>
                {availableShifts.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <button
                className="btn-primary"
                onClick={handleNewRecord}
                style={{
                  height: '38px',
                  fontSize: '0.82rem',
                  padding: '0 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
                  borderRadius: '10px',
                }}
              >
                <Plus size={15} />
                <span>+ Thêm Mới</span>
              </button>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-card)', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead style={{ background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 0.85rem' }}>Ngày</th>
                    <th style={{ padding: '0.75rem 0.85rem' }}>Sản phẩm</th>
                    <th style={{ padding: '0.75rem 0.85rem' }}>Ca</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Kế hoạch</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Thực tế</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Đạt %</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>UPH</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Nhân lực</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Tổng NG</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Dừng máy</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                        Đang nạp dữ liệu từ Database...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                        Không có bản ghi nào. Bấm "+ Thêm Mới" để tạo bản ghi đầu tiên!
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => {
                      const achievePct = (r.achievementRate * 100);
                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.035)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                            {r.date.slice(0, 10)}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                              {r.productNameVi || r.productCode}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{r.productCode}</div>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {r.shift}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {r.plannedQuantity.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff' }}>
                            {r.actualQuantity.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                background: achievePct >= 100 ? 'rgba(16, 185, 129, 0.15)' : achievePct >= 90 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                color: achievePct >= 100 ? '#10b981' : achievePct >= 90 ? '#f59e0b' : '#f43f5e',
                              }}
                            >
                              {achievePct.toFixed(1)}%
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                            {r.uph.toFixed(1)}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                            <span>{r.actualManpower}/{r.plannedManpower}</span>
                            {r.missingManpower > 0 && (
                              <span style={{ color: '#f43f5e', fontSize: '0.7rem', marginLeft: '4px' }}>
                                (-{r.missingManpower})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                            <span style={{ color: r.totalNG > 0 ? '#f59e0b' : 'var(--text-dim)', fontWeight: 600 }}>
                              {r.totalNG} ({((r.ngRate || 0) * 100).toFixed(1)}%)
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                            {r.downtimeMinutes > 0 ? (
                              <span style={{ color: '#f43f5e', fontWeight: 700 }}>{r.downtimeMinutes}m</span>
                            ) : (
                              <span style={{ color: 'var(--text-dim)' }}>0m</span>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                              <button
                                onClick={() => handleEditClick(r)}
                                title="Chỉnh sửa bản ghi"
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  color: '#38bdf8',
                                  borderRadius: '8px',
                                  padding: '5px 8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(r)}
                                title="Xóa khỏi cơ sở dữ liệu"
                                style={{
                                  background: 'rgba(244, 63, 94, 0.15)',
                                  border: '1px solid rgba(244, 63, 94, 0.3)',
                                  color: '#f43f5e',
                                  borderRadius: '8px',
                                  padding: '5px 8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.85rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              <div>
                Tổng cộng <strong>{totalCount}</strong> bản ghi | Trang {currentPage}/{totalPages}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  className="btn-secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '0.3rem 0.7rem', borderRadius: '8px' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="btn-secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: '0.3rem 0.7rem', borderRadius: '8px' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
