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
  Boxes,
  Layers,
  Calculator,
  AlertTriangle,
  PackageCheck,
  Building2,
  Wrench,
  Activity,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { InventoryAuditItem } from '../types/dashboard';

interface InventoryCrudModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialStage?: string;
}

const STAGES = [
  { key: 'SPK,MIC D6', label: 'SPK, MIC D6 🎧' },
  { key: 'ĐAI ĐẦU D6', label: 'ĐAI ĐẦU D6 👑' },
  { key: 'LẮP RÁP D6', label: 'LẮP RÁP D6 ⚙️' },
  { key: 'ĐÓNG GÓI D6', label: 'ĐÓNG GÓI D6 📦' },
];

const INITIAL_FORM: InventoryAuditItem = {
  id: 0,
  stage: 'LẮP RÁP D6',
  section: '组装LẮP RÁP D6',
  materialCode: '',
  usagePerUnit: 1,
  auditRequired: 2200,
  rawMaterialWarehouse: 1500,
  rawMaterialLine: 400,
  semiFinishedGoods: 200,
  semiFinishedGoods2: 50,
  repairRoom: 20,
  failureAnalysisFa: 10,
  finishedGoods: 0,
  discrepancy: -20,
  ngQuantity: 15,
};

export const InventoryCrudModal: React.FC<InventoryCrudModalProps> = ({ onClose, onSuccess, initialStage }) => {
  const [activeTab, setActiveTab] = useState<'table' | 'form'>('table');
  const [formData, setFormData] = useState<InventoryAuditItem>({
    ...INITIAL_FORM,
    stage: initialStage || 'LẮP RÁP D6',
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Table state
  const [items, setItems] = useState<InventoryAuditItem[]>([]);
  const [filterStage, setFilterStage] = useState<string>(initialStage || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto calculate discrepancy
  const calculateDiscrepancy = (item: InventoryAuditItem): number => {
    const rawWh = Number(item.rawMaterialWarehouse || 0);
    const rawLine = Number(item.rawMaterialLine || 0);
    const semi1 = Number(item.semiFinishedGoods || 0);
    const semi2 = Number(item.semiFinishedGoods2 || 0);
    const repair = Number(item.repairRoom || 0);
    const fa = Number(item.failureAnalysisFa || 0);
    const finished = Number(item.finishedGoods || 0);
    const req = Number(item.auditRequired || 0);

    if (item.stage.includes('ĐÓNG GÓI') || item.stage.includes('包装')) {
      return (rawWh + rawLine + finished) - req;
    }
    if (item.stage.includes('LẮP RÁP') || item.stage.includes('组装')) {
      return (rawWh + rawLine + semi1 + semi2 + repair + fa) - req;
    }
    return (rawWh + rawLine + semi1 + semi2 + finished) - req;
  };

  const currentDiscrepancy = calculateDiscrepancy(formData);

  const totalCurrentStock =
    Number(formData.rawMaterialWarehouse || 0) +
    Number(formData.rawMaterialLine || 0) +
    Number(formData.semiFinishedGoods || 0) +
    Number(formData.semiFinishedGoods2 || 0) +
    Number(formData.repairRoom || 0) +
    Number(formData.failureAnalysisFa || 0) +
    Number(formData.finishedGoods || 0);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getInventoryAudit({
        stage: filterStage === 'all' ? undefined : filterStage,
        search: searchTerm,
      });
      setItems(res.items || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStage, searchTerm]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterStatus === 'balanced') return item.discrepancy === 0;
      if (filterStatus === 'shortage') return item.discrepancy < 0;
      if (filterStatus === 'surplus') return item.discrepancy > 0;
      if (filterStatus === 'ng') return item.ngQuantity > 0;
      return true;
    });
  }, [items, filterStatus]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const payload: Partial<InventoryAuditItem> = {
        ...formData,
        discrepancy: currentDiscrepancy,
      };

      if (isEditing && formData.id > 0) {
        await api.updateInventoryRecord(formData.id, payload);
        setFeedback({ type: 'success', text: `Đã cập nhật mã liệu #${formData.id} (${formData.materialCode}) thành công!` });
      } else {
        await api.createInventoryRecord(payload);
        setFeedback({ type: 'success', text: `Đã lưu mã liệu mới "${formData.materialCode}" vào Database!` });
      }

      onSuccess();
      loadData();
      setTimeout(() => {
        setActiveTab('table');
        setFeedback(null);
      }, 1000);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Lỗi khi lưu dữ liệu kiểm kê.' });
    }
  };

  const handleEditClick = (item: InventoryAuditItem) => {
    setFormData({ ...item });
    setIsEditing(true);
    setActiveTab('form');
    setFeedback(null);
  };

  const handleDeleteClick = async (item: InventoryAuditItem) => {
    if (!window.confirm(`Xác nhận xóa mã liệu "${item.materialCode}" (${item.stage})?`)) {
      return;
    }
    try {
      await api.deleteInventoryRecord(item.id);
      onSuccess();
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa mã liệu.');
    }
  };

  const handleNewRecord = () => {
    setFormData({
      ...INITIAL_FORM,
      stage: filterStage !== 'all' ? filterStage : 'LẮP RÁP D6',
      materialCode: '',
    });
    setIsEditing(false);
    setActiveTab('form');
    setFeedback(null);
  };

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
                background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                flexShrink: 0,
              }}
            >
              <Boxes size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                  Phiếu Kiểm Kê & Quản Lý Tồn Kho (D6 Audit)
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontWeight: 700,
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  Kho & WIP
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                Kiểm kê liệu nguyên kho, ngoài chuyền, bán thành phẩm WIP, hàng sửa & thành phẩm
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
                <Boxes size={14} />
                <span>Danh Sách Liệu ({filteredItems.length})</span>
              </button>
              <button
                className={`modern-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
                onClick={handleNewRecord}
              >
                <Plus size={14} />
                <span>{isEditing ? 'Sửa Mã Liệu' : 'Thêm Mã Liệu'}</span>
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.65rem',
                marginBottom: '1rem',
              }}
            >
              <div className="form-kpi-pill">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Cần Kiểm (应盘)</span>
                  <PackageCheck size={14} color="var(--accent-cyan)" />
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {Number(formData.auditRequired || 0).toLocaleString()}
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Hạn mức định lượng</span>
              </div>

              <div className="form-kpi-pill">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Tổng Tồn Đếm Được</span>
                  <Boxes size={14} color="#38bdf8" />
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                  {totalCurrentStock.toLocaleString()}
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Kho + Line + WIP</span>
              </div>

              <div className="form-kpi-pill">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Chênh Lệch Đối Soát</span>
                  <Calculator size={14} color={currentDiscrepancy === 0 ? '#10b981' : currentDiscrepancy > 0 ? '#f59e0b' : '#f43f5e'} />
                </div>
                <div
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: currentDiscrepancy === 0 ? '#10b981' : currentDiscrepancy > 0 ? '#f59e0b' : '#f43f5e',
                  }}
                >
                  {currentDiscrepancy > 0 ? `+${currentDiscrepancy.toLocaleString()}` : currentDiscrepancy.toLocaleString()}
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    color: currentDiscrepancy === 0 ? '#10b981' : currentDiscrepancy > 0 ? '#f59e0b' : '#f43f5e',
                  }}
                >
                  {currentDiscrepancy === 0 ? '🟢 Cân bằng tuyệt đối' : currentDiscrepancy > 0 ? '🟡 Dư thừa hàng' : '🔴 Thiếu hụt vật tư'}
                </span>
              </div>

              <div className="form-kpi-pill">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Phế Phẩm NG</span>
                  <AlertTriangle size={14} color={Number(formData.ngQuantity || 0) > 0 ? '#f43f5e' : '#10b981'} />
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: Number(formData.ngQuantity || 0) > 0 ? '#f43f5e' : '#10b981' }}>
                  {Number(formData.ngQuantity || 0).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>cái</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Hàng lỗi cần loại thải</span>
              </div>
            </div>

            {/* Section 1: Định Danh Mã Vật Tư & Phân Khu */}
            <div className="form-section-card">
              <div className="form-section-title" style={{ color: 'var(--accent-cyan)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <Layers size={18} />
                  <span>1. ĐỊNH DANH MÃ VẬT TƯ & CÔNG ĐOẠN KIỂM KÊ</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Thông tin mã liệu</span>
              </div>

              {/* Visual Stage Selector */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ marginBottom: '6px' }}>Chọn công đoạn kiểm kê</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {STAGES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      className={`shift-pill-btn ${formData.stage === s.key ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, stage: s.key })}
                      style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-field-group">
                  <label className="form-label">Phân khu (Section)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: 组装LẮP RÁP D6, 喇叭SPK..."
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">Mã liệu (料号 - Material Code)</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                    placeholder="VD: 13700-L900000H-00"
                    value={formData.materialCode}
                    onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">Lượng dùng / cái (Usage Per Unit)</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      step="0.1"
                      className="form-input form-input-with-addon"
                      value={formData.usagePerUnit}
                      onChange={(e) => setFormData({ ...formData, usagePerUnit: Number(e.target.value) })}
                    />
                    <span className="form-input-addon">pcs/sp</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Cần kiểm (应盘 - Audit Required)</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.auditRequired}
                      onChange={(e) => setFormData({ ...formData, auditRequired: Number(e.target.value) })}
                      required
                    />
                    <span className="form-input-addon">pcs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Chi Tiết Số Liệu Tồn Kho */}
            <div className="form-section-card">
              <div className="form-section-title" style={{ color: '#10b981' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <Calculator size={18} />
                  <span>2. CHI TIẾT TỒN KHO NGUYÊN LIỆU, CHUYỀN & BÁN THÀNH PHẨM WIP</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Đếm thực tế các vị trí</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-field-group">
                  <label className="form-label">Liệu nguyên kho (Raw Warehouse)</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.rawMaterialWarehouse}
                      onChange={(e) => setFormData({ ...formData, rawMaterialWarehouse: Number(e.target.value) })}
                    />
                    <span className="form-input-addon">pcs</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Ngoài chuyền (Line)</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.rawMaterialLine}
                      onChange={(e) => setFormData({ ...formData, rawMaterialLine: Number(e.target.value) })}
                    />
                    <span className="form-input-addon">pcs</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label">BTP 1 / Đã lắp MIC (Semi 1)</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.semiFinishedGoods}
                      onChange={(e) => setFormData({ ...formData, semiFinishedGoods: Number(e.target.value) })}
                    />
                    <span className="form-input-addon">pcs</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label">BTP 2 / Chờ nhập kho (Semi 2)</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.semiFinishedGoods2}
                      onChange={(e) => setFormData({ ...formData, semiFinishedGoods2: Number(e.target.value) })}
                    />
                    <span className="form-input-addon">pcs</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Phòng sửa hàng (Repair Room)</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.repairRoom}
                      onChange={(e) => setFormData({ ...formData, repairRoom: Number(e.target.value) })}
                    />
                    <span className="form-input-addon">pcs</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Phòng phân tích FA (Failure Analysis)</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.failureAnalysisFa}
                      onChange={(e) => setFormData({ ...formData, failureAnalysisFa: Number(e.target.value) })}
                    />
                    <span className="form-input-addon">pcs</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Thành phẩm hoàn tất (Finished Goods)</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.finishedGoods}
                      onChange={(e) => setFormData({ ...formData, finishedGoods: Number(e.target.value) })}
                    />
                    <span className="form-input-addon">pcs</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-label">Phế phẩm NG (NG Quantity)</label>
                  <div className="form-input-wrapper">
                    <input
                      type="number"
                      className="form-input form-input-with-addon"
                      value={formData.ngQuantity}
                      onChange={(e) => setFormData({ ...formData, ngQuantity: Number(e.target.value) })}
                    />
                    <span className="form-input-addon" style={{ color: '#f43f5e' }}>cái</span>
                  </div>
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
                  background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
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
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Save size={16} />
                <span>{isEditing ? 'Lưu Cập Nhật Mã Liệu' : 'Lưu Mã Liệu Mới Vào Database'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Table View */}
        {activeTab === 'table' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '1.25rem 1.75rem' }}>
            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tìm kiếm mã liệu, phân khu..."
                  style={{ paddingLeft: '36px', height: '38px', fontSize: '0.82rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="form-input"
                style={{ width: 'auto', height: '38px', fontSize: '0.82rem' }}
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
              >
                <option value="all">Tất cả công đoạn</option>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>

              <select
                className="form-input"
                style={{ width: 'auto', height: '38px', fontSize: '0.82rem' }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="balanced">🟢 Cân bằng (Chênh lệch = 0)</option>
                <option value="shortage">🔴 Thiếu hụt (Chênh lệch &lt; 0)</option>
                <option value="surplus">🟡 Dư thừa (Chênh lệch &gt; 0)</option>
                <option value="ng">⚠️ Có phế phẩm NG</option>
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
                  background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                  borderRadius: '10px',
                }}
              >
                <Plus size={15} />
                <span>+ Thêm Mã Liệu</span>
              </button>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-card)', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead style={{ background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 0.85rem' }}>Công đoạn</th>
                    <th style={{ padding: '0.75rem 0.85rem' }}>Phân khu</th>
                    <th style={{ padding: '0.75rem 0.85rem' }}>Mã liệu (料号)</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Cần kiểm</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Nguyên kho</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Ngoài chuyền</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>BTP 1</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Chênh lệch</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>NG</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                        Đang nạp dữ liệu kiểm kê tồn kho...
                      </td>
                    </tr>
                  ) : paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                        Không có mã liệu nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.035)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#10b981',
                            }}
                          >
                            {item.stage}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                          {item.section}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                          {item.materialCode}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {item.auditRequired.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {item.rawMaterialWarehouse.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {item.rawMaterialLine.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {item.semiFinishedGoods.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              background: item.discrepancy === 0 ? 'rgba(16, 185, 129, 0.15)' : item.discrepancy > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                              color: item.discrepancy === 0 ? '#10b981' : item.discrepancy > 0 ? '#f59e0b' : '#f43f5e',
                            }}
                          >
                            {item.discrepancy > 0 ? `+${item.discrepancy.toLocaleString()}` : item.discrepancy.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                          <span style={{ color: item.ngQuantity > 0 ? '#f43f5e' : 'var(--text-dim)', fontWeight: 600 }}>
                            {item.ngQuantity}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleEditClick(item)}
                              title="Sửa mã liệu"
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
                              onClick={() => handleDeleteClick(item)}
                              title="Xóa mã liệu"
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
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.85rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              <div>
                Tổng cộng <strong>{filteredItems.length}</strong> mã liệu | Trang {currentPage}/{totalPages}
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
