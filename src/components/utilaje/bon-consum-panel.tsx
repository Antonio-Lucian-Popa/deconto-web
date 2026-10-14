'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  FileText,
  Receipt,
  Eye,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import type { BonConsum, BonSourceDocType, Report, Utilaj } from '@/lib/api-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { PdfViewer } from '@/components/ui/pdf-viewer';

const SOURCE_DOC_LABELS: Record<BonSourceDocType, string> = {
  BON_FISCAL: 'Bon fiscal',
  FACTURA: 'Factură',
  BON_PREDARE: 'Bon de predare',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(value)
  );
}

function formatMoney(value: number | null, currency = 'RON') {
  if (value == null) return '—';
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

type EntryForm = {
  utilajId: string;
  date: string;
  hoursWorked: string;
  litersAllocated: string;
  consumJustificat: string;
  workDescription: string;
};

type BonForm = {
  date: string;
  workSite: string;
  sourceDocType: '' | BonSourceDocType;
  sourceDocNumber: string;
  sourceDocDate: string;
  liters: string;
  pricePerLiter: string;
  total: string;
  currency: string;
  intocmitNume: string;
  aprobatNume: string;
  entries: EntryForm[];
};

function emptyEntry(utilajId = ''): EntryForm {
  return {
    utilajId,
    date: new Date().toISOString().slice(0, 10),
    hoursWorked: '',
    litersAllocated: '',
    consumJustificat: '',
    workDescription: '',
  };
}

function emptyForm(utilajId = ''): BonForm {
  return {
    date: new Date().toISOString().slice(0, 10),
    workSite: '',
    sourceDocType: '',
    sourceDocNumber: '',
    sourceDocDate: '',
    liters: '',
    pricePerLiter: '',
    total: '',
    currency: 'RON',
    intocmitNume: '',
    aprobatNume: '',
    entries: [emptyEntry(utilajId)],
  };
}

interface BonConsumPanelProps {
  utilaje: Utilaj[];
  canManage: boolean;
  initialUtilajId?: string;
}

export function BonConsumPanel({ utilaje, canManage, initialUtilajId = '' }: BonConsumPanelProps) {
  const queryClient = useQueryClient();
  const [filterUtilaj, setFilterUtilaj] = useState(initialUtilajId);
  const [filterMonth, setFilterMonth] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<BonForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<BonConsum | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ path: string; title: string } | null>(null);

  const utilajById = useMemo(() => new Map(utilaje.map((u) => [u.id, u])), [utilaje]);

  const { data: bonuri, isLoading, isError, refetch } = useQuery({
    queryKey: ['bon-consum', filterUtilaj || 'all'],
    queryFn: () =>
      apiFetch<BonConsum[]>(`/api/bon-consum${filterUtilaj ? `?utilajId=${filterUtilaj}` : ''}`),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const payload = {
        date: form.date,
        workSite: form.workSite.trim(),
        sourceDocType: form.sourceDocType || undefined,
        sourceDocNumber: form.sourceDocNumber.trim() || undefined,
        sourceDocDate: form.sourceDocDate || undefined,
        liters: form.liters ? Number(form.liters) : undefined,
        pricePerLiter: form.pricePerLiter ? Number(form.pricePerLiter) : undefined,
        total: form.total ? Number(form.total) : undefined,
        currency: form.currency || 'RON',
        intocmitNume: form.intocmitNume.trim() || undefined,
        aprobatNume: form.aprobatNume.trim() || undefined,
        entries: form.entries.map((e) => ({
          utilajId: e.utilajId,
          date: e.date,
          hoursWorked: Number(e.hoursWorked),
          litersAllocated: Number(e.litersAllocated),
          consumJustificat: e.consumJustificat ? Number(e.consumJustificat) : undefined,
          workDescription: e.workDescription.trim(),
        })),
      };
      return apiFetch<BonConsum>('/api/bon-consum', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success('Bon de consum înregistrat');
      setFormOpen(false);
      setForm(emptyForm());
      queryClient.invalidateQueries({ queryKey: ['bon-consum'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/bon-consum/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Bon de consum șters');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['bon-consum'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function generateAndView(bon: BonConsum) {
    setGeneratingId(bon.id);
    try {
      const report = await apiFetch<Report>(`/api/reports/bon-consum/${bon.id}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setViewer({
        path: `/api/reports/${report.id}/view`,
        title: `Bon consum${bon.bonNumber ? ` nr. ${bon.bonNumber}` : ''}`,
      });
      toast.success('Bon generat (PDF) și trimis la contabilitate');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generarea a eșuat');
    } finally {
      setGeneratingId(null);
    }
  }

  function openCreate() {
    setForm(emptyForm(filterUtilaj || ''));
    setFormOpen(true);
  }

  function updateEntry(index: number, patch: Partial<EntryForm>) {
    setForm((prev) => ({
      ...prev,
      entries: prev.entries.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.workSite.trim()) return toast.error('Completează punctul de lucru');
    if (form.entries.length === 0) return toast.error('Adaugă cel puțin o linie de consum');
    for (const [i, e] of form.entries.entries()) {
      if (!e.utilajId) return toast.error(`Linia ${i + 1}: selectează utilajul`);
      if (!e.hoursWorked || Number(e.hoursWorked) <= 0)
        return toast.error(`Linia ${i + 1}: ore lucrate invalide`);
      if (!e.litersAllocated || Number(e.litersAllocated) <= 0)
        return toast.error(`Linia ${i + 1}: litri alocați invalizi`);
      if (!e.workDescription.trim())
        return toast.error(`Linia ${i + 1}: descrie lucrarea efectuată`);
    }
    createMutation.mutate();
  }

  // Auto-compute total from liters × price if both present and total is empty.
  const autoTotal =
    form.liters && form.pricePerLiter ? (Number(form.liters) * Number(form.pricePerLiter)).toFixed(2) : '';

  const noUtilaje = utilaje.length === 0;

  // Month filter is applied client-side on the bon date (utilaj filter is server-side).
  const filtered = useMemo(() => {
    const list = bonuri ?? [];
    if (!filterMonth) return list;
    return list.filter((b) => (b.date ?? '').slice(0, 7) === filterMonth);
  }, [bonuri, filterMonth]);

  const PER_PAGE = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // Totals across the whole filtered set (not just the current page) — useful
  // for the accountant pulling a month.
  const sumLiters = filtered.reduce(
    (s, b) => s + b.entries.reduce((es, e) => es + (e.litersAllocated ?? 0), 0),
    0
  );
  const sumTotal = filtered.reduce((s, b) => s + (b.total ?? 0), 0);

  function resetToFirstPage() {
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div className="app-filter-bar">
        <div className="w-full sm:w-64">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Filtrează după utilaj
          </label>
          <div className="relative">
            <select
              className="app-select w-full"
              value={filterUtilaj}
              onChange={(e) => {
                setFilterUtilaj(e.target.value);
                resetToFirstPage();
              }}
            >
              <option value="">Toate utilajele</option>
              {utilaje.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.inventoryNumber ? ` (${u.inventoryNumber})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>
        <div className="w-full sm:w-48">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Luna
          </label>
          <input
            type="month"
            className="app-input w-full"
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              resetToFirstPage();
            }}
          />
        </div>
        {filterMonth && (
          <button
            type="button"
            onClick={() => {
              setFilterMonth('');
              resetToFirstPage();
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Resetează luna
          </button>
        )}
        <div className="text-sm text-slate-500 sm:ml-auto sm:text-right">
          <span>
            <strong className="text-slate-900">{filtered.length}</strong> bonuri
          </span>
          {filtered.length > 0 && (
            <span className="ml-3 hidden text-slate-400 sm:inline">
              {sumLiters.toFixed(1)} l · {formatMoney(sumTotal)}
            </span>
          )}
        </div>
        {canManage && (
          <Button onClick={openCreate} disabled={noUtilaje}>
            <Plus size={16} /> Adaugă bon
          </Button>
        )}
      </div>

      {noUtilaje && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Adaugă mai întâi un utilaj pentru a putea întocmi bonuri de consum.
        </div>
      )}

      {isLoading ? (
        <div className="app-panel space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="app-panel p-8 text-center">
          <p className="font-semibold text-slate-900">Bonurile nu au putut fi încărcate.</p>
          <Button className="mt-4" variant="secondary" onClick={() => void refetch()}>
            Reîncearcă
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="app-panel flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Receipt size={27} />
          </div>
          <h3 className="font-semibold text-slate-950">Niciun bon de consum</h3>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            {filterMonth
              ? 'Nu există bonuri în luna selectată.'
              : filterUtilaj
              ? 'Acest utilaj nu are bonuri de consum înregistrate.'
              : 'Înregistrează consumul de combustibil al utilajelor pentru a genera bonuri conforme.'}
          </p>
          {canManage && !noUtilaje && !filterMonth && (
            <Button className="mt-5" onClick={openCreate}>
              <Plus size={16} /> Adaugă bon
            </Button>
          )}
        </div>
      ) : (
        <div className="app-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Bon</th>
                  <th>Data</th>
                  <th>Punct de lucru</th>
                  <th>Utilaje</th>
                  <th style={{ textAlign: 'right' }}>Ore</th>
                  <th style={{ textAlign: 'right' }}>Litri</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((bon) => {
                  const totalHours = bon.entries.reduce((s, e) => s + (e.hoursWorked ?? 0), 0);
                  const totalLiters = bon.entries.reduce((s, e) => s + (e.litersAllocated ?? 0), 0);
                  const utilajeNames = [
                    ...new Set(
                      bon.entries.map(
                        (e) => e.utilaj?.name ?? utilajById.get(e.utilajId)?.name ?? 'Utilaj'
                      )
                    ),
                  ];
                  return (
                    <tr key={bon.id}>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Receipt size={15} />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{bon.bonNumber ?? '—'}</p>
                            {bon.sourceDocType && (
                              <p className="text-[11px] text-slate-400">
                                {SOURCE_DOC_LABELS[bon.sourceDocType]}
                                {bon.sourceDocNumber ? ` ${bon.sourceDocNumber}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-sm text-slate-600">{formatDate(bon.date)}</td>
                      <td className="text-sm text-slate-600">{bon.workSite}</td>
                      <td className="max-w-[220px] text-sm text-slate-600">
                        <span className="line-clamp-2">{utilajeNames.join(', ')}</span>
                        {bon.entries.length > 1 && (
                          <span className="text-xs text-slate-400"> ({bon.entries.length} linii)</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-sm font-medium text-slate-700" style={{ textAlign: 'right' }}>
                        {totalHours.toFixed(1)}
                      </td>
                      <td className="whitespace-nowrap text-sm font-medium text-slate-700" style={{ textAlign: 'right' }}>
                        {totalLiters.toFixed(1)}
                      </td>
                      <td className="whitespace-nowrap text-sm font-semibold text-slate-900" style={{ textAlign: 'right' }}>
                        {formatMoney(bon.total, bon.currency)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => generateAndView(bon)}
                            disabled={generatingId === bon.id}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
                            title="Generează PDF și vizualizează"
                          >
                            {generatingId === bon.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Eye size={14} />
                            )}
                            {generatingId === bon.id ? 'Se generează…' : 'PDF'}
                          </button>
                          {canManage && (
                            <button
                              onClick={() => setDeleteTarget(bon)}
                              className="inline-flex items-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Șterge bonul"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {filtered.length} bonuri · pagina {currentPage} din {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={15} /> Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Următor <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Adaugă bon de consum combustibil" size="lg">
        <form onSubmit={submit} className="space-y-6">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Date bon</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Data bonului *"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <Input
                label="Punct de lucru *"
                required
                value={form.workSite}
                onChange={(e) => setForm({ ...form, workSite: e.target.value })}
                placeholder="Ex. Șantier DN2, km 45"
              />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              Document sursă (opțional)
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Tip document"
                value={form.sourceDocType}
                onChange={(e) => setForm({ ...form, sourceDocType: e.target.value as BonForm['sourceDocType'] })}
              >
                <option value="">—</option>
                {Object.entries(SOURCE_DOC_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input
                label="Număr document"
                value={form.sourceDocNumber}
                onChange={(e) => setForm({ ...form, sourceDocNumber: e.target.value })}
                placeholder="Ex. 1234567"
              />
              <Input
                label="Data document"
                type="date"
                value={form.sourceDocDate}
                onChange={(e) => setForm({ ...form, sourceDocDate: e.target.value })}
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Input
                label="Litri achiziționați"
                type="number"
                min="0"
                step="0.01"
                value={form.liters}
                onChange={(e) => setForm({ ...form, liters: e.target.value })}
                placeholder="Ex. 200"
              />
              <Input
                label="Preț / litru"
                type="number"
                min="0"
                step="0.001"
                value={form.pricePerLiter}
                onChange={(e) => setForm({ ...form, pricePerLiter: e.target.value })}
                placeholder="Ex. 7.45"
              />
              <Input
                label="Total"
                type="number"
                min="0"
                step="0.01"
                value={form.total}
                onChange={(e) => setForm({ ...form, total: e.target.value })}
                placeholder={autoTotal || 'Ex. 1490'}
              />
            </div>
            {autoTotal && !form.total && (
              <button
                type="button"
                onClick={() => setForm({ ...form, total: autoTotal })}
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Calculează total: {autoTotal} {form.currency}
              </button>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Linii de consum *</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setForm({ ...form, entries: [...form.entries, emptyEntry(filterUtilaj || '')] })}
              >
                <Plus size={14} /> Adaugă linie
              </Button>
            </div>
            <div className="space-y-4">
              {form.entries.map((entry, index) => {
                const utilaj = utilajById.get(entry.utilajId);
                const norm = utilaj?.fuelConsumptionPerHour ?? null;
                const suggested =
                  norm != null && entry.hoursWorked ? (norm * Number(entry.hoursWorked)).toFixed(2) : null;
                return (
                  <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Linia {index + 1}</span>
                      {form.entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm({ ...form, entries: form.entries.filter((_, i) => i !== index) })
                          }
                          className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={13} /> Elimină
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        label="Utilaj *"
                        value={entry.utilajId}
                        onChange={(e) => updateEntry(index, { utilajId: e.target.value })}
                      >
                        <option value="">Selectează utilajul…</option>
                        {utilaje.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                            {u.inventoryNumber ? ` (${u.inventoryNumber})` : ''}
                          </option>
                        ))}
                      </Select>
                      <Input
                        label="Data *"
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateEntry(index, { date: e.target.value })}
                      />
                      <Input
                        label="Ore lucrate *"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={entry.hoursWorked}
                        onChange={(e) => updateEntry(index, { hoursWorked: e.target.value })}
                        placeholder="Ex. 8"
                      />
                      <Input
                        label="Litri alocați *"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={entry.litersAllocated}
                        onChange={(e) => updateEntry(index, { litersAllocated: e.target.value })}
                        placeholder="Ex. 80"
                      />
                      <Input
                        label={`Consum justificat${suggested ? ` (normat ≈ ${suggested} l)` : ''}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={entry.consumJustificat}
                        onChange={(e) => updateEntry(index, { consumJustificat: e.target.value })}
                        placeholder={suggested ?? 'Auto din normă'}
                      />
                      <Input
                        label="Lucrare efectuată *"
                        value={entry.workDescription}
                        onChange={(e) => updateEntry(index, { workDescription: e.target.value })}
                        placeholder="Ex. Săpături fundație"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Semnături (opțional)</p>
            <p className="mb-3 text-xs text-slate-500">
              Lasă gol pentru a folosi automat <strong className="font-semibold text-slate-700">administratorul firmei</strong>. Completează doar dacă vrei alt nume.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Întocmit de"
                value={form.intocmitNume}
                onChange={(e) => setForm({ ...form, intocmitNume: e.target.value })}
                placeholder="Implicit: administratorul firmei"
              />
              <Input
                label="Aprobat de"
                value={form.aprobatNume}
                onChange={(e) => setForm({ ...form, aprobatNume: e.target.value })}
                placeholder="Implicit: administratorul firmei"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Anulează
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              <FileText size={16} /> Salvează bonul
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Șterge bonul de consum" size="sm">
        <p className="text-sm leading-6 text-slate-600">
          Sigur vrei să ștergi bonul <strong className="text-slate-950">{deleteTarget?.bonNumber ?? ''}</strong>?
          Această acțiune nu poate fi anulată.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Anulează
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            Șterge
          </Button>
        </div>
      </Modal>

      {viewer && (
        <PdfViewer
          path={viewer.path}
          title={viewer.title}
          filename={`${viewer.title.toLowerCase().replace(/\s+/g, '-')}.pdf`}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
