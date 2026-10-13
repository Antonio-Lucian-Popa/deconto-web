'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch, apiDownload } from '@/lib/api-client';
import type { Expense, ExpenseCategory, Trip } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
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
  Pencil,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { FormEvent, useState, useMemo } from 'react';
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
  const queryClient = useQueryClient();
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
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    tripId: '', category: 'ALTELE' as ExpenseCategory, amount: '', currency: 'RON',
    date: new Date().toISOString().slice(0, 10), merchant: '', merchantCif: '', notes: '',
    fuelLiters: '', fuelPricePerLiter: '', mileage: '', accommodationCheckIn: '',
    accommodationCheckOut: '', accommodationNights: '', verified: false,
  });

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
  const { data: trips } = useQuery({
    queryKey: ['trips', 'expense-form'],
    queryFn: () => apiFetch<Trip[]>('/api/trips'),
  });
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

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        tripId: expenseForm.tripId || undefined,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        currency: expenseForm.currency.trim().toUpperCase() || 'RON',
        date: new Date(`${expenseForm.date}T12:00:00`).toISOString(),
        merchant: expenseForm.merchant.trim(),
        merchantCif: expenseForm.merchantCif.trim(),
        notes: expenseForm.notes.trim() || undefined,
        fuelLiters: expenseForm.category === 'COMBUSTIBIL' && expenseForm.fuelLiters ? Number(expenseForm.fuelLiters) : undefined,
        fuelPricePerLiter: expenseForm.category === 'COMBUSTIBIL' && expenseForm.fuelPricePerLiter ? Number(expenseForm.fuelPricePerLiter) : undefined,
        mileage: expenseForm.category === 'COMBUSTIBIL' && expenseForm.mileage ? Number(expenseForm.mileage) : undefined,
        accommodationCheckIn: expenseForm.category === 'CAZARE' && expenseForm.accommodationCheckIn ? new Date(`${expenseForm.accommodationCheckIn}T12:00:00`).toISOString() : undefined,
        accommodationCheckOut: expenseForm.category === 'CAZARE' && expenseForm.accommodationCheckOut ? new Date(`${expenseForm.accommodationCheckOut}T12:00:00`).toISOString() : undefined,
        accommodationNights: expenseForm.category === 'CAZARE' && expenseForm.accommodationNights ? Number(expenseForm.accommodationNights) : undefined,
        verified: expenseForm.verified,
      };
      return apiFetch<Expense>(editing ? `/api/expenses/${editing.id}` : '/api/expenses', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(editing ? 'Cheltuială actualizată' : 'Cheltuială adăugată');
      setFormOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function openCreate() {
    setEditing(null);
    setExpenseForm({ tripId: '', category: 'ALTELE', amount: '', currency: 'RON', date: new Date().toISOString().slice(0, 10), merchant: '', merchantCif: '', notes: '', fuelLiters: '', fuelPricePerLiter: '', mileage: '', accommodationCheckIn: '', accommodationCheckOut: '', accommodationNights: '', verified: false });
    setFormOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setExpenseForm({
      tripId: expense.tripId ?? '', category: expense.category, amount: String(expense.amount),
      currency: expense.currency, date: expense.date.slice(0, 10), merchant: expense.merchant ?? '',
      merchantCif: expense.merchantCif ?? '', notes: expense.notes ?? '',
      fuelLiters: expense.fuelLiters != null ? String(expense.fuelLiters) : '',
      fuelPricePerLiter: expense.fuelPricePerLiter != null ? String(expense.fuelPricePerLiter) : '',
      mileage: expense.mileage != null ? String(expense.mileage) : '',
      accommodationCheckIn: expense.accommodationCheckIn?.slice(0, 10) ?? '',
      accommodationCheckOut: expense.accommodationCheckOut?.slice(0, 10) ?? '',
      accommodationNights: expense.accommodationNights != null ? String(expense.accommodationNights) : '',
      verified: expense.verified,
    });
    setFormOpen(true);
  }

  function submitExpense(event: FormEvent) {
    event.preventDefault();
    saveMutation.mutate();
  }

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Registrul cheltuielilor</h2>
            <p className="mt-1 text-sm text-slate-500">Adaugă și corectează bonurile și facturile companiei.</p>
          </div>
          {user?.role !== 'ACCOUNTANT' && <Button onClick={openCreate}><Plus size={16} /> Adaugă cheltuială</Button>}
        </div>
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
                  ? 'border border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-950/20'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
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
                    ? 'border border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-950/20'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
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
                    user?.role !== 'ACCOUNTANT' ? 'Acțiuni' : null,
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
                      {Array.from({ length: (canFilterByUser ? 8 : 7) + (user?.role !== 'ACCOUNTANT' ? 1 : 0) }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={(canFilterByUser ? 8 : 7) + (user?.role !== 'ACCOUNTANT' ? 1 : 0)}
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
                        <td className="px-4 py-3 text-slate-600 text-sm whitespace-nowrap">
                          {formatDate(e.date)}
                        </td>
                        {canFilterByUser && (
                          <td className="px-4 py-3 text-slate-600 text-sm">
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
                          <p className="text-slate-950 text-sm">{e.merchant ?? '—'}</p>
                          {e.merchantCif && (
                            <p className="text-gray-500 text-xs">CIF: {e.merchantCif}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-sm max-w-40">
                          <p className="truncate">{e.notes ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-slate-950 text-sm font-medium">
                            {formatRON(e.amount, e.currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {e.verified ? (
                            <span className="text-xs font-semibold text-emerald-600">✓ Da</span>
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
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200 group-hover:border-blue-500 transition-colors"
                              />
                              <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ImageIcon size={12} className="text-white" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        {user?.role !== 'ACCOUNTANT' && (
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil size={14} /> Editează</Button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && filtered.length > PAGE_SIZE && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-gray-500">
                {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} din {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-30"
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
                            : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Editează cheltuiala' : 'Adaugă cheltuială'} size="lg">
        <form onSubmit={submitExpense} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Categorie *" required value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value as ExpenseCategory })}>
              {CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}
            </Select>
            <Select label="Decont asociat" value={expenseForm.tripId} onChange={(event) => setExpenseForm({ ...expenseForm, tripId: event.target.value })}>
              <option value="">Fără decont / decontul activ</option>
              {(trips ?? []).filter((trip) => trip.status !== 'APPROVED').map((trip) => <option key={trip.id} value={trip.id}>{trip.tripNumber ?? 'Decont'} — {trip.destination}</option>)}
            </Select>
            <Input label="Sumă *" required type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} />
            <Input label="Monedă *" required maxLength={3} value={expenseForm.currency} onChange={(event) => setExpenseForm({ ...expenseForm, currency: event.target.value.toUpperCase() })} />
            <Input label="Data *" required type="date" value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} />
            <Input label="Comerciant *" required value={expenseForm.merchant} onChange={(event) => setExpenseForm({ ...expenseForm, merchant: event.target.value })} />
            <Input label="CIF comerciant *" required value={expenseForm.merchantCif} onChange={(event) => setExpenseForm({ ...expenseForm, merchantCif: event.target.value })} />
            <div className="flex items-center gap-3 pt-7">
              <input id="expense-verified" type="checkbox" checked={expenseForm.verified} onChange={(event) => setExpenseForm({ ...expenseForm, verified: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              <label htmlFor="expense-verified" className="text-sm font-medium text-slate-700">Document verificat</label>
            </div>
          </div>

          {expenseForm.category === 'COMBUSTIBIL' && (
            <div className="grid gap-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:grid-cols-3">
              <Input label="Litri" type="number" min="0.01" step="0.01" value={expenseForm.fuelLiters} onChange={(event) => setExpenseForm({ ...expenseForm, fuelLiters: event.target.value })} />
              <Input label="Preț / litru" type="number" min="0.01" step="0.001" value={expenseForm.fuelPricePerLiter} onChange={(event) => setExpenseForm({ ...expenseForm, fuelPricePerLiter: event.target.value })} />
              <Input label="Kilometraj" type="number" min="0" value={expenseForm.mileage} onChange={(event) => setExpenseForm({ ...expenseForm, mileage: event.target.value })} />
            </div>
          )}

          {expenseForm.category === 'CAZARE' && (
            <div className="grid gap-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:grid-cols-3">
              <Input label="Check-in" type="date" value={expenseForm.accommodationCheckIn} onChange={(event) => setExpenseForm({ ...expenseForm, accommodationCheckIn: event.target.value })} />
              <Input label="Check-out" type="date" min={expenseForm.accommodationCheckIn} value={expenseForm.accommodationCheckOut} onChange={(event) => setExpenseForm({ ...expenseForm, accommodationCheckOut: event.target.value })} />
              <Input label="Număr nopți" type="number" min="0" value={expenseForm.accommodationNights} onChange={(event) => setExpenseForm({ ...expenseForm, accommodationNights: event.target.value })} />
            </div>
          )}

          <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Note</label><textarea className="app-input min-h-24 w-full resize-y" value={expenseForm.notes} onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })} /></div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Anulează</Button>
            <Button type="submit" isLoading={saveMutation.isPending}>{editing ? 'Salvează modificările' : 'Adaugă cheltuiala'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
