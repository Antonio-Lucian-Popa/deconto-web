'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch, apiDownload } from '@/lib/api-client';
import type { Expense, ExpenseCategory } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useUsers, userDisplayName } from '@/hooks/use-users';
import { Lightbox } from '@/components/ui/lightbox';
import {
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import type { SheetData } from 'write-excel-file/browser';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  COMBUSTIBIL: 'Combustibil',
  MASA: 'Masă',
  CAZARE: 'Cazare',
  TRANSPORT: 'Transport',
  DIURNA: 'Diurnă',
  ALTELE: 'Altele',
};
const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  COMBUSTIBIL: 'warning',
  MASA: 'success',
  CAZARE: 'default',
  TRANSPORT: 'info',
  DIURNA: 'gray',
  ALTELE: 'gray',
} as Record<ExpenseCategory, 'warning' | 'success' | 'default' | 'info' | 'gray'>;

function formatRON(amount: number, currency = 'RON') {
  if (currency === 'RON') {
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(
      amount
    );
  }
  return `${amount.toFixed(2)} ${currency}`;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

const PAGE_SIZE = 20;
const CATEGORIES: ExpenseCategory[] = [
  'COMBUSTIBIL',
  'MASA',
  'CAZARE',
  'TRANSPORT',
  'DIURNA',
  'ALTELE',
];

export default function CheltuieliPage() {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');
  const { user } = useAuth();
  const canFilterByUser = user?.role !== 'EMPLOYEE';

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>('');
  const [userFilter, setUserFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [page, setPage] = useState(1);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Build API query params
  const queryStr = useMemo(() => {
    const params = new URLSearchParams();
    if (categoryFilter) params.set('category', categoryFilter);
    if (userFilter && canFilterByUser) params.set('userId', userFilter);
    if (fromFilter) params.set('from', fromFilter);
    if (toFilter) params.set('to', toFilter);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [categoryFilter, userFilter, fromFilter, toFilter, canFilterByUser]);

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', queryStr],
    queryFn: () => apiFetch<Expense[]>(`/api/expenses${queryStr}`),
  });

  const { data: users } = useUsers();
  const usersMap = useMemo(
    () => new Map((users ?? []).map((u) => [u.id, u])),
    [users]
  );

  // Client-side search
  const filtered = useMemo(() => {
    if (!expenses) return [];
    if (!search.trim()) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e) =>
        (e.merchant ?? '').toLowerCase().includes(q) ||
        (e.notes ?? '').toLowerCase().includes(q) ||
        (e.merchantCif ?? '').toLowerCase().includes(q)
    );
  }, [expenses, search]);

  // Aggregated total
  const totalRON = useMemo(
    () => filtered.filter((e) => e.currency === 'RON').reduce((s, e) => s + e.amount, 0),
    [filtered]
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetPage() {
    setPage(1);
  }

  async function handleCsvExport() {
    setExportingCsv(true);
    try {
      const params = new URLSearchParams();
      if (fromFilter) params.set('from', fromFilter);
      if (toFilter) params.set('to', toFilter);
      if (userFilter && canFilterByUser) params.set('userId', userFilter);
      const qs = params.toString();
      await apiDownload(
        `/api/expenses/export${qs ? `?${qs}` : ''}`,
        'cheltuieli-export.csv'
      );
    } catch {
      toast.error('Exportul CSV a eşuat');
    } finally {
      setExportingCsv(false);
    }
  }

  async function handleExcelExport() {
    setExportingExcel(true);
    try {
      const { default: writeXlsxFile } = await import('write-excel-file/browser');

      const excelDate = (date: string | null) => {
        if (!date) return null;
        const [year, month, day] = date.slice(0, 10).split('-').map(Number);
        return new Date(year, month - 1, day);
      };

      const headers = [
        'Data',
        'Angajat',
        'Categorie',
        'Comerciant',
        'CIF',
        'Note',
        'Sumă',
        'Monedă',
        'Verificat',
        'Litri combustibil',
        'Preț/litru',
        'Check-in',
        'Check-out',
        'Nopți',
      ];
      const data: SheetData = [
        headers.map((value) => ({
          value,
          fontWeight: 'bold',
          textColor: '#FFFFFF',
          backgroundColor: '#2563EB',
          height: 24,
        })),
      ];

      filtered.forEach((expense) => {
        const employee = usersMap.get(expense.userId);
        data.push([
          { value: excelDate(expense.date) ?? undefined, type: Date, format: 'dd.mm.yyyy' },
          employee ? userDisplayName(employee) : '',
          CATEGORY_LABELS[expense.category],
          expense.merchant ?? '',
          expense.merchantCif ?? '',
          { value: expense.notes ?? '', wrap: true },
          { value: expense.amount, type: Number, format: '#,##0.00' },
          expense.currency,
          expense.verified ? 'Da' : 'Nu',
          expense.fuelLiters == null
            ? null
            : { value: expense.fuelLiters, type: Number, format: '#,##0.00' },
          expense.fuelPricePerLiter == null
            ? null
            : { value: expense.fuelPricePerLiter, type: Number, format: '#,##0.00' },
          expense.accommodationCheckIn
            ? { value: excelDate(expense.accommodationCheckIn)!, type: Date, format: 'dd.mm.yyyy' }
            : null,
          expense.accommodationCheckOut
            ? { value: excelDate(expense.accommodationCheckOut)!, type: Date, format: 'dd.mm.yyyy' }
            : null,
          expense.accommodationNights,
        ]);
      });

      const file = writeXlsxFile(data, {
        sheet: 'Cheltuieli',
        stickyRowsCount: 1,
        showGridLines: false,
        columns: [13, 24, 16, 28, 16, 36, 14, 10, 12, 18, 14, 13, 13, 9].map(
          (width) => ({ width })
        ),
      });
      await file.toFile(
        `cheltuieli-${fromFilter || 'inceput'}-${toFilter || 'prezent'}.xlsx`
      );
    } catch {
      toast.error('Exportul Excel a eşuat');
    } finally {
      setExportingExcel(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="app-content space-y-4">
        {/* Filters */}
        <div className="app-filter-bar">
          {/* Search */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Caută comerciant..."
              className="app-input w-full pl-9 sm:w-56"
            />
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => {
                setCategoryFilter('');
                resetPage();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === ''
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/30'
                  : 'bg-white/[0.07] text-slate-400 hover:bg-white/[0.12] hover:text-white'
              }`}
            >
              Toate
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategoryFilter(cat);
                  resetPage();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/30'
                    : 'bg-white/[0.07] text-slate-400 hover:bg-white/[0.12] hover:text-white'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Employee filter */}
          {canFilterByUser && users && users.length > 0 && (
            <select
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                resetPage();
              }}
              className="app-select w-full sm:w-auto"
            >
              <option value="">Toți angajații</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {userDisplayName(u)}
                </option>
              ))}
            </select>
          )}

          {/* Date range */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-500" />
            <input
              type="date"
              value={fromFilter}
              onChange={(e) => {
                setFromFilter(e.target.value);
                resetPage();
              }}
              className="app-input w-[9rem]"
            />
            <span className="text-slate-500 text-sm">-</span>
            <input
              type="date"
              value={toFilter}
              onChange={(e) => {
                setToFilter(e.target.value);
                resetPage();
              }}
              className="app-input w-[9rem]"
            />
          </div>

          {/* Exports */}
          <div className="sm:ml-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="secondary" isLoading={exportingCsv} onClick={handleCsvExport}>
              <Download size={16} /> {tCommon('export')}
            </Button>
            <Button
              variant="secondary"
              isLoading={exportingExcel}
              disabled={filtered.length === 0}
              onClick={handleExcelExport}
            >
              <FileSpreadsheet size={16} /> Exportă Excel
            </Button>
          </div>
        </div>

        {/* Summary bar */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center gap-6 px-4 py-2.5 app-panel text-sm">
            <span className="text-gray-400">
              <span className="text-slate-950 font-medium">{filtered.length}</span> cheltuieli
            </span>
            <span className="text-gray-400">
              Total RON:{' '}
              <span className="text-slate-950 font-medium">
                {new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(
                  totalRON
                )}
              </span>
            </span>
          </div>
        )}

        {/* Table */}
        <div className="app-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  {[
                    'Data',
                    canFilterByUser ? 'Angajat' : null,
                    'Categorie',
                    'Comerciant',
                    'Note',
                    'Sumă',
                    'Verificat',
                    'Bon',
                  ]
                    .filter(Boolean)
                    .map((h) => (
                      <th
                        key={h as string}
                        className="whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: canFilterByUser ? 8 : 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canFilterByUser ? 8 : 7}
                      className="text-center text-gray-500 py-16 text-sm"
                    >
                      Nu există cheltuieli
                    </td>
                  </tr>
                ) : (
                  paginated.map((e) => {
                    const emp = usersMap.get(e.userId);
                    return (
                      <tr
                        key={e.id}
                        className="transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">
                          {formatDate(e.date)}
                        </td>
                        {canFilterByUser && (
                          <td className="px-4 py-3 text-gray-300 text-sm">
                            {emp ? userDisplayName(emp) : '—'}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              (CATEGORY_COLORS[
                                e.category
                              ] as 'warning' | 'success' | 'default' | 'info' | 'gray') ?? 'gray'
                            }
                          >
                            {CATEGORY_LABELS[e.category] ?? e.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white text-sm">{e.merchant ?? '—'}</p>
                          {e.merchantCif && (
                            <p className="text-gray-500 text-xs">CIF: {e.merchantCif}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm max-w-40">
                          <p className="truncate">{e.notes ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-white text-sm font-medium">
                            {formatRON(e.amount, e.currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {e.verified ? (
                            <span className="text-green-400 text-xs">✓ Da</span>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {e.imageUrl ? (
                            <button
                              onClick={() => setLightboxSrc(e.imageUrl!)}
                              className="group relative"
                              title="Click pentru a mări"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={e.imageUrl}
                                alt="Bon"
                                className="w-10 h-10 object-cover rounded-lg border border-white/10 group-hover:border-blue-500 transition-colors"
                              />
                              <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ImageIcon size={12} className="text-white" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && filtered.length > PAGE_SIZE && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-white/10">
              <span className="text-xs text-gray-500">
                {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} din {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (arr[idx - 1] as number) < p - 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '...' ? (
                      <span key={`el-${idx}`} className="px-2 text-gray-500 text-sm">
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                          page === p
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
