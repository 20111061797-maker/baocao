import React, { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, Boxes, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

interface UploadExcelModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onOpenAudit?: () => void;
}

export const UploadExcelModal: React.FC<UploadExcelModalProps> = ({ onClose, onSuccess, onOpenAudit }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{ isInventory?: boolean; count?: number } | null>(null);

  const isInventoryFile = file?.name
    ? /kiem\s*ke|kiểm\s*kê|kiemke|d6|audit|inventory/i.test(file.name)
    : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setMessage(null);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.uploadExcel(file);
      setMessage(res.message);
      setUploadResult({
        isInventory: res.isInventory ?? isInventoryFile,
        count: res.count
      });
      onSuccess();
      // If it's not inventory, auto-close after 1.8s
      if (!isInventoryFile && !res.isInventory) {
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi nhập file Excel.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa toàn bộ dữ liệu trong hệ thống? Sau khi xóa, bạn có thể tự import file Excel mới.')) return;
    setIsUploading(true);
    setError(null);
    try {
      const res = await api.clearProductionData();
      setMessage(res.message);
      setUploadResult(null);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa dữ liệu.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSeedData = async () => {
    setIsUploading(true);
    setError(null);
    try {
      const res = await api.seedSampleData();
      setMessage(res.message);
      setUploadResult(null);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi nạp lại dữ liệu.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileSpreadsheet size={22} color="var(--accent-emerald)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Nhập Dữ Liệu Báo Cáo Excel
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            border: '2px dashed var(--border-card)',
            borderRadius: '10px',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-input)',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
          onClick={() => document.getElementById('excelFileInput')?.click()}
        >
          <input
            id="excelFileInput"
            type="file"
            accept=".xlsx, .xls"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <UploadCloud size={38} color="var(--accent-cyan)" style={{ margin: '0 auto 0.6rem auto' }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {file ? file.name : 'Kéo thả file Excel vào đây hoặc Nhấn để duyệt'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
            Hỗ trợ định dạng .xlsx (Báo Cáo Sản Xuất Tổng Hợp hoặc File Kiểm Kê Vật Tư D6)
          </div>
        </div>

        {/* File Type Detection Hint */}
        {file && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              background: isInventoryFile ? 'rgba(6, 182, 212, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${isInventoryFile ? 'rgba(6, 182, 212, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              color: isInventoryFile ? 'var(--accent-cyan)' : 'var(--accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isInventoryFile ? <Boxes size={16} /> : <FileSpreadsheet size={16} />}
            <div>
              {isInventoryFile ? (
                <>
                  <strong>File Kiểm kê vật tư D6</strong>: Dữ liệu mã liệu, tồn kho, WIP & NG đối soát (xem tại mục <em>"Kiểm kê Nguyên vật liệu"</em>).
                </>
              ) : (
                <>
                  <strong>File Báo cáo sản xuất</strong>: Dữ liệu sản lượng kế hoạch/thực tế, nhân lực, UPH & lỗi NG (hiển thị trên <em>Dashboard chính</em>).
                </>
              )}
            </div>
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.85rem', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={16} />
              <span>{message}</span>
            </div>

            {uploadResult?.isInventory && onOpenAudit && (
              <div style={{ marginTop: '0.35rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(16, 185, 129, 0.3)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    onClose();
                    onOpenAudit();
                  }}
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.35rem 0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'
                  }}
                >
                  <Boxes size={14} />
                  <span>Mở Bảng Kiểm Kê D6 Xem Ngay</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{ marginTop: '0.85rem', padding: '0.6rem 0.8rem', borderRadius: '6px', backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid #f43f5e', color: '#f43f5e', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Database Control Actions */}
        <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Quản lý Database:
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClearData}
              disabled={isUploading}
              style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.3)' }}
              title="Xóa sạch dữ liệu để tự import từ đầu"
            >
              Xóa sạch dữ liệu (Về 0)
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSeedData}
              disabled={isUploading}
              style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem', color: 'var(--accent-cyan)' }}
              title="Nạp lại dữ liệu từ 2 file Excel có sẵn"
            >
              Nạp lại file mẫu
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.25rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isUploading}>
            Đóng
          </button>
          <button type="button" className="btn-primary" onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? 'Đang phân tích...' : 'Bắt đầu Nhập File'}
          </button>
        </div>
      </div>
    </div>
  );
};
