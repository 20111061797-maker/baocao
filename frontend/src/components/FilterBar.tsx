import React from 'react';
import { Filter, Calendar, Layers, Clock, RotateCcw, Check } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { DashboardFilter } from '../types/dashboard';

interface FilterBarProps {
  lang: Language;
  filter: DashboardFilter;
  onChange: (filter: DashboardFilter) => void;
  onApply: () => void;
  onReset: () => void;
  availableProducts: string[];
  availableShifts: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  lang,
  filter,
  onChange,
  onApply,
  onReset,
  availableProducts,
  availableShifts,
}) => {
  const t = translations[lang];

  const presets = [
    { key: 'today', label: t.presetToday },
    { key: 'last_7_days', label: t.presetLast7Days },
    { key: 'this_week', label: t.presetThisWeek },
    { key: 'this_month', label: t.presetThisMonth },
    { key: 'last_30_days', label: t.presetLast30Days },
    { key: 'all', label: t.presetAll },
  ];

  const shifts = React.useMemo(() => {
    const set = new Set<string>(['Ca Ngày', 'Ca Đêm']);
    (availableShifts || []).forEach((s) => {
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [availableShifts]);

  const products = React.useMemo(() => {
    const defaultList = ['喇叭', '麦克风', '控制盒', '头戴', '组装', '包装'];
    const set = new Set<string>(defaultList);
    (availableProducts || []).forEach((p) => {
      if (p) set.add(p);
    });
    return Array.from(set);
  }, [availableProducts]);

  const handlePresetSelect = (presetKey: string) => {
    onChange({
      ...filter,
      preset: presetKey,
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  return (
    <div className="app-filterbar no-print">
      {/* Presets */}
      <div className="filterbar-presets">
        <span style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          marginRight: '0.3rem'
        }}>
          <Filter size={14} color="var(--accent-cyan)" />
          {t.filterBarTitle}:
        </span>

        {presets.map((p) => {
          const isActive = filter.preset === p.key;
          return (
            <button
              key={p.key}
              onClick={() => handlePresetSelect(p.key)}
              style={{
                fontSize: '0.78rem',
                fontWeight: isActive ? 600 : 500,
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: isActive ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                backgroundColor: isActive ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-input)',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Selectors and custom date range */}
      <div className="filterbar-inputs">
        {/* Row 1: Date From & To */}
        <div className="filter-mobile-row" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, minWidth: 0 }}>
            <Calendar size={13} color="var(--text-dim)" style={{ flexShrink: 0 }} />
            <input
              type="date"
              className="select-custom"
              value={filter.dateFrom || ''}
              onChange={(e) => onChange({ ...filter, preset: undefined, dateFrom: e.target.value })}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.4rem', width: '100%', minWidth: 0 }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', flexShrink: 0 }}>~</span>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <input
              type="date"
              className="select-custom"
              value={filter.dateTo || ''}
              onChange={(e) => onChange({ ...filter, preset: undefined, dateTo: e.target.value })}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.4rem', width: '100%', minWidth: 0 }}
            />
          </div>
        </div>

        {/* Row 2: Product & Shift Selectors */}
        <div className="filter-mobile-row" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, minWidth: 0 }}>
            <Layers size={13} color="var(--text-dim)" style={{ flexShrink: 0 }} />
            <select
              className="select-custom"
              value={filter.product || 'all'}
              onChange={(e) => onChange({ ...filter, product: e.target.value })}
              style={{ width: '100%', minWidth: 0, fontSize: '0.75rem', padding: '0.35rem 0.4rem' }}
            >
              <option value="all">{t.allProducts}</option>
              {products.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, minWidth: 0 }}>
            <Clock size={13} color="var(--text-dim)" style={{ flexShrink: 0 }} />
            <select
              className="select-custom"
              value={filter.shift || 'all'}
              onChange={(e) => onChange({ ...filter, shift: e.target.value })}
              style={{ width: '100%', minWidth: 0, fontSize: '0.75rem', padding: '0.35rem 0.4rem' }}
            >
              <option value="all">{t.allShifts}</option>
              {shifts.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Action Buttons */}
        <div className="filter-mobile-row" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            className="btn-primary"
            onClick={onApply}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', justifyContent: 'center', flex: 1.5 }}
          >
            <Check size={14} />
            <span>{t.applyFilter}</span>
          </button>

          <button
            className="btn-secondary"
            onClick={onReset}
            style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem', justifyContent: 'center', flex: 1 }}
            title={t.resetFilter}
          >
            <RotateCcw size={14} />
            <span>{t.resetFilter}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
