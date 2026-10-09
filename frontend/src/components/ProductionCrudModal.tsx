import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
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
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { ProductionRecordCrud } from '../types/dashboard';

interface ProductionCrudModalProps {
  onClose: () => void;
  onSuccess: () => void;
  availableProducts?: string[];
}

const PRODUCT_PRESETS: { [key: string]: { nameVi: string; tcgc: number; manBase: number } } = {
  '喇叭': { nameVi: 'Loa SPK', tcgc: 173, manBase: 18 },
  '麦克风': { nameVi: 'Microphone (MIC)', tcgc: 367, manBase: 24 },
  '控制盒': { nameVi: 'Hộp điều khiển (Control Box)', tcgc: 950, manBase: 35 },
  '头戴': { nameVi: 'Đai đầu (Headband)', tcgc: 259, manBase: 16 },
  '组装': { nameVi: 'Lắp ráp (Assembly)', tcgc: 1663, manBase: 85 },
  '包装': { nameVi: 'Đóng gói (Packaging)', tcgc: 518, manBase: 32 },
};

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

export const ProductionCrudModal: React.FC<ProductionCrudModalProps> = ({ onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'form' | 'table'>('table');
  const [formData, setFormData] = useState<ProductionRecordCrud>(INITIAL_FORM);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Table state
  const [records, setRecords] = useState<ProductionRecordCrud[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto calculate metrics
  const totalNG =
    Number(formData.functionalNG || 0) +
    Number(formData.audioNG || 0) +
    Number(formData.scratchNG || 0) +
    Number(formData.edgeChipNG || 0) +
    Number(formData.wireNG || 0) +
    Number(formData.pcbaNG || 0) +
    Number(formData.thdNG || 0) +
    Number(formData.speakerNG || 0) +
    Number(formData.coverNG || 0) +
    Number(formData.nomaliNG || 0) +
    Number(formData.brokenWireNG || 0);

  const planQty = Number(formData.plannedQuantity || 0);
  const actualQty = Number(formData.actualQuantity || 0);
  const hours = Number(formData.workingHours || 0);
  const tcgc = Number(formData.standardWorkingTime || 0);

  const calculatedAchieve = planQty > 0 ? (actualQty / planQty) * 100 : 0;
  const calculatedUPH = hours > 0 ? actualQty / hours : 0;
  const calculatedEff = hours > 0 ? ((actualQty * tcgc) / (3600 * hours)) * 100 : 0;
  const calculatedNGRate = actualQty > 0 ? (totalNG / actualQty) * 100 : 0;
  const calculatedMissingMan = Number(formData.plannedManpower || 0) - Number(formData.actualManpower || 0);

  // Load records
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
      setRecords(res.records);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const payload: Partial<ProductionRecordCrud> = {
        ...formData,
        achievementRate: calculatedAchieve / 100,
        uph: Math.round(calculatedUPH * 10) / 10,
        efficiency: calculatedEff / 100,
        totalNG,
        ngRate: calculatedNGRate / 100,
        missingManpower: calculatedMissingMan,
      };

      if (isEditing && formData.id > 0) {
        await api.updateProductionRecord(formData.id, payload);
        setFeedback({ type: 'success', text: `Đã cập nhật bản ghi #${formData.id} thành công!` });
      } else {
        await api.createProductionRecord(payload);
        setFeedback({ type: 'success', text: 'Đã lưu bản ghi sản xuất mới vào Database!' });
      }

      onSuccess();
      loadRecords();
      setTimeout(() => {
        setActiveTab('table');
        setFeedback(null);
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Lỗi khi lưu dữ liệu.' });
    }
  };

  const handleEditClick = (rec: ProductionRecordCrud) => {
    setFormData({
      ...rec,
      date: rec.date.slice(0, 10),
    });
    setIsEditing(true);
    setActiveTab('form');
    setFeedback(null);
  };

  const handleDeleteClick = async (rec: ProductionRecordCrud) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bản ghi ngày ${rec.date.slice(0, 10)} của sản phẩm "${rec.productNameVi || rec.productCode}"?`)) {
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
    setIsEditing(false);
    setActiveTab('form');
    setFeedback(null);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1100px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
              }}
            >
              <ClipboardList size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Quản Lý Báo Cáo Sản Xuất (CRUD Database)
                </h2>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>
                  Lưu Trực Tiếp SQLite
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                Nhập mới, chỉnh sửa và xóa bản ghi sản lượng, nhân lực, phế phẩm NG & dừng máy
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className={`btn-secondary ${activeTab === 'table' ? 'active' : ''}`}
              onClick={() => setActiveTab('table')}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.8rem',
                borderColor: activeTab === 'table' ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                color: activeTab === 'table' ? 'var(--accent-cyan)' : 'var(--text-dim)',
              }}
            >
              <ClipboardList size={14} style={{ marginRight: '4px' }} />
              Danh Sách Dữ Liệu ({totalCount})
            </button>
            <button
              className={`btn-secondary ${activeTab === 'form' ? 'active' : ''}`}
              onClick={handleNewRecord}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.8rem',
                borderColor: activeTab === 'form' ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                color: activeTab === 'form' ? 'var(--accent-cyan)' : 'var(--text-dim)',
              }}
            >
              <Plus size={14} style={{ marginRight: '4px' }} />
              {isEditing ? 'Sửa Bản Ghi' : 'Thêm Mới Bản Ghi'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '0.4rem',
                marginLeft: '0.5rem',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              marginBottom: '0.85rem',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#f43f5e'}`,
              color: feedback.type === 'success' ? '#10b981' : '#f43f5e',
            }}
          >
            {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Tab 1: Form View */}
        {activeTab === 'form' && (
          <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', paddingRight: '0.3rem' }}>
            {/* Real-time Summary Pill */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Tỷ lệ đạt (Achieve)</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: calculatedAchieve >= 100 ? '#10b981' : calculatedAchieve >= 90 ? '#f59e0b' : '#f43f5e' }}>
                  {calculatedAchieve.toFixed(1)}%
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Năng suất UPH</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>
                  {calculatedUPH.toFixed(1)} <span style={{ fontSize: '0.7rem' }}>pcs/h</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Hiệu suất (Eff)</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#a855f7' }}>
                  {calculatedEff.toFixed(1)}%
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Tổng Phế Phẩm (NG)</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: totalNG > 50 ? '#f43f5e' : '#f59e0b' }}>
                  {totalNG} <span style={{ fontSize: '0.7rem' }}>cái ({calculatedNGRate.toFixed(2)}%)</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Thiếu nhân lực</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: calculatedMissingMan > 0 ? '#f43f5e' : '#10b981' }}>
                  {calculatedMissingMan} <span style={{ fontSize: '0.7rem' }}>người</span>
                </div>
              </div>
            </div>

            {/* Section 1: Thông tin cơ bản & Sản lượng */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.85rem' }}>
                <Sliders size={16} />
                <span>1. Thông Tin Chung & Sản Lượng Kế Hoạch / Thực Tế</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
                <div>
                  <label className="form-label">Ngày sản xuất</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Mã sản phẩm / Công đoạn</label>
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
                <div>
                  <label className="form-label">Ca làm việc</label>
                  <select
                    className="form-input"
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  >
                    <option value="Ca Ngày">Ca Ngày</option>
                    <option value="Ca Đêm">Ca Đêm</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Kế hoạch (Planned)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.plannedQuantity}
                    onChange={(e) => setFormData({ ...formData, plannedQuantity: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Thực tế (Actual)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.actualQuantity}
                    onChange={(e) => setFormData({ ...formData, actualQuantity: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">TCGC Tiêu chuẩn (giây)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.standardWorkingTime}
                    onChange={(e) => setFormData({ ...formData, standardWorkingTime: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">Giờ công thực tế (giờ)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={formData.workingHours}
                    onChange={(e) => setFormData({ ...formData, workingHours: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">Trạng thái</label>
                  <select
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Completed">Hoàn thành (Completed)</option>
                    <option value="In Progress">Đang chạy (In Progress)</option>
                    <option value="Scheduled">Lên lịch (Scheduled)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Nhân lực */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem' }}>
                <Users size={16} />
                <span>2. Bố Trí & Thiếu Hụt Nhân Lực</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
                <div>
                  <label className="form-label">Nhân lực kế hoạch (người)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.plannedManpower}
                    onChange={(e) => setFormData({ ...formData, plannedManpower: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">Nhân lực thực tế đi làm (người)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.actualManpower}
                    onChange={(e) => setFormData({ ...formData, actualManpower: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">Thiếu hụt tự tính (người)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={calculatedMissingMan}
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Chi tiết 11 lỗi phế phẩm NG */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem' }}>
                  <AlertTriangle size={16} />
                  <span>3. Phân Tích Chi Tiết 11 Loại Lỗi Phế Phẩm NG</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Tổng cộng: <strong style={{ color: '#f43f5e' }}>{totalNG} cái</strong> ({calculatedNGRate.toFixed(2)}%)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.65rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>XƯỚC (划伤)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.scratchNG}
                    onChange={(e) => setFormData({ ...formData, scratchNG: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>ÂM THANH (音频)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.audioNG}
                    onChange={(e) => setFormData({ ...formData, audioNG: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>MẺ (崩边)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.edgeChipNG}
                    onChange={(e) => setFormData({ ...formData, edgeChipNG: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>CÔNG NĂNG (功能)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.functionalNG}
                    onChange={(e) => setFormData({ ...formData, functionalNG: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>DÂY USB (想材)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.wireNG}
                    onChange={(e) => setFormData({ ...formData, wireNG: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>PCBA</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.pcbaNG}
                    onChange={(e) => setFormData({ ...formData, pcbaNG: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>THD</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.thdNG}
                    onChange={(e) => setFormData({ ...formData, thdNG: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>LỎM LOA</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.speakerNG}
                    onChange={(e) => setFormData({ ...formData, speakerNG: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>HỞ NẮP</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.coverNG}
                    onChange={(e) => setFormData({ ...formData, coverNG: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>NOMALI (异常)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.nomaliNG}
                    onChange={(e) => setFormData({ ...formData, nomaliNG: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>ĐỨT DÂY (断线)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.brokenWireNG}
                    onChange={(e) => setFormData({ ...formData, brokenWireNG: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Dừng máy & Ghi chú */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#a855f7', fontWeight: 700, fontSize: '0.85rem' }}>
                <Clock size={16} />
                <span>4. Thời Gian Dừng Máy (Downtime) & Ghi Chú</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
                <div>
                  <label className="form-label">Dừng máy (phút)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.downtimeMinutes}
                    onChange={(e) => setFormData({ ...formData, downtimeMinutes: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">Lý do dừng máy</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Kẹt khuôn dập, hỏng máy hàn, chờ NVL..."
                    value={formData.downtimeReason || ''}
                    onChange={(e) => setFormData({ ...formData, downtimeReason: e.target.value })}
                  />
                </div>
                <div>
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
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Ghi chú sản xuất</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nhập ghi chú bổ sung..."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Submit Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveTab('table')}
              >
                Hủy / Quay lại Bảng
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.4rem' }}
              >
                <Save size={16} />
                <span>{isEditing ? 'Lưu Cập Nhật Bản Ghi' : 'Lưu Bản Ghi Mới Vào Database'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Table View */}
        {activeTab === 'table' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tìm theo sản phẩm, ghi chú..."
                  style={{ paddingLeft: '32px', fontSize: '0.78rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="form-input"
                style={{ width: 'auto', fontSize: '0.78rem' }}
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
                style={{ width: 'auto', fontSize: '0.78rem' }}
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
              >
                <option value="all">Tất cả ca</option>
                <option value="Ca Ngày">Ca Ngày</option>
                <option value="Ca Đêm">Ca Đêm</option>
              </select>

              <button
                className="btn-primary"
                onClick={handleNewRecord}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Plus size={14} />
                <span>Thêm Mới</span>
              </button>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                <thead style={{ background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', textAlign: 'left' }}>
                    <th style={{ padding: '0.55rem 0.6rem' }}>Ngày</th>
                    <th style={{ padding: '0.55rem 0.6rem' }}>Sản phẩm</th>
                    <th style={{ padding: '0.55rem 0.6rem' }}>Ca</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>Kế hoạch</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>Thực tế</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>Đạt %</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>UPH</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>Nhân lực</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>Tổng NG</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>Dừng máy</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                        Đang tải dữ liệu từ database...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                        Không có bản ghi nào phù hợp. Bấm "Thêm Mới" để tạo bản ghi đầu tiên!
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => {
                      const achievePct = (r.achievementRate * 100);
                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>{r.date.slice(0, 10)}</td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{r.productNameVi || r.productCode}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{r.productCode}</div>
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-dim)' }}>{r.shift}</td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>{r.plannedQuantity.toLocaleString()}</td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontWeight: 700 }}>
                            {r.actualQuantity.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: achievePct >= 100 ? 'rgba(16, 185, 129, 0.15)' : achievePct >= 90 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                color: achievePct >= 100 ? '#10b981' : achievePct >= 90 ? '#f59e0b' : '#f43f5e',
                              }}
                            >
                              {achievePct.toFixed(1)}%
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontWeight: 600, color: '#38bdf8' }}>
                            {r.uph.toFixed(1)}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                            {r.actualManpower}/{r.plannedManpower}
                            {r.missingManpower > 0 && (
                              <span style={{ color: '#f43f5e', fontSize: '0.65rem', marginLeft: '3px' }}>
                                (-{r.missingManpower})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                            <span style={{ color: r.totalNG > 0 ? '#f59e0b' : 'var(--text-dim)' }}>
                              {r.totalNG} ({((r.ngRate || 0) * 100).toFixed(1)}%)
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                            {r.downtimeMinutes > 0 ? (
                              <span style={{ color: '#f43f5e', fontWeight: 600 }}>{r.downtimeMinutes}m</span>
                            ) : (
                              <span style={{ color: 'var(--text-dim)' }}>0m</span>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                              <button
                                onClick={() => handleEditClick(r)}
                                title="Chỉnh sửa bản ghi"
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  color: '#38bdf8',
                                  borderRadius: '6px',
                                  padding: '4px 7px',
                                  cursor: 'pointer',
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
                                  borderRadius: '6px',
                                  padding: '4px 7px',
                                  cursor: 'pointer',
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              <div>
                Tổng số <strong>{totalCount}</strong> bản ghi | Trang {currentPage}/{totalPages}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  className="btn-secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '0.25rem 0.6rem' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="btn-secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: '0.25rem 0.6rem' }}
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
