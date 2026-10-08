import React, { useState } from 'react';
import {
  Activity,
  Moon,
  Sun,
  Globe,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Printer,
  Sliders,
  ShieldCheck,
  UploadCloud,
  FileText,
  Boxes
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { api } from '../services/api';
import { DashboardFilter } from '../types/dashboard';

interface HeaderProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  filter: DashboardFilter;
  onOpenUpload: () => void;
  onOpen8D: () => void;
  onOpenAudit: () => void;
  onOpenLayout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLanguageChange,
  theme,
  onThemeToggle,
  onRefresh,
  isLoading,
  filter,
  onOpenUpload,
  onOpen8D,
  onOpenAudit,
  onOpenLayout,
}) => {
  const t = translations[lang];
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportPdf = () => {
    setShowExportMenu(false);
    window.print();
  };

  const handleExportExcel = () => {
    setShowExportMenu(false);
    const url = api.getExportExcelUrl(filter);
    window.open(url, '_blank');
  };

  const handleExportCsv = () => {
    setShowExportMenu(false);
    const url = api.getExportCsvUrl(filter);
    window.open(url, '_blank');
  };

  return (
    <header className="app-header no-print">
      {/* Top Bar: Branding + Quick Controls */}
      <div className="app-header-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: 'var(--shadow-glow-cyan)',
            flexShrink: 0
          }}>
            <Activity size={18} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'nowrap' }}>
              <h1 className="app-header-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
                <span className="title-desktop">{t.appTitle}</span>
                <span className="title-mobile">MES & BI D6</span>
              </h1>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.62rem',
                fontWeight: 600,
                padding: '2px 5px',
                borderRadius: '999px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                flexShrink: 0
              }}>
                <span className="live-dot" />
                <span className="live-text">{t.liveStatus}</span>
              </span>
            </div>
            <p className="app-header-subtitle" style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 500, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t.factorySubtitle}
            </p>
          </div>
        </div>

        {/* Quick controls on the right (Language, Theme, Refresh) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          {/* Refresh */}
          <button
            className="btn-secondary"
            onClick={onRefresh}
            disabled={isLoading}
            title={t.refresh}
            style={{ padding: '0.4rem', borderRadius: '6px' }}
          >
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          {/* Language Selector */}
          <select
            className="select-custom"
            value={lang}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
          >
            <option value="vi">VI</option>
            <option value="zh">ZH</option>
            <option value="en">EN</option>
          </select>

          {/* Theme Toggle */}
          <button
            className="btn-secondary"
            onClick={onThemeToggle}
            title={theme === 'dark' ? t.lightMode : t.darkMode}
            style={{ padding: '0.4rem', borderRadius: '6px' }}
          >
            {theme === 'dark' ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#6366f1" />}
          </button>
        </div>
      </div>

      {/* Desktop View Tools (> 768px) */}
      <div className="header-tools-desktop">
        <button
          className="btn-secondary"
          onClick={onOpenAudit}
          title="Kiểm kê vật tư D6"
          style={{ fontSize: '0.8rem' }}
        >
          <Boxes size={15} color="var(--accent-cyan)" />
          <span>{t.inventoryAudit}</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpen8D}
          title="Module giải quyết sự cố 4D/8D"
          style={{ fontSize: '0.8rem', borderColor: 'var(--accent-amber)', color: 'var(--text-main)' }}
        >
          <FileText size={15} color="var(--accent-amber)" />
          <span>{t.problemSolving4D8D}</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenUpload}
          title="Import file Excel sản xuất mới"
          style={{ fontSize: '0.8rem' }}
        >
          <UploadCloud size={15} color="var(--accent-emerald)" />
          <span>{t.uploadExcel}</span>
        </button>

        {/* Export Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-secondary"
            onClick={() => setShowExportMenu(!showExportMenu)}
            style={{ fontSize: '0.8rem' }}
          >
            <Download size={15} />
            <span>{t.export}</span>
          </button>
          {showExportMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '110%',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
              padding: '0.4rem',
              boxShadow: 'var(--shadow-card)',
              minWidth: '160px',
              zIndex: 110,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}>
              <button
                className="btn-secondary"
                style={{ width: '100%', border: 'none', justifyContent: 'flex-start' }}
                onClick={handleExportExcel}
              >
                <FileSpreadsheet size={15} color="#10b981" />
                <span>Xuất Excel (.xlsx)</span>
              </button>
              <button
                className="btn-secondary"
                style={{ width: '100%', border: 'none', justifyContent: 'flex-start' }}
                onClick={handleExportCsv}
              >
                <FileText size={15} color="#06b6d4" />
                <span>Xuất CSV</span>
              </button>
              <button
                className="btn-secondary"
                style={{ width: '100%', border: 'none', justifyContent: 'flex-start' }}
                onClick={handleExportPdf}
              >
                <Printer size={15} color="#f59e0b" />
                <span>In / Xuất PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Layout Settings */}
        <button
          className="btn-secondary"
          onClick={onOpenLayout}
          title={t.customLayout}
          style={{ padding: '0.45rem' }}
        >
          <Sliders size={15} />
        </button>

        {/* Admin Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.35rem 0.65rem',
          borderRadius: '6px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <ShieldCheck size={14} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Admin</span>
        </div>
      </div>

      {/* Mobile Horizontal Scrollable Tools Strip (< 768px) */}
      <div className="header-tools-mobile">
        <button
          className="header-chip-btn"
          onClick={onOpenAudit}
        >
          <Boxes size={14} color="var(--accent-cyan)" />
          <span>Kiểm kê D6</span>
        </button>

        <button
          className="header-chip-btn"
          onClick={onOpen8D}
          style={{ borderColor: 'var(--accent-amber)' }}
        >
          <FileText size={14} color="var(--accent-amber)" />
          <span>Sự cố 8D</span>
        </button>

        <button
          className="header-chip-btn"
          onClick={onOpenUpload}
        >
          <UploadCloud size={14} color="var(--accent-emerald)" />
          <span>Nhập Excel</span>
        </button>

        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            className="header-chip-btn"
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <Download size={14} color="var(--accent-blue)" />
            <span>Xuất file</span>
          </button>
          {showExportMenu && (
            <div style={{
              position: 'fixed',
              left: '10px',
              right: '10px',
              bottom: '20px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              padding: '0.6rem',
              boxShadow: 'var(--shadow-card)',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}>
              <button
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem' }}
                onClick={handleExportExcel}
              >
                <FileSpreadsheet size={16} color="#10b981" />
                <span>Xuất Excel (.xlsx)</span>
              </button>
              <button
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem' }}
                onClick={handleExportCsv}
              >
                <FileText size={16} color="#06b6d4" />
                <span>Xuất CSV</span>
              </button>
              <button
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem' }}
                onClick={handleExportPdf}
              >
                <Printer size={16} color="#f59e0b" />
                <span>In / Xuất PDF</span>
              </button>
              <button
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.2rem', color: 'var(--text-dim)' }}
                onClick={() => setShowExportMenu(false)}
              >
                Đóng
              </button>
            </div>
          )}
        </div>

        <button
          className="header-chip-btn"
          onClick={onOpenLayout}
        >
          <Sliders size={14} />
          <span>Bố cục</span>
        </button>
      </div>
    </header>
  );
};
