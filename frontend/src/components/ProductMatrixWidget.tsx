import React, { useState, useMemo } from 'react';
import { Table, Search, ArrowUpDown, Download, ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Language, translations } from '../i18n/translations';
import { ProductMatrixRow } from '../types/dashboard';

interface ProductMatrixWidgetProps {
  lang: Language;
  data: ProductMatrixRow[];
  onRowClick: (row: ProductMatrixRow) => void;
}

export const ProductMatrixWidget: React.FC<ProductMatrixWidgetProps> = ({
  lang,
  data,
  onRowClick,
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof ProductMatrixRow>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const handleSort = (field: keyof ProductMatrixRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const term = searchTerm.toLowerCase();
      return (
        row.product.toLowerCase().includes(term) ||
        row.productNameVi.toLowerCase().includes(term) ||
        row.date.toLowerCase().includes(term) ||
        row.shift.toLowerCase().includes(term) ||
        (row.notes && row.notes.toLowerCase().includes(term))
      );
    });
  }, [data, searchTerm]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal || '').localeCompare(String(bVal || ''))
        : String(bVal || '').localeCompare(String(aVal || ''));
    });
  }, [filteredData, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportTableToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sortedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ProductMatrix');
    XLSX.writeFile(wb, `Product_Matrix_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportTableToCsv = () => {
    const ws = XLSX.utils.json_to_sheet(sortedData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Product_Matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="industrial-card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '100%', width: '100%', overflow: 'hidden' }}>
      <div className="industrial-card-header">
        <div className="industrial-card-title">
          <Table size={18} color="var(--accent-cyan)" />
          <span>{t.productMatrix}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)' }}>
            ({sortedData.length} bản ghi)
          </span>
        </div>

        {/* Search & Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm, ngày..."
              className="select-custom"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '26px', width: '200px', fontSize: '0.78rem' }}
            />
          </div>

          <button className="btn-secondary" onClick={exportTableToExcel} title="Xuất Excel bảng này" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}>
            <Download size={13} color="#10b981" />
            <span>Excel</span>
          </button>

          <button className="btn-secondary" onClick={exportTableToCsv} title="Xuất CSV bảng này" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}>
            <Download size={13} color="#06b6d4" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="mes-table-wrapper" style={{ minHeight: '280px', width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'auto', display: 'block' }}>
        <table className="mes-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                  {t.colDate} <ArrowUpDown size={12} />
                </span>
              </th>
              <th onClick={() => handleSort('product')} style={{ cursor: 'pointer' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                  {t.colProduct} <ArrowUpDown size={12} />
                </span>
              </th>
              <th onClick={() => handleSort('plan')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                {t.colPlan}
              </th>
              <th onClick={() => handleSort('actual')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                {t.colActual}
              </th>
              <th onClick={() => handleSort('achievement')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                {t.colAchievement}
              </th>
              <th onClick={() => handleSort('uph')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                {t.colUph}
              </th>
              <th onClick={() => handleSort('totalNG')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                {t.colTotalNG}
              </th>
              <th onClick={() => handleSort('ngRate')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                {t.colNgRate}
              </th>
              <th onClick={() => handleSort('downtime')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                {t.colDowntime}
              </th>
              <th onClick={() => handleSort('efficiency')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                {t.colEfficiency}
              </th>
              <th style={{ textAlign: 'center' }}>{t.colShift}</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                  {t.noDataTitle}
                </td>
              </tr>
            ) : (
              paginatedData.map((r) => {
                const achieveBadge = r.achievement >= 100 ? 'kpi-badge-positive' : r.achievement >= 95 ? 'kpi-badge-neutral' : 'kpi-badge-negative';
                const ngBadge = r.ngRate > 2.5 ? 'kpi-badge-negative' : r.ngRate > 1.5 ? 'kpi-badge-neutral' : 'kpi-badge-positive';

                return (
                  <tr
                    key={`${r.id}-${r.date}-${r.product}`}
                    onClick={() => onRowClick(r)}
                    style={{ cursor: 'pointer' }}
                    title="Nhấn để xem chi tiết sản xuất & phân tích sự cố"
                  >
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{r.date}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.product}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{r.productNameVi}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{r.plan.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.actual.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={achieveBadge}>{r.achievement}%</span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      {r.uph}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: r.totalNG > 0 ? '#f43f5e' : 'var(--text-dim)' }}>
                      {r.totalNG}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={ngBadge}>{r.ngRate}%</span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: r.downtime > 0 ? '#f59e0b' : 'var(--text-dim)' }}>
                      {r.downtime > 0 ? `${r.downtime}m` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                      {r.efficiency}%
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.75rem' }}>{r.shift}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.notes || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '0.85rem',
        paddingTop: '0.65rem',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.8rem',
        color: 'var(--text-dim)'
      }}>
        <div>
          Trang {currentPage} / {totalPages} (Tổng cộng {sortedData.length} kết quả)
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            className="btn-secondary"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: '0.3rem 0.6rem' }}
          >
            <ChevronLeft size={14} /> Trước
          </button>
          <button
            className="btn-secondary"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: '0.3rem 0.6rem' }}
          >
            Sau <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
