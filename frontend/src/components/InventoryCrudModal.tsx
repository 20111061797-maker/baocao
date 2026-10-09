import React, { useState, useEffect } from 'react';
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
  PackageCheck
} from 'lucide-react';
import { api } from '../services/api';
import { InventoryAuditItem } from '../types/dashboard';

interface InventoryCrudModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialStage?: string;
}

const STAGES = ['SPK,MIC D6', 'ĐAI ĐẦU D6', 'LẮP RÁP D6', 'ĐÓNG GÓI D6'];

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
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, balanced, shortage, surplus, ng
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

  // Filter items by status
  const filteredItems = items.filter((item) => {
    if (filterStatus === 'balanced') return item.discrepancy === 0;
    if (filterStatus === 'shortage') return item.discrepancy < 0;
    if (filterStatus === 'surplus') return item.discrepancy > 0;
    if (filterStatus === 'ng') return item.ngQuantity > 0;
    return true;
  });

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.materialCode.trim()) {
      setFeedback({ type: 'error', text: 'Vui lòng nhập Mã Liệu (Material Code)!' });
      return;
    }

    setFeedback(null);
    try {
      const payload: Partial<InventoryAuditItem> = {
        ...formData,
        materialCode: formData.materialCode.trim(),
        discrepancy: currentDiscrepancy,
      };

      if (isEditing && formData.id > 0) {
        await api.updateInventoryRecord(formData.id, payload);
        setFeedback({ type: 'success', text: `Đã cập nhật mã liệu "${formData.materialCode}" thành công!` });
      } else {
        await api.createInventoryRecord(payload);
        setFeedback({ type: 'success', text: `Đã thêm mã liệu "${formData.materialCode}" vào Database!` });
      }

      onSuccess();
      loadData();
      setTimeout(() => {
        setActiveTab('table');
        setFeedback(null);
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Lỗi khi lưu mã kiểm kê.' });
    }
  };

  const handleEditClick = (item: InventoryAuditItem) => {
    setFormData(item);
    setIsEditing(true);
    setActiveTab('form');
    setFeedback(null);
  };

  const handleDeleteClick = async (item: InventoryAuditItem) => {
    if (!window.confirm(`Bạn có chắc muốn xóa mã liệu "${item.materialCode}" khỏi công đoạn "${item.stage}"?`)) {
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

  const handleNewItem = () => {
    setFormData({
      ...INITIAL_FORM,
      stage: filterStage !== 'all' ? filterStage : 'LẮP RÁP D6',
      section: filterStage !== 'all' ? filterStage : '组装LẮP RÁP D6',
    });
    setIsEditing(false);
    setActiveTab('form');
    setFeedback(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1140px',
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
                background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Boxes size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Quản Lý Kiểm Kê Vật Tư & WIP (CRUD D6)
                </h2>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  4 Công Đoạn D6
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                Thêm, sửa tồn kho, đối soát chênh lệch âm/dương và phế phẩm NG theo từng mã linh kiện
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
              <Layers size={14} style={{ marginRight: '4px' }} />
              Bảng Danh Sách ({items.length})
            </button>
            <button
              className={`btn-secondary ${activeTab === 'form' ? 'active' : ''}`}
              onClick={handleNewItem}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.8rem',
                borderColor: activeTab === 'form' ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                color: activeTab === 'form' ? 'var(--accent-cyan)' : 'var(--text-dim)',
              }}
            >
              <Plus size={14} style={{ marginRight: '4px' }} />
              {isEditing ? 'Sửa Mã Liệu' : 'Thêm Mã Liệu Mới'}
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
            {/* Calculation Status Box */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Cần Kiểm (应盘)</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  {Number(formData.auditRequired || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Tổng Tồn Hiện Tại</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>
                  {(
                    Number(formData.rawMaterialWarehouse || 0) +
                    Number(formData.rawMaterialLine || 0) +
                    Number(formData.semiFinishedGoods || 0) +
                    Number(formData.semiFinishedGoods2 || 0) +
                    Number(formData.repairRoom || 0) +
                    Number(formData.failureAnalysisFa || 0) +
                    Number(formData.finishedGoods || 0)
                  ).toLocaleString()}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Chênh Lệch Đối Soát</span>
                <div
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: currentDiscrepancy === 0 ? '#10b981' : currentDiscrepancy > 0 ? '#f59e0b' : '#f43f5e',
                  }}
                >
                  {currentDiscrepancy > 0 ? `+${currentDiscrepancy.toLocaleString()}` : currentDiscrepancy.toLocaleString()}
                  <span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>
                    ({currentDiscrepancy === 0 ? 'Cân bằng' : currentDiscrepancy > 0 ? 'Thừa hàng' : 'Thiếu hụt / Âm kho'})
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Lượng Phế Phẩm (NG)</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: Number(formData.ngQuantity || 0) > 0 ? '#f43f5e' : '#10b981' }}>
                  {Number(formData.ngQuantity || 0).toLocaleString()} cái
                </div>
              </div>
            </div>

            {/* Group 1: Thông tin công đoạn & mã liệu */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.85rem' }}>
                <Layers size={16} />
                <span>1. Định Danh Mã Vật Tư & Phân Khu Công Đoạn</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
                <div>
                  <label className="form-label">Công đoạn kiểm kê</label>
                  <select
                    className="form-input"
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Phân khu (Section)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: 组装LẮP RÁP D6, 喇叭SPK..."
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Mã liệu (料号 - Material Code)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: 13700-L900000H-00"
                    value={formData.materialCode}
                    onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Lượng dùng / cái (Usage Per Unit)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={formData.usagePerUnit}
                    onChange={(e) => setFormData({ ...formData, usagePerUnit: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Group 2: Số liệu đối soát tồn kho */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>
                <Calculator size={16} />
                <span>2. Chi Tiết Tồn Kho, Ngoài Chuyền & Bán Thành Phẩm WIP</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
                <div>
                  <label className="form-label">Cần kiểm (应盘 - Audit Required)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.auditRequired}
                    onChange={(e) => setFormData({ ...formData, auditRequired: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Kho nguyên liệu (Raw Material Warehouse)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.rawMaterialWarehouse}
                    onChange={(e) => setFormData({ ...formData, rawMaterialWarehouse: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">Ngoài chuyền (Raw Material Line)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.rawMaterialLine}
                    onChange={(e) => setFormData({ ...formData, rawMaterialLine: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">BTP 1 / Đã lắp MIC (Semi Finished)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.semiFinishedGoods}
                    onChange={(e) => setFormData({ ...formData, semiFinishedGoods: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">BTP 2 / Chờ nhập kho (Semi Finished 2)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.semiFinishedGoods2}
                    onChange={(e) => setFormData({ ...formData, semiFinishedGoods2: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">Phòng sửa hàng (Repair Room)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.repairRoom}
                    onChange={(e) => setFormData({ ...formData, repairRoom: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">Phòng phân tích FA (Failure Analysis)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.failureAnalysisFa}
                    onChange={(e) => setFormData({ ...formData, failureAnalysisFa: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">Thành phẩm hoàn tất (Finished Goods)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.finishedGoods}
                    onChange={(e) => setFormData({ ...formData, finishedGoods: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">Phế phẩm NG (NG Quantity)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.ngQuantity}
                    onChange={(e) => setFormData({ ...formData, ngQuantity: Number(e.target.value) })}
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
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.4rem', background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' }}
              >
                <Save size={16} />
                <span>{isEditing ? 'Lưu Cập Nhật Mã Liệu' : 'Lưu Mã Liệu Mới Vào Database'}</span>
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
                  placeholder="Tìm theo mã liệu, phân khu..."
                  style={{ paddingLeft: '32px', fontSize: '0.78rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="form-input"
                style={{ width: 'auto', fontSize: '0.78rem' }}
                value={filterStage}
                onChange={(e) => {
                  setFilterStage(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả công đoạn (4 Tabs)</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                className="form-input"
                style={{ width: 'auto', fontSize: '0.78rem' }}
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="balanced">Cân bằng (= 0)</option>
                <option value="shortage">Thiếu hụt / Âm kho (&lt; 0)</option>
                <option value="surplus">Thừa hàng (&gt; 0)</option>
                <option value="ng">Có phát sinh NG</option>
              </select>

              <button
                className="btn-primary"
                onClick={handleNewItem}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' }}
              >
                <Plus size={14} />
                <span>Thêm Mã Liệu</span>
              </button>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                <thead style={{ background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', textAlign: 'left' }}>
                    <th style={{ padding: '0.55rem 0.6rem' }}>Công đoạn</th>
                    <th style={{ padding: '0.55rem 0.6rem' }}>Mã liệu (料号)</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>Lượng dùng</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>Cần kiểm</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>Kho NVL</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>Ngoài chuyền</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>BTP (WIP)</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>Thành phẩm</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>Chênh lệch</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right' }}>NG</th>
                    <th style={{ padding: '0.55rem 0.6rem', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                        Đang nạp danh sách vật tư kiểm kê...
                      </td>
                    </tr>
                  ) : paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                        Không tìm thấy mã liệu nào. Bấm "Thêm Mã Liệu" để thêm mới!
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const wipTotal = (item.semiFinishedGoods || 0) + (item.semiFinishedGoods2 || 0) + (item.repairRoom || 0) + (item.failureAnalysisFa || 0);
                      const isBalanced = item.discrepancy === 0;
                      const isShortage = item.discrepancy < 0;

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '0.5rem 0.6rem' }}>
                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.12)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                              {item.stage}
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>
                            <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-main)' }}>
                              {item.materialCode}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{item.section}</div>
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>{item.usagePerUnit}</td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontWeight: 600 }}>
                            {item.auditRequired.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                            {item.rawMaterialWarehouse.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                            {item.rawMaterialLine.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                            {wipTotal > 0 ? (
                              <span style={{ color: '#38bdf8' }}>{wipTotal.toLocaleString()}</span>
                            ) : (
                              <span style={{ color: 'var(--text-dim)' }}>0</span>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                            {item.finishedGoods.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: isBalanced ? 'rgba(16, 185, 129, 0.15)' : isShortage ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: isBalanced ? '#10b981' : isShortage ? '#f43f5e' : '#f59e0b',
                              }}
                            >
                              {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                            {item.ngQuantity > 0 ? (
                              <span style={{ color: '#f43f5e', fontWeight: 600 }}>{item.ngQuantity.toLocaleString()}</span>
                            ) : (
                              <span style={{ color: 'var(--text-dim)' }}>0</span>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                              <button
                                onClick={() => handleEditClick(item)}
                                title="Chỉnh sửa mã liệu"
                                style={{
                                  background: 'rgba(6, 182, 212, 0.15)',
                                  border: '1px solid rgba(6, 182, 212, 0.3)',
                                  color: 'var(--accent-cyan)',
                                  borderRadius: '6px',
                                  padding: '4px 7px',
                                  cursor: 'pointer',
                                }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(item)}
                                title="Xóa mã liệu khỏi database"
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
                Hiển thị <strong>{filteredItems.length}</strong> mã liệu | Trang {currentPage}/{totalPages}
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
