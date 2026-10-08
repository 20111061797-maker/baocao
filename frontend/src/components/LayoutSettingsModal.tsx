import React, { useState } from 'react';
import { X, Sliders, CheckSquare, Square, Save, RotateCcw } from 'lucide-react';
import { api } from '../services/api';
import { UserLayoutConfig } from '../types/dashboard';

interface LayoutSettingsModalProps {
  onClose: () => void;
  visibleWidgets: string[];
  onToggleWidget: (widgetId: string) => void;
  shortageThreshold: number;
  onThresholdChange: (threshold: number) => void;
  onResetLayout: () => void;
}

export const LayoutSettingsModal: React.FC<LayoutSettingsModalProps> = ({
  onClose,
  visibleWidgets,
  onToggleWidget,
  shortageThreshold,
  onThresholdChange,
  onResetLayout,
}) => {
  const [thresholdInput, setThresholdInput] = useState((shortageThreshold * 100).toString());
  const [isSaving, setIsSaving] = useState(false);

  const availableWidgets = [
    { id: 'kpi', label: '1. Thẻ chỉ số tổng quan (KPI Cards)' },
    { id: 'planVsActual', label: '2. Biểu đồ Kế hoạch vs Thực tế (Plan vs Actual Trend)' },
    { id: 'productionByProduct', label: '3. Sản lượng theo Sản phẩm (Production by Product)' },
    { id: 'performance', label: '4. Hiệu suất & Giờ công (Efficiency Analysis)' },
    { id: 'manpower', label: '5. Phân tích Nhân lực & Thiếu hụt (Manpower Analysis)' },
    { id: 'qualityPareto', label: '6. Biểu đồ Pareto Lỗi chất lượng (Quality Pareto Chart)' },
    { id: 'defectHeatmap', label: '7. Bản đồ nhiệt Lỗi theo Sản phẩm (Defect Heatmap)' },
    { id: 'downtime', label: '8. Phân tích Dừng máy (Downtime Analysis)' },
    { id: 'uph', label: '9. Phân tích Năng suất UPH (UPH Dashboard)' },
    { id: 'inventoryAudit', label: '10. Đối soát Kiểm kê Vật tư 4 Tabs (Inventory Audit D6)' },
    { id: 'productMatrix', label: '11. Bảng Ma trận Hiệu suất (Product Performance Matrix)' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    const parsedThreshold = parseFloat(thresholdInput) / 100.0;
    if (!isNaN(parsedThreshold) && parsedThreshold > 0) {
      onThresholdChange(parsedThreshold);
    }
    try {
      await api.saveLayoutConfig({
        widgetsJson: JSON.stringify(visibleWidgets),
        manpowerShortageThreshold: !isNaN(parsedThreshold) ? parsedThreshold : 0.10,
      });
      alert('Đã lưu cấu hình giao diện thành công!');
      onClose();
    } catch (e: any) {
      alert('Lỗi lưu cấu hình: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sliders size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Tùy Biến Bố Cục & Cài Đặt Dashboard
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Section 1: Widget Visibility */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase' }}>
            Hiển thị / Ẩn các Module tiện ích:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '280px', overflowY: 'auto' }}>
            {availableWidgets.map((w) => {
              const isChecked = visibleWidgets.includes(w.id);
              return (
                <div
                  key={w.id}
                  onClick={() => onToggleWidget(w.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    background: isChecked ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-input)',
                    border: '1px solid',
                    borderColor: isChecked ? 'rgba(6, 182, 212, 0.3)' : 'var(--border-subtle)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    color: isChecked ? 'var(--text-main)' : 'var(--text-dim)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isChecked ? (
                    <CheckSquare size={16} color="var(--accent-cyan)" />
                  ) : (
                    <Square size={16} color="var(--text-dim)" />
                  )}
                  <span style={{ fontWeight: isChecked ? 600 : 400 }}>{w.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Threshold Config */}
        <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Ngưỡng Cảnh Báo Thiếu Hụt Nhân Lực (%)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
            <input
              type="number"
              min="1"
              max="50"
              className="select-custom"
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              style={{ width: '80px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              % (Hệ thống sẽ bật cảnh báo đỏ khi tỷ lệ vắng mặt vượt mức này)
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-card)' }}>
          <button className="btn-secondary" onClick={onResetLayout} style={{ fontSize: '0.78rem' }}>
            <RotateCcw size={14} /> Khôi phục Mặc định
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Đóng
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
              <Save size={14} /> {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
