import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  Percent,
  Gauge,
  Users,
  UserX,
  AlertOctagon,
  Flame,
  ClockAlert
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { KpiSummary } from '../types/dashboard';

interface KpiCardsProps {
  lang: Language;
  kpis: KpiSummary;
  onDrillDown: (type: string, key: string) => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ lang, kpis, onDrillDown }) => {
  const t = translations[lang];

  const cards = [
    {
      id: 'plan',
      title: t.kpiPlan,
      value: kpis.totalPlan.toLocaleString('vi-VN'),
      unit: 'cái / pcs',
      delta: kpis.planDeltaPercent,
      isPositiveGood: true,
      icon: <Target size={20} color="var(--accent-blue)" />,
      tooltip: 'Tổng số lượng sản phẩm dự kiến sản xuất theo kế hoạch',
      onClick: () => onDrillDown('trend', 'Plan'),
    },
    {
      id: 'actual',
      title: t.kpiActual,
      value: kpis.totalActual.toLocaleString('vi-VN'),
      unit: 'cái / pcs',
      delta: kpis.actualDeltaPercent,
      isPositiveGood: true,
      icon: <CheckCircle2 size={20} color="var(--accent-emerald)" />,
      tooltip: 'Tổng sản lượng thực tế đã nhập kho / hoàn thành',
      onClick: () => onDrillDown('trend', 'Actual'),
    },
    {
      id: 'achievement',
      title: t.kpiAchievement,
      value: `${kpis.achievementRate}%`,
      unit: kpis.achievementRate >= 100 ? 'Đạt chỉ tiêu' : 'Dưới chỉ tiêu',
      delta: kpis.achievementDeltaPercent,
      isPositiveGood: true,
      icon: <Percent size={20} color={kpis.achievementRate >= 95 ? 'var(--accent-emerald)' : 'var(--accent-amber)'} />,
      tooltip: 'Tỷ lệ % Thực tế / Kế hoạch',
      onClick: () => onDrillDown('trend', 'Achievement'),
    },
    {
      id: 'uph',
      title: t.kpiUph,
      value: kpis.averageUPH.toFixed(1),
      unit: 'pcs / giờ công',
      delta: kpis.uphDeltaPercent,
      isPositiveGood: true,
      icon: <Gauge size={20} color="var(--accent-cyan)" />,
      tooltip: 'Units Per Hour = Sản lượng / Tổng giờ công',
      onClick: () => onDrillDown('metric', 'UPH'),
    },
    {
      id: 'manpower',
      title: t.kpiManpower,
      value: kpis.totalManpower.toLocaleString('vi-VN'),
      unit: 'người / công',
      delta: 0,
      isPositiveGood: true,
      icon: <Users size={20} color="var(--accent-indigo)" />,
      tooltip: 'Tổng nhân lực phân bổ cho các chuyền',
      onClick: () => onDrillDown('metric', 'Manpower'),
    },
    {
      id: 'shortage',
      title: t.kpiManpowerShortage,
      value: kpis.totalMissingManpower.toLocaleString('vi-VN'),
      unit: `Thiếu ${kpis.manpowerShortageRate}%`,
      delta: kpis.manpowerShortageRate > 5 ? 1 : 0,
      isPositiveGood: false,
      icon: <UserX size={20} color={kpis.manpowerShortageRate > 5 ? 'var(--accent-rose)' : 'var(--accent-amber)'} />,
      tooltip: 'Số nhân lực thiếu hụt = Kế hoạch - Đi làm thực tế',
      onClick: () => onDrillDown('metric', 'ManpowerShortage'),
    },
    {
      id: 'total_ng',
      title: t.kpiTotalNG,
      value: kpis.totalNG.toLocaleString('vi-VN'),
      unit: 'cái lỗi',
      delta: kpis.ngDeltaPercent,
      isPositiveGood: false,
      icon: <AlertOctagon size={20} color="var(--accent-rose)" />,
      tooltip: 'Tổng số sản phẩm phát hiện lỗi (11 chủng loại NG)',
      onClick: () => onDrillDown('defect', 'TotalNG'),
    },
    {
      id: 'ng_rate',
      title: t.kpiNgRate,
      value: `${kpis.ngRate}%`,
      unit: kpis.ngRate <= 1.5 ? 'Trong ngưỡng tốt' : 'Cần kiểm soát',
      delta: kpis.ngDeltaPercent,
      isPositiveGood: false,
      icon: <Flame size={20} color={kpis.ngRate > 2.0 ? 'var(--accent-rose)' : 'var(--accent-amber)'} />,
      tooltip: 'Tỷ lệ phế phẩm = Tổng NG / Sản lượng thực tế',
      onClick: () => onDrillDown('defect', 'NGRate'),
    },
    {
      id: 'downtime',
      title: t.kpiDowntime,
      value: `${kpis.totalDowntimeMinutes}m`,
      unit: `${(kpis.totalDowntimeMinutes / 60).toFixed(1)} giờ`,
      delta: kpis.downtimeDeltaPercent,
      isPositiveGood: false,
      icon: <ClockAlert size={20} color="var(--accent-amber)" />,
      tooltip: 'Tổng thời gian sự cố dừng máy trên tất cả các chuyền',
      onClick: () => onDrillDown('downtime', 'TotalDowntime'),
    },
  ];

  return (
    <div className="kpi-grid-container">
      {cards.map((c) => {
        const isUp = c.delta > 0;
        const isDown = c.delta < 0;
        const isGood = c.isPositiveGood ? isUp : isDown;
        const deltaColor = c.delta === 0 ? 'var(--text-dim)' : isGood ? '#10b981' : '#f43f5e';

        return (
          <div
            key={c.id}
            className="industrial-card kpi-card"
            onClick={c.onClick}
            title={`${c.tooltip} (Nhấn để phân tích chi tiết)`}
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              minWidth: 0
            }}
          >
            {/* Top row: Title and Icon */}
            <div className="kpi-card-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.35rem', marginBottom: '0.35rem' }}>
              <span className="kpi-card-title" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em', flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                {c.title}
              </span>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-input)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-subtle)',
                flexShrink: 0
              }}>
                {c.icon}
              </div>
            </div>

            {/* Middle: Big Value */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', margin: '0.15rem 0', minWidth: 0, overflow: 'hidden' }}>
              <span className="kpi-card-value" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.value}
              </span>
            </div>

            {/* Bottom: Unit & Delta comparison */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem', gap: '0.25rem' }}>
              <span className="kpi-card-unit" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.unit}</span>
              {c.delta !== 0 && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.15rem',
                  color: deltaColor,
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  flexShrink: 0
                }}>
                  {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {isUp ? '+' : ''}{c.delta}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
