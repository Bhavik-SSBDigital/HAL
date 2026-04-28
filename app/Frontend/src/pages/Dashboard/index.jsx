import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DonutChart } from "@tremor/react";
import {
  IconCheck, IconClock, IconFileOff, IconListDetails,
  IconBolt, IconListCheck, IconSearch, IconSortAscending, IconSortDescending,
  IconCircleCheck, IconArrowRight, IconStack2, IconHistory,
  IconStack3, IconBuildingWarehouse, IconRefresh, IconCalendar,
  IconInfoCircle, IconEye, IconChevronDown, IconChevronRight,
  IconDatabase, IconTarget, IconLayoutDashboard, IconShieldLock,
  IconFilter, IconX, IconChevronLeft, IconChevronRight as IconChevRt
} from '@tabler/icons-react';
import { toast } from 'react-toastify';
import { getDashboardNumbers, getDashboardTables, getDashboardEntityAnalytics, ViewDocument } from '../../common/Apis';
import TopLoader from '../../common/Loader/TopLoader';
import moment from 'moment';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell
} from 'recharts';
import ViewFile from '../view/View';

const C = {
  emerald: '#10B981', amber: '#F59E0B', blue: '#3B82F6',
  indigo: '#6366F1', purple: '#8B5CF6', teal: '#14B8A6',
  slate: '#64748B', orange: '#F97316', rose: '#F43F5E'
};

const THEME = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    ring: 'ring-blue-500',    bar: '#3B82F6', pill: 'bg-blue-100 text-blue-800 border-blue-200' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-500', bar: '#10B981', pill: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   ring: 'ring-amber-500',   bar: '#F59E0B', pill: 'bg-amber-100 text-amber-800 border-amber-200' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-600',  ring: 'ring-purple-500',  bar: '#8B5CF6', pill: 'bg-purple-100 text-purple-800 border-purple-200' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-600',  ring: 'ring-orange-500',  bar: '#F97316', pill: 'bg-orange-100 text-orange-800 border-orange-200' },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-600',    ring: 'ring-teal-500',    bar: '#14B8A6', pill: 'bg-teal-100 text-teal-800 border-teal-200' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  ring: 'ring-indigo-500',  bar: '#6366F1', pill: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  slate:   { bg: 'bg-slate-100',  text: 'text-slate-600',   ring: 'ring-slate-400',   bar: '#64748B', pill: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const STATUS_MAP = {
  PENDING_ADMIN_APPROVAL: { label: 'Pending Admin', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  PENDING_HOD_APPROVAL:   { label: 'Pending HOD',   color: 'text-amber-700 bg-amber-50 border-amber-200' },
  PENDING_USER_RESPONSE:  { label: 'Awaiting User', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  ADMIN_APPROVED:         { label: 'Approved',      color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  HOD_APPROVED:           { label: 'Approved',      color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  DOC_RETURNED:           { label: 'Returned',      color: 'text-teal-700 bg-teal-50 border-teal-200' },
  COMPLETED:              { label: 'Completed',     color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  IN_PROGRESS:            { label: 'In Progress',   color: 'text-blue-700 bg-blue-50 border-blue-200' },
  RESOLVED:               { label: 'Resolved',      color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  OPEN:                   { label: 'Open',          color: 'text-amber-700 bg-amber-50 border-amber-200' },
};

const StatusPill = ({ status }) => {
  const s = STATUS_MAP[status] || { label: status, color: 'text-slate-600 bg-slate-100 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.color}`}>
      {s.label}
    </span>
  );
};

const StatCard = ({ icon, label, value, sub, theme = 'blue', badge, isActive, onClick, isLoading, mini }) => {
  const t = THEME[theme];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative text-left bg-white rounded-2xl border transition-all duration-200 w-full h-full focus:outline-none flex flex-col
        ${isActive
          ? 'border-indigo-300 ring-2 ring-indigo-200 shadow-md shadow-indigo-100/60'
          : 'border-slate-200/70 shadow-sm hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'}
        ${mini ? 'p-4' : 'p-5 md:p-6'}
      `}
    >
      <div className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-t-full transition-all duration-300 ${isActive ? 'bg-indigo-500 opacity-100' : 'opacity-0'}`} />

      <div className="flex items-start justify-between gap-2 mb-3 w-full">
        <div className={`p-2.5 rounded-xl ${t.bg} ${t.text} shrink-0`}>
          {React.cloneElement(icon, { size: mini ? 18 : 22, strokeWidth: 1.7 })}
        </div>
        {badge && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${t.pill} shrink-0`}>
            {badge}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 justify-between w-full">
        <p className={`text-xs font-semibold text-slate-500 mb-1 leading-snug ${mini ? '' : 'text-sm'}`}>{label}</p>
        <div>
          {isLoading ? (
            <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
          ) : (
            <p className={`font-bold text-slate-900 tracking-tight ${mini ? 'text-2xl' : 'text-3xl'}`}>
              {typeof value === 'number' ? value.toLocaleString() : (value ?? '—')}
            </p>
          )}
          {sub && <p className="text-xs text-slate-400 font-medium mt-1 truncate">{sub}</p>}
        </div>
      </div>

      <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-200 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0`}>
        <IconChevronRight size={16} className="text-slate-400" />
      </div>
    </button>
  );
};

const Panel = ({ title, subtitle, children, noPad, id }) => (
  <div id={id} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 flex flex-col w-full min-w-0 overflow-hidden">
    {(title || subtitle) && (
      <div className="px-6 py-5 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm mt-0.5 text-slate-500 font-medium">{subtitle}</p>}
      </div>
    )}
    <div className={`flex-1 w-full min-w-0 flex flex-col ${noPad ? '' : 'p-6'}`}>
      {children}
    </div>
  </div>
);

const DataTable = ({
  columns, rows = [], maxRows = 12,
  searchable = false, emptyText = 'No records found',
  statusFilterKey = null, dateFilterKey = null,
}) => {
  const [q, setQ] = useState('');
  const [filterCol, setFilterCol] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });
  const debounceRef = useRef(null);
  const [debouncedQ, setDebouncedQ] = useState('');

  const handleSearch = (val) => {
    setQ(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(val);
      setPage(0);
    }, 200);
  };

  const statusOptions = useMemo(() => {
    if (!statusFilterKey) return [];
    const vals = [...new Set(rows.map(r => r[statusFilterKey]).filter(Boolean))];
    return vals;
  }, [rows, statusFilterKey]);

  const filtered = useMemo(() => {
    let result = rows;
    if (debouncedQ) {
      const lq = debouncedQ.toLowerCase();
      result = result.filter(r =>
        filterCol === 'all'
          ? Object.values(r).some(v => String(v ?? '').toLowerCase().includes(lq))
          : String(r[filterCol] ?? '').toLowerCase().includes(lq)
      );
    }
    if (statusFilter !== 'all' && statusFilterKey) {
      result = result.filter(r => r[statusFilterKey] === statusFilter);
    }
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const va = String(a[sortConfig.key] || '').toLowerCase();
        const vb = String(b[sortConfig.key] || '').toLowerCase();
        if (va < vb) return sortConfig.dir === 'asc' ? -1 : 1;
        if (va > vb) return sortConfig.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [rows, debouncedQ, filterCol, statusFilter, statusFilterKey, sortConfig]);

  const totalPages = Math.ceil(filtered.length / maxRows);
  const paged = filtered.slice(page * maxRows, (page + 1) * maxRows);

  const toggleSort = (key) => {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setQ(''); setDebouncedQ(''); setFilterCol('all'); setStatusFilter('all'); setPage(0);
  };

  const hasActiveFilters = debouncedQ || statusFilter !== 'all' || filterCol !== 'all';

  if (!rows.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3">
        <IconFileOff size={28} stroke={1.5} />
      </div>
      <p className="text-sm font-semibold">{emptyText}</p>
    </div>
  );

  return (
    <div className="flex flex-col w-full min-w-0">
      {searchable && (
        <div className="px-4 md:px-6 py-4 flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50/50">
          <div className="flex-1 min-w-[180px] relative">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={q}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 bg-white text-slate-800 placeholder:text-slate-400 transition-all"
            />
          </div>
          <select
            value={filterCol}
            onChange={e => { setFilterCol(e.target.value); setPage(0); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-indigo-400 transition-all cursor-pointer min-w-[130px]"
          >
            <option value="all">All columns</option>
            {columns.filter(c => c.key !== 'actions').map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          {statusFilterKey && statusOptions.length > 0 && (
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-indigo-400 transition-all cursor-pointer min-w-[140px]"
            >
              <option value="all">All statuses</option>
              {statusOptions.map(s => (
                <option key={s} value={s}>{STATUS_MAP[s]?.label || s}</option>
              ))}
            </select>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-all"
            >
              <IconX size={14} /> Clear
            </button>
          )}
          <span className="flex items-center text-xs text-slate-400 font-medium ml-auto">
            {filtered.length.toLocaleString()} record{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.key !== 'actions' && toggleSort(col.key)}
                  className={`px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider select-none
                    ${col.right ? 'text-right' : ''}
                    ${col.key !== 'actions' ? 'cursor-pointer hover:text-slate-700 transition-colors' : ''}`}
                >
                  <div className={`flex items-center gap-1 ${col.right ? 'justify-end' : ''}`}>
                    {col.label}
                    {sortConfig.key === col.key && (
                      sortConfig.dir === 'asc'
                        ? <IconSortAscending size={13} className="text-indigo-500" />
                        : <IconSortDescending size={13} className="text-indigo-500" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paged.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className={`px-5 py-3.5 align-middle text-slate-700 ${col.right ? 'text-right' : ''}`}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-white text-sm">
          <span className="text-slate-500 text-xs">
            Showing <span className="font-semibold text-slate-700">{page * maxRows + 1}</span>–
            <span className="font-semibold text-slate-700">{Math.min((page + 1) * maxRows, filtered.length)}</span> of{' '}
            <span className="font-semibold text-slate-700">{filtered.length}</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <IconChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pg = totalPages <= 7 ? i : (page <= 3 ? i : (page >= totalPages - 4 ? totalPages - 7 + i : page - 3 + i));
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors
                    ${page === pg ? 'bg-indigo-600 text-white border border-indigo-600' : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'}`}
                >
                  {pg + 1}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <IconChevRt size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ExpandableTable = ({
  data = [], summaryColumns, detailColumns, detailKey,
  renderDetail, emptyText = 'No data',
  pageSize = 10, searchKey = null,
}) => {
  const [open, setOpen] = useState({});
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search || !searchKey) return data;
    const lq = search.toLowerCase();
    return data.filter(r => String(r[searchKey] ?? '').toLowerCase().includes(lq));
  }, [data, search, searchKey]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const toggle = id => setOpen(o => ({ ...o, [id]: !o[id] }));

  if (!data?.length) return (
    <div className="flex flex-col items-center justify-center py-14 text-slate-400">
      <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3">
        <IconFileOff size={28} stroke={1.5} />
      </div>
      <p className="text-sm font-semibold">{emptyText}</p>
    </div>
  );

  return (
    <div className="flex flex-col w-full min-w-0">
      {searchKey && (
        <div className="px-4 md:px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter rows..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-indigo-400 bg-white placeholder:text-slate-400 transition-all"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">{filtered.length} rows</span>
        </div>
      )}

      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {summaryColumns.map(col => (
                <th key={col.key} className={`px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider ${col.right ? 'text-right' : ''}`}>
                  {col.label}
                </th>
              ))}
              <th className="w-12 px-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paged.map((row, i) => {
              const rowId = row.id || row.workflowId || row.departmentId || row.familyId || i;
              const isOpen = !!open[rowId];
              const detail = row[detailKey] || [];
              return (
                <React.Fragment key={rowId}>
                  <tr
                    className={`cursor-pointer transition-colors ${isOpen ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'}`}
                    onClick={() => toggle(rowId)}
                  >
                    {summaryColumns.map(col => (
                      <td key={col.key} className={`px-5 py-4 text-slate-700 ${col.right ? 'text-right' : ''}`}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                    <td className="px-3 text-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                        {isOpen ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={summaryColumns.length + 1} className="p-0 border-b border-slate-200 bg-slate-50/60">
                        {renderDetail ? renderDetail(row) : (
                          detail.length > 0 ? (
                            <div className="m-4 border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-sm">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500">
                                  <tr>
                                    {detailColumns.map(col => (
                                      <th key={col.key} className="px-5 py-3 text-xs font-bold uppercase tracking-wider">{col.label}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {detail.map((item, j) => (
                                    <tr key={j} className="hover:bg-slate-50/50 transition-colors">
                                      {detailColumns.map(col => (
                                        <td key={col.key} className="px-5 py-3.5 text-slate-700">
                                          {col.render ? col.render(item[col.key], item) : (item[col.key] ?? '—')}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-sm py-8 text-center text-slate-400 font-medium">No details available.</p>
                          )
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 bg-white text-sm">
          <span className="text-xs text-slate-400">
            Page <span className="font-semibold text-slate-600">{page + 1}</span> of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors">
              <IconChevronLeft size={14} />
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors">
              <IconChevRt size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const NestedTable = ({ title, icon, theme, columns, data }) => {
  if (!data?.length) return null;
  const t = THEME[theme] || THEME.slate;
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <span className={`p-1.5 rounded-lg ${t.bg} ${t.text} text-xs`}>{icon}</span>
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">{data.length}</span>
      </div>
      <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-sm">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
            <tr>
              {columns.map(col => (
                <th key={col.key} className={`px-5 py-3 text-xs font-bold uppercase tracking-wider ${col.right ? 'text-right' : ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className={`px-5 py-3.5 text-slate-700 ${col.right ? 'text-right' : ''}`}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ActionBtn = ({ label, theme = 'indigo', onClick, icon }) => {
  const cls = {
    indigo: 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100',
    blue: 'text-blue-700 bg-blue-50 hover:bg-blue-100',
    emerald: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100',
    amber: 'text-amber-700 bg-amber-50 hover:bg-amber-100',
    slate: 'text-slate-700 bg-slate-100 hover:bg-slate-200',
    orange: 'text-orange-700 bg-orange-50 hover:bg-orange-100',
    purple: 'text-purple-700 bg-purple-50 hover:bg-purple-100',
  }[theme];
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(e); }}
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg px-3 py-1.5 text-xs transition-colors ${cls}`}
    >
      {icon && React.cloneElement(icon, { size: 14 })}
      {label}
    </button>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 text-white border border-slate-700/50 rounded-xl p-3.5 text-sm shadow-xl min-w-[140px]">
      {label && <p className="font-semibold mb-2 text-slate-300 border-b border-slate-700/50 pb-1.5 text-xs uppercase tracking-wide">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-6 mb-1.5 last:mb-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
            <span className="font-medium text-slate-200 text-xs">{p.name}</span>
          </div>
          <strong className="font-bold text-sm">{p.value?.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
};

const TABS = [
  { id: 'overview',   label: 'Analytics',      icon: <IconLayoutDashboard size={16} /> },
  { id: 'processes',  label: 'Processes',       icon: <IconTarget size={16} /> },
  { id: 'workflows',  label: 'Workflows',       icon: <IconListDetails size={16} /> },
  { id: 'sop',        label: 'SOP Docs',        icon: <IconStack2 size={16} /> },
  { id: 'nonsop',     label: 'Non-SOP',         icon: <IconStack3 size={16} /> },
  { id: 'incomplete', label: 'Missing Files',   icon: <IconFileOff size={16} /> },
  { id: 'physical',   label: 'Doc Demand',      icon: <IconBuildingWarehouse size={16} /> },
  { id: 'entities',   label: 'Entity Intel',    icon: <IconDatabase size={16} /> },
  { id: 'queries',    label: 'Queries',         icon: <IconListCheck size={16} /> },
];

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export default function Dashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  const fmtDate = d => d.toISOString().slice(0, 10);

  const tabContentRef = useRef(null);

  const [dates, setDates] = useState({ startDate: fmtDate(oneYearAgo), endDate: fmtDate(today) });
  const [numbers, setNumbers] = useState(null);
  const [lists, setLists] = useState(null);
  const [entities, setEntities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [fileView, setFileView] = useState(null);

  const fetchAll = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const nextDay = moment(dates.endDate).format('YYYY-MM-DD');
      const [numRes, listRes, entRes] = await Promise.all([
        getDashboardNumbers(dates.startDate, nextDay),
        getDashboardTables(dates.startDate, nextDay),
        getDashboardEntityAnalytics(dates.startDate, nextDay),
      ]);
      setNumbers(numRes?.data?.data);
      setLists(listRes?.data?.data);
      setEntities(entRes?.data?.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dates]);

  useEffect(() => { fetchAll(); }, []);

  const handleStatClick = (tabId) => {
    setActiveTab(tabId);
    setTimeout(() => {
      tabContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleViewDoc = async (name, path, fileId, type) => {
    setActionsLoading(true);
    try {
      const data = await ViewDocument(name, path, type, fileId, false);
      setFileView(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to open document');
    } finally {
      setActionsLoading(false);
    }
  };

  const totalProcesses = (numbers?.completedProcesses || 0) + (numbers?.pendingProcesses || 0);
  const completionRate = pct(numbers?.completedProcesses || 0, totalProcesses);
  const openQueries = (numbers?.queries?.total || 0) - (numbers?.queries?.solved || 0);
  const queryResRate = pct(numbers?.queries?.solved || 0, numbers?.queries?.total || 1);

  const processDonut = [
    { name: 'Completed', value: numbers?.completedProcesses || 0, fill: C.emerald },
    { name: 'In Progress', value: numbers?.pendingProcesses || 0, fill: C.amber },
  ];

  const docBarData = [
    { name: 'Signed', value: numbers?.signedDocuments || 0, fill: C.teal },
    { name: 'Superseded', value: numbers?.replacedDocuments || 0, fill: C.purple },
    { name: 'Missing', value: numbers?.sop?.metadataOnlyPending || 0, fill: C.amber },
  ];

  const pendingByWf = useMemo(() => {
    if (!lists?.structuredWorkflows?.length) return [];
    return lists.structuredWorkflows
      .filter(w => w.pendingCount > 0)
      .map(w => ({
        name: w.workflowName.length > 22 ? w.workflowName.slice(0, 22) + '…' : w.workflowName,
        fullName: w.workflowName,
        count: w.pendingCount
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [lists?.structuredWorkflows]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-5">
      <div className="relative flex items-center justify-center">
        <div className="w-14 h-14 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        <IconShieldLock size={18} className="absolute text-indigo-600" />
      </div>
      <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Connecting to Secure Datastore…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans w-full overflow-x-hidden pb-20 flex flex-col items-center">
      {(refreshing || actionsLoading) && <TopLoader />}
      {fileView && <ViewFile docu={fileView} setFileView={setFileView} handleViewClose={() => setFileView(null)} />}

      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 w-full flex justify-center shadow-sm">
        <div className="w-full max-w-[1600px] px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-600 text-white shadow-md shadow-indigo-200 shrink-0">
              <IconShieldLock size={22} strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Command Center</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 shrink-0">
                  Secure Layer
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Operations & document flow overview</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3.5 py-2 bg-white shadow-sm text-sm">
              <IconCalendar size={16} className="text-slate-400" />
              <input type="date" value={dates.startDate} max={dates.endDate}
                onChange={e => setDates(p => ({ ...p, startDate: e.target.value }))}
                className="bg-transparent text-slate-700 outline-none font-semibold text-xs cursor-pointer" />
              <span className="text-slate-300">—</span>
              <input type="date" value={dates.endDate} min={dates.startDate} max={fmtDate(today)}
                onChange={e => setDates(p => ({ ...p, endDate: e.target.value }))}
                className="bg-transparent text-slate-700 outline-none font-semibold text-xs cursor-pointer" />
            </div>
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-md disabled:opacity-50"
            >
              <IconRefresh size={16} className={refreshing ? 'animate-spin' : ''} />
              Sync
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1600px] px-4 md:px-5 pt-6 flex flex-col min-w-0 gap-6">

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            icon={<IconBolt />}
            label="Active Workflows"
            value={numbers?.activeWorkflows}
            theme="indigo"
            badge="Live"
            isActive={activeTab === 'workflows'}
            onClick={() => handleStatClick('workflows')}
            isLoading={!numbers}
            mini
          />
          <StatCard
            icon={<IconClock />}
            label="Pending Processes"
            value={numbers?.pendingProcesses}
            theme="amber"
            isActive={activeTab === 'processes'}
            onClick={() => handleStatClick('processes')}
            isLoading={!numbers}
            mini
          />
          <StatCard
            icon={<IconCheck />}
            label="Completed Processes"
            value={numbers?.completedProcesses}
            sub={`${completionRate}% completion rate`}
            theme="emerald"
            isActive={activeTab === 'processes'}
            onClick={() => handleStatClick('processes')}
            isLoading={!numbers}
            mini
          />
          <StatCard
            icon={<IconBuildingWarehouse />}
            label="Doc Demand"
            value={numbers?.physicalRequests?.total}
            sub={`${numbers?.physicalRequests?.pending ?? 0} pending`}
            theme="orange"
            isActive={activeTab === 'physical'}
            onClick={() => handleStatClick('physical')}
            isLoading={!numbers}
            mini
          />
          <StatCard
            icon={<IconFileOff />}
            label="Missing Files"
            value={numbers?.sop?.metadataOnlyPending ?? 0}
            theme={numbers?.sop?.metadataOnlyPending > 0 ? 'amber' : 'teal'}
            badge={numbers?.sop?.metadataOnlyPending > 0 ? 'Action' : 'Clear'}
            isActive={activeTab === 'incomplete'}
            onClick={() => handleStatClick('incomplete')}
            isLoading={!numbers}
            mini
          />
          <StatCard
            icon={<IconListCheck />}
            label="Open Queries"
            value={openQueries}
            sub={`${numbers?.queries?.solved ?? 0} of ${numbers?.queries?.total ?? 0} resolved`}
            theme="purple"
            isActive={activeTab === 'queries'}
            onClick={() => handleStatClick('queries')}
            isLoading={!numbers}
            mini
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">

            <div className="p-5 flex flex-col gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors" onClick={() => handleStatClick('overview')}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Process Health</p>
                <span className={`text-2xl font-bold ${completionRate >= 70 ? 'text-emerald-600' : completionRate >= 40 ? 'text-amber-600' : 'text-rose-500'}`}>
                  {completionRate}<span className="text-base font-semibold">%</span>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="flex items-center gap-5">
                {processDonut.map(e => (
                  <div key={e.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.fill }} />
                    <span className="text-xs font-medium text-slate-500">{e.name}</span>
                    <span className="text-sm font-bold text-slate-800">{e.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 flex flex-col gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors" onClick={() => handleStatClick('queries')}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Query Resolution</p>
                <span className={`text-2xl font-bold ${queryResRate >= 70 ? 'text-teal-600' : 'text-amber-600'}`}>
                  {queryResRate}<span className="text-base font-semibold">%</span>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-700"
                  style={{ width: `${queryResRate}%` }}
                />
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                  <span className="text-xs font-medium text-slate-500">Resolved</span>
                  <span className="text-sm font-bold text-slate-800">{numbers?.queries?.solved ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-500">Open</span>
                  <span className="text-sm font-bold text-slate-800">{openQueries}</span>
                </div>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors" onClick={() => handleStatClick('overview')}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Document Registry</p>
              <div className="flex flex-col gap-2.5">
                {docBarData.map(item => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 w-16 shrink-0">{item.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, (item.value / (Math.max(...docBarData.map(d => d.value)) || 1)) * 100)}%`,
                          backgroundColor: item.fill
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-10 text-right">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto no-scrollbar w-full pb-1">
          <div className="flex space-x-1.5 bg-slate-200/40 p-1.5 rounded-2xl border border-slate-200/50 min-w-max">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap transition-all rounded-xl
                    ${isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent'}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div ref={tabContentRef} className="animate-in fade-in duration-300 w-full min-w-0 flex flex-col gap-6">

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">

              <Panel title="Process Health Overview" subtitle={`${totalProcesses.toLocaleString()} total processes in period`}>
                <div className="flex flex-col items-center justify-center flex-1 py-4">
                  <DonutChart data={processDonut} size={200} colors={['emerald', 'amber']} showAnimation />
                  <div className="flex justify-center gap-10 mt-6 w-full">
                    {processDonut.map(e => (
                      <div key={e.name} className="flex flex-col items-center">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: e.fill }} />
                          {e.name}
                        </div>
                        <span className="text-2xl font-bold text-slate-900">{e.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full mt-6 pt-5 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completion Rate</span>
                      <span className="text-lg font-bold text-emerald-600">{completionRate}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${completionRate}%` }} />
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel
                title="High Traffic Vectors"
                subtitle="Top active workflows by pending process volume"
              >
                {pendingByWf.length > 0 ? (
                  <div className="flex-1 w-full pt-4" style={{ minHeight: Math.max(220, pendingByWf.length * 42 + 60) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={pendingByWf}
                        layout="vertical"
                        barSize={14}
                        margin={{ left: 4, right: 24, top: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={148}
                          tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={v => v}
                        />
                        <Tooltip
                          cursor={{ fill: '#F8FAFC' }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            return (
                              <div className="bg-slate-900/95 text-white rounded-xl p-3 text-xs shadow-xl border border-slate-700/50">
                                <p className="font-semibold text-slate-200 mb-1.5 max-w-[200px] whitespace-normal">{d?.fullName}</p>
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                  <span className="text-slate-300">Pending</span>
                                  <strong className="ml-1">{d?.count}</strong>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="count" name="Pending" fill="#F59E0B" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm font-semibold text-slate-400 py-12">
                    No pending workflows to display.
                  </div>
                )}
              </Panel>

              <Panel title="Document Registry Snapshot" subtitle="System-wide document categorization" >
                <div className="flex-1 w-full pt-4 min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Signed', value: numbers?.signedDocuments || 0, fill: C.teal },
                        { name: 'Superseded', value: numbers?.replacedDocuments || 0, fill: C.purple },
                        { name: 'Missing', value: numbers?.sop?.metadataOnlyPending || 0, fill: C.amber },
                      ]}
                      barSize={40}
                      margin={{ left: -20, bottom: 0, right: 12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                      <YAxis tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#F8FAFC' }} content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {[C.teal, C.purple, C.amber].map((fill, i) => <Cell key={i} fill={fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Query Resolution Index">
                <div className="flex items-center gap-6 py-2">
                  <div className="text-5xl font-bold text-teal-600 tracking-tight">
                    {queryResRate}<span className="text-3xl text-teal-400">%</span>
                  </div>
                  <div className="text-sm font-medium text-slate-500 leading-relaxed border-l-2 border-slate-100 pl-5">
                    <strong className="text-slate-800 text-lg">{numbers?.queries?.solved ?? 0}</strong> resolved out of<br />
                    <strong className="text-slate-800 text-lg">{numbers?.queries?.total ?? 0}</strong> total logged
                  </div>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden mt-5">
                  <div className="h-full rounded-full bg-teal-500 transition-all duration-700" style={{ width: `${queryResRate}%` }} />
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total', value: numbers?.queries?.total ?? 0, color: 'text-slate-800' },
                    { label: 'Resolved', value: numbers?.queries?.solved ?? 0, color: 'text-teal-600' },
                    { label: 'Open', value: openQueries, color: 'text-amber-600' },
                  ].map(item => (
                    <div key={item.label} className="text-center">
                      <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {activeTab === 'processes' && (
            <Panel title="Processes Grouped by Workflow" subtitle="All process instances hierarchically grouped by parent template" noPad>
              <ExpandableTable
                data={(lists?.structuredWorkflows || []).filter(w => w.pendingCount > 0 || w.completedCount > 0)}
                searchKey="workflowName"
                pageSize={10}
                summaryColumns={[
                  { key: 'workflowName', label: 'Workflow Template', render: v => <span className="font-bold text-slate-900">{v}</span> },
                  { key: 'pendingCount', label: 'Pending', right: true, render: v => <span className={`font-bold text-lg ${v > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{v}</span> },
                  { key: 'completedCount', label: 'Completed', right: true, render: v => <span className={`font-bold text-lg ${v > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{v}</span> },
                ]}
                renderDetail={(row) => (
                  <div className="p-4 md:p-6 space-y-4">
                    <NestedTable
                      title="Pending Queue" icon={<IconClock size={16} strokeWidth={2} />} theme="amber"
                      data={row.pendingProcesses}
                      columns={[
                        { key: 'processName', label: 'Process', render: v => <span className="font-semibold text-slate-800">{v}</span> },
                        { key: 'currentStep', label: 'Current Node', render: v => <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">{v}</span> },
                        { key: 'initiatorUsername', label: 'Initiator' },
                        { key: 'createdAt', label: 'Started', render: v => <span className="text-slate-500 text-xs">{moment(v).fromNow()}</span> },
                        { key: 'actions', label: '', right: true, render: (_, r) => <ActionBtn label="Inspect" theme="amber" icon={<IconArrowRight />} onClick={() => navigate(`/process/view/${r.processId}`, { state: { readOnly: true } })} /> },
                      ]}
                    />
                    <NestedTable
                      title="Completed Log" icon={<IconCheck size={16} strokeWidth={2} />} theme="emerald"
                      data={row.completedProcesses}
                      columns={[
                        { key: 'processName', label: 'Process', render: v => <span className="font-semibold text-slate-800">{v}</span> },
                        { key: 'initiatorUsername', label: 'Initiator' },
                        { key: 'createdAt', label: 'Completed', render: v => <span className="text-slate-600 text-xs">{moment(v).format('MMM D, YYYY')}</span> },
                        { key: 'actions', label: '', right: true, render: (_, r) => <ActionBtn label="Inspect" theme="slate" icon={<IconArrowRight />} onClick={() => navigate(`/process/view/${r.processId}`, { state: { readOnly: true } })} /> },
                      ]}
                    />
                  </div>
                )}
                emptyText="No active or completed processes in scope"
              />
            </Panel>
          )}

          {activeTab === 'workflows' && (
            <Panel title="Authorized Workflows" subtitle="Active workflow templates and their execution statistics" noPad>
              <DataTable
                searchable
                maxRows={15}
                statusFilterKey={null}
                columns={[
                  { key: 'name', label: 'Workflow', render: v => <span className="font-bold text-slate-900">{v}</span> },
                  { key: 'version', label: 'Ver', render: v => <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg text-xs">v{v}</span> },
                  { key: 'pendingCount', label: 'Pending', right: true, render: v => <span className="font-semibold text-slate-700">{v}</span> },
                  { key: 'completedCount', label: 'Completed', right: true, render: v => <span className="font-semibold text-slate-700">{v}</span> },
                  { key: 'sopCount', label: 'SOP Docs', right: true, render: v => <span className="font-semibold text-emerald-600">{v}</span> },
                  { key: 'nonSopCount', label: 'Non-SOP', right: true, render: v => <span className="font-semibold text-slate-600">{v}</span> },
                  { key: 'actions', label: '', right: true, render: (_, row) => (
                    <ActionBtn label="Analytics" theme="purple" icon={<IconArrowRight />} onClick={() => navigate(`/workflows/details/${row.workflowId}`, { state: { readOnly: true } })} />
                  )},
                ]}
                rows={lists?.enrichedWorkflows || []}
                emptyText="No workflows in scope"
              />
            </Panel>
          )}

          {activeTab === 'sop' && (
            <Panel title="SOP Document Registry" subtitle="Standard Operating Procedures grouped by workflow template" noPad>
              <ExpandableTable
                data={(lists?.structuredWorkflows || []).filter(w => w.sopCount > 0)}
                searchKey="workflowName"
                pageSize={12}
                summaryColumns={[
                  { key: 'workflowName', label: 'Workflow Template', render: v => <span className="font-bold text-slate-900">{v}</span> },
                  { key: 'sopCount', label: 'SOP Documents', right: true, render: v => <span className="font-bold text-emerald-600 text-lg">{v}</span> },
                ]}
                detailColumns={[
                  { key: 'documentName', label: 'Document Name', render: v => <span className="font-semibold text-slate-900 block max-w-[280px] truncate" title={v}>{v}</span> },
                  { key: 'processName', label: 'Source Process', render: v => <span className="text-slate-600 block max-w-[200px] truncate" title={v}>{v}</span> },
                  { key: 'issueNo', label: 'Issue', render: v => v || '—' },
                  { key: 'partNumber', label: 'Part', render: v => v || '—' },
                  { key: 'actions', label: '', right: true, render: (_, row) => (
                    <div className="flex justify-end gap-1.5">
                      <ActionBtn label="View" theme="emerald" icon={<IconEye />} onClick={() => handleViewDoc(row.documentName, row.documentPath, row.documentId, row.documentType)} />
                      <ActionBtn label="Process" theme="slate" icon={<IconArrowRight />} onClick={() => navigate(`/process/view/${row.processId}`, { state: { readOnly: true } })} />
                    </div>
                  )},
                ]}
                detailKey="sopDocuments"
                emptyText="No SOP documents in the system"
              />
            </Panel>
          )}

          {activeTab === 'nonsop' && (
            <Panel title="Non-SOP Data Registry" subtitle="Supporting files grouped by workflow template" noPad>
              <ExpandableTable
                data={(lists?.structuredWorkflows || []).filter(w => w.nonSopCount > 0)}
                searchKey="workflowName"
                pageSize={12}
                summaryColumns={[
                  { key: 'workflowName', label: 'Workflow Template', render: v => <span className="font-bold text-slate-900">{v}</span> },
                  { key: 'nonSopCount', label: 'Total Files', right: true, render: v => <span className="font-bold text-slate-700 text-lg">{v}</span> },
                ]}
                detailColumns={[
                  { key: 'documentName', label: 'Document', render: v => <span className="font-semibold text-slate-900 block max-w-[280px] truncate" title={v}>{v}</span> },
                  { key: 'documentType', label: 'Type', render: v => <span className="font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded uppercase text-[10px] tracking-wider">{v}</span> },
                  { key: 'processName', label: 'Source Process', render: v => <span className="text-slate-600 block max-w-[200px] truncate" title={v}>{v}</span> },
                  { key: 'actions', label: '', right: true, render: (_, row) => (
                    <div className="flex justify-end gap-1.5">
                      <ActionBtn label="View" theme="slate" icon={<IconEye />} onClick={() => handleViewDoc(row.documentName, row.documentPath, row.documentId, row.documentType)} />
                      <ActionBtn label="Process" theme="slate" icon={<IconArrowRight />} onClick={() => navigate(`/process/view/${row.processId}`, { state: { readOnly: true } })} />
                    </div>
                  )},
                ]}
                detailKey="nonSopDocuments"
                emptyText="No Non-SOP documents in the system"
              />
            </Panel>
          )}

          {activeTab === 'incomplete' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4 items-start shadow-sm">
                <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl shrink-0">
                  <IconInfoCircle size={24} />
                </div>
                <div>
                  <h4 className="text-amber-900 font-bold text-base mb-1">Action Required: Fulfill Metadata Records</h4>
                  <p className="text-amber-800/80 text-sm leading-relaxed font-medium max-w-3xl">
                    These entries exist as metadata stubs. Physical files must be uploaded to resolve the deficit.
                    Open the process and select <strong className="bg-white/60 px-1.5 py-0.5 rounded border border-amber-200/60">"Fulfill Pending Metadata Documents"</strong>.
                  </p>
                </div>
              </div>

              {(lists?.metadataOnlyDocuments?.length ?? 0) > 0 ? (
                <>
                  <Panel title="Deficit by Department" subtitle="Missing metadata stubs aggregated by department" noPad>
                    <ExpandableTable
                      data={entities?.departmentMissingFiles || []}
                      searchKey="departmentName"
                      pageSize={8}
                      summaryColumns={[
                        { key: 'departmentName', label: 'Department', render: v => <span className="font-bold text-slate-900">{v}</span> },
                        { key: 'deptCode', label: 'Code', render: v => v ? <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">{v}</span> : '—' },
                        { key: 'count', label: 'Missing Files', right: true, render: v => <span className="font-bold text-xl text-amber-600">{v}</span> },
                        { key: 'sopCount', label: 'SOP', right: true, render: v => <span className="font-semibold text-emerald-600">{v}</span> },
                        { key: 'nonSopCount', label: 'Non-SOP', right: true, render: v => <span className="font-semibold text-slate-600">{v}</span> },
                      ]}
                      detailColumns={[
                        { key: 'intendedFileName', label: 'Target File' },
                        { key: 'processName', label: 'Process Ref' },
                        { key: 'isSopDocument', label: 'Category', render: v => (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${v ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {v ? 'SOP' : 'Non-SOP'}
                          </span>
                        )},
                      ]}
                      detailKey="documents"
                    />
                  </Panel>

                  <Panel title="Actionable Log" subtitle="Line items requiring file upload" noPad>
                    <DataTable
                      searchable
                      maxRows={15}
                      columns={[
                        { key: 'intendedFileName', label: 'Target File', render: (v, row) => (
                          <div>
                            <p className="font-bold text-slate-900">{`${v}.${row.intendedExtension}`}</p>
                            <p className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${row.isSopDocument ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {row.isSopDocument ? 'SOP' : 'Non-SOP'}
                            </p>
                          </div>
                        )},
                        { key: 'departmentName', label: 'Department' },
                        { key: 'processName', label: 'Process Ref', render: v => <span className="block max-w-xs truncate" title={v}>{v}</span> },
                        { key: 'actions', label: '', right: true, render: (_, row) => (
                          <ActionBtn label="Open Process" theme="amber" icon={<IconArrowRight />} onClick={() => navigate(`/process/view/${row.processId}`, { state: { readOnly: true } })} />
                        )},
                      ]}
                      rows={lists?.metadataOnlyDocuments || []}
                    />
                  </Panel>
                </>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-14 flex flex-col items-center text-center shadow-sm">
                  <div className="text-emerald-500 mb-5 bg-emerald-50 p-4 rounded-full">
                    <IconCircleCheck size={44} strokeWidth={2} />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">Zero Deficits</p>
                  <p className="text-base text-slate-500 mt-2 font-medium max-w-sm">All metadata records have been fulfilled with actual files.</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'physical' && (
            <>
              <Panel title="Departmental Demand" subtitle="Physical document requests grouped by department" noPad>
                <ExpandableTable
                  data={entities?.departmentPhysicalDemand || []}
                  searchKey="departmentName"
                  pageSize={8}
                  summaryColumns={[
                    { key: 'departmentName', label: 'Department', render: v => <span className="font-bold text-slate-900">{v}</span> },
                    { key: 'total', label: 'Total', right: true, render: v => <span className="font-bold text-slate-800 text-lg">{v}</span> },
                    { key: 'pending', label: 'Pending', right: true, render: v => <span className={`font-bold text-lg ${v > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{v}</span> },
                    { key: 'approved', label: 'Approved', right: true, render: v => <span className={`font-bold text-lg ${v > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{v}</span> },
                    { key: 'returned', label: 'Returned', right: true, render: v => <span className={`font-bold text-base ${v > 0 ? 'text-teal-600' : 'text-slate-300'}`}>{v}</span> },
                  ]}
                  detailColumns={[
                    { key: 'documentName', label: 'Document', render: v => <span className="font-semibold text-slate-800 block max-w-xs truncate" title={v}>{v}</span> },
                    { key: 'requestedBy', label: 'Requestor' },
                    { key: 'status', label: 'State', render: v => <StatusPill status={v} /> },
                  ]}
                  detailKey="requests"
                />
              </Panel>

              <Panel title="All Requests" subtitle="Flat list for search and filtering" noPad>
                <DataTable
                  searchable
                  maxRows={12}
                  statusFilterKey="status"
                  columns={[
                    { key: 'documentName', label: 'Document', render: v => <span className="font-bold text-slate-900 block max-w-sm truncate" title={v}>{v}</span> },
                    { key: 'departmentName', label: 'Department' },
                    { key: 'requestedBy', label: 'Requestor' },
                    { key: 'status', label: 'State', render: v => <StatusPill status={v} /> },
                    { key: 'createdAt', label: 'Date', render: v => <span className="text-xs font-medium text-slate-500">{moment(v).format('MMM D, YYYY')}</span> },
                    { key: 'actions', label: '', right: true, render: (_, row) => (
                      <ActionBtn label="History" theme="orange" icon={<IconHistory />} onClick={() => navigate(`/physical-documents/history/${row.requestId}`, { state: { request: row } })} />
                    )},
                  ]}
                  rows={lists?.physicalRequests || []}
                  emptyText="No physical document requests"
                />
              </Panel>
            </>
          )}

          {activeTab === 'entities' && (
            <>
              <Panel title="Workflow Family Document Stats" subtitle="Document output by workflow family">
                {entities?.workflowFamilyDocStats?.length > 0 ? (
                  <>
                    <div className="w-full pt-4 pb-2" style={{ minHeight: 300 }}>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={entities.workflowFamilyDocStats.slice(0, 8)} barSize={22} margin={{ left: -20, right: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                          <XAxis dataKey="familyName" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: '#F8FAFC' }} content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, color: '#334155', paddingTop: '16px' }} />
                          <Bar dataKey="totalSop" name="SOP" fill="#10B981" radius={[5, 5, 0, 0]} />
                          <Bar dataKey="totalNonSop" name="Non-SOP" fill="#94A3B8" radius={[5, 5, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      {entities.workflowFamilyDocStats.map(family => {
                        const total = family.totalSop + family.totalNonSop;
                        const sp = total ? Math.round((family.totalSop / total) * 100) : 0;
                        return (
                          <div key={family.familyId} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all">
                            <p className="text-sm font-bold text-slate-900 mb-0.5 truncate" title={family.familyName}>{family.familyName}</p>
                            <p className="text-xs font-semibold text-slate-400 mb-3">{family.workflows.length} versions · {family.totalProcesses} procs</p>
                            <div className="flex h-2 rounded-full overflow-hidden mb-2.5">
                              <div style={{ width: `${sp}%`, backgroundColor: '#10B981' }} />
                              <div style={{ width: `${100 - sp}%`, backgroundColor: '#CBD5E1' }} />
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-emerald-600">SOP: {family.totalSop}</span>
                              <span className="text-slate-400">Non: {family.totalNonSop}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-sm font-semibold text-slate-400">No taxonomy data available</div>
                )}
              </Panel>

              <Panel title="Query Frequency by Workflow" subtitle="Cross-reference of queries vs parent workflows" noPad>
                <DataTable
                  searchable
                  maxRows={12}
                  columns={[
                    { key: 'workflowName', label: 'Workflow', render: v => <span className="font-bold text-slate-900">{v}</span> },
                    { key: 'total', label: 'Total', right: true, render: v => <span className="font-bold text-slate-800 text-base">{v}</span> },
                    { key: 'resolved', label: 'Resolved', right: true, render: v => <span className="font-bold text-emerald-600">{v}</span> },
                    { key: 'open', label: 'Open', right: true, render: v => <span className="font-bold text-amber-600">{v}</span> },
                    { key: 'total', label: 'Resolution %', render: (_, row) => {
                      const p = row.total ? pct(row.resolved, row.total) : 0;
                      return (
                        <div className="flex items-center gap-3 min-w-[140px]">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden max-w-[80px]">
                            <div className="h-full rounded-full bg-teal-500" style={{ width: `${p}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-700 w-10 text-right">{p}%</span>
                        </div>
                      );
                    }},
                  ]}
                  rows={entities?.queriesPerWorkflow || []}
                  emptyText="No frequency analytics available"
                />
              </Panel>
            </>
          )}

          {activeTab === 'queries' && (
            <Panel title="System Query Log" subtitle="All user questions and clarifications" noPad>
              <DataTable
                searchable
                maxRows={15}
                statusFilterKey="status"
                columns={[
                  { key: 'queryText', label: 'Query', render: v => <span className="font-semibold text-slate-900 block max-w-sm truncate" title={v}>{v}</span> },
                  { key: 'workflowName', label: 'Workflow', render: v => <span className="text-slate-500 text-xs block max-w-[160px] truncate" title={v}>{v}</span> },
                  { key: 'processName', label: 'Process', render: v => <span className="text-slate-600 block max-w-[160px] truncate" title={v}>{v}</span> },
                  { key: 'initiatorName', label: 'Author', render: v => <span className="font-medium text-slate-600">{v}</span> },
                  { key: 'status', label: 'State', render: v => <StatusPill status={v} /> },
                  { key: 'createdAt', label: 'Date', render: v => <span className="text-slate-500 text-xs">{moment(v).format('MMM D, YY HH:mm')}</span> },
                  { key: 'actions', label: '', right: true, render: (_, row) => (
                    <ActionBtn label="Context" theme="indigo" icon={<IconArrowRight />} onClick={() => navigate(`/process/view/${row.processId}`, { state: { readOnly: true } })} />
                  )},
                ]}
                rows={lists?.queries?.details || []}
                emptyText="No queries logged"
              />
            </Panel>
          )}

        </div>
      </div>
    </div>
  );
}