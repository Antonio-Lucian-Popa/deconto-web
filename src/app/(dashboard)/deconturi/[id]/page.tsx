'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiDownload } from '@/lib/api-client';
import type { TripDetail, Report, UserRole } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Lightbox } from '@/components/ui/lightbox';
import { useAuth } from '@/hooks/use-auth';
import { useUsers, userDisplayName } from '@/hooks/use-users';
import { use, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, FileText, Download, Send, Image as ImageIcon, ChevronDown, RefreshCw } from 'lucide-react';
import Link from 'next/link';

function formatRON(amount: number) {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function expenseDetails(expense: TripDetail['expenses'][number]) {
  if (expense.category === 'COMBUSTIBIL' && expense.fuelLiters != null && expense.fuelPricePerLiter != null) {
    return `${expense.fuelLiters} L x ${formatRON(expense.fuelPricePerLiter)}/L`;
  }
  if (expense.category === 'CAZARE') {
    const parts = [
      expense.accommodationCheckIn ? `Check-in ${formatDate(expense.accommodationCheckIn)}` : null,
      expense.accommodationCheckOut ? `Check-out ${formatDate(expense.accommodationCheckOut)}` : null,
      expense.accommodationNights != null ? `${expense.accommodationNights} nopți` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  }
  return null;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activ',
  CLOSED: 'Închis',
  SUBMITTED: 'Trimis',
  APPROVED: 'Aprobat',
  REJECTED: 'Respins',
};
const STATUS_VARIANTS: Record<string, 'success' | 'gray' | 'warning' | 'default' | 'danger'> = {
  ACTIVE: 'success',
  CLOSED: 'gray',
  SUBMITTED: 'warning',
  APPROVED: 'default',
  REJECTED: 'danger',
};
const CATEGORY_LABELS: Record<string, string> = {
  COMBUSTIBIL: 'Combustibil',
  MASA: 'Masă',
  CAZARE: 'Cazare',
  TRANSPORT: 'Transport',
  DIURNA: 'Diurnă',
  ALTELE: 'Altele',
};
const CATEGORY_COLORS: Record<string, string> = {
  COMBUSTIBIL: 'text-amber-600',
  MASA: 'text-emerald-600',
  CAZARE: 'text-blue-600',
  TRANSPORT: 'text-violet-600',
  DIURNA: 'text-pink-600',
  ALTELE: 'text-slate-600',
};

const canApprove: UserRole[] = ['ADMIN', 'MANAGER'];

export default function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<Report | null>(null);
  const [generatedFoaieParcurs, setGeneratedFoaieParcurs] = useState<Report | null>(null);
  const [sendingReport, setSendingReport] = useState(false);
  const [foaieModal, setFoaieModal] = useState(false);
  const [foaieDriverId, setFoaieDriverId] = useState('');
  const [foaieVerificatId, setFoaieVerificatId] = useState('');

  const { data: trip, isLoading, isError, refetch } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => apiFetch<TripDetail>(`/api/trips/${id}`),
  });

  const { data: users } = useUsers();
  const usersMap = new Map((users ?? []).map((u) => [u.id, u]));

  const approveMutation = useMutation({
    mutationFn: () => apiFetch(`/api/trips/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Decont aprobat cu succes');
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      apiFetch(`/api/trips/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      toast.success('Decont respins');
      setRejectModal(false);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reportMutation = useMutation({
    mutationFn: () => apiFetch<Report>(`/api/reports/trip/${id}`, { method: 'POST' }),
    onSuccess: (report) => {
      toast.success('Raport PDF generat');
      setGeneratedReport(report);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const foaieParcursMutation = useMutation({
    mutationFn: () =>
      apiFetch<Report>(`/api/reports/foaie-parcurs/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          ...(foaieDriverId ? { driverUserId: foaieDriverId } : {}),
          ...(foaieVerificatId ? { verificatUserId: foaieVerificatId } : {}),
          ...(generatedFoaieParcurs ? { replaceReportId: generatedFoaieParcurs.id } : {}),
        }),
      }),
    onSuccess: (report) => {
      toast.success(
        generatedFoaieParcurs ? 'Foaie de parcurs re-generată' : 'Foaie de parcurs generată'
      );
      setGeneratedFoaieParcurs(report);
      setFoaieModal(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openFoaieModal() {
    // Default the driver / "Întocmit" to the employee who logged the delegation.
    setFoaieDriverId(trip?.userId ?? '');
    setFoaieVerificatId('');
    setFoaieModal(true);
  }

  async function handleDownloadReport(reportId: string) {
    try {
      await apiDownload(`/api/reports/${reportId}/download`, `raport-delegatie-${id}.pdf`);
    } catch {
      toast.error('Descărcarea a eșuat');
    }
  }

  async function handleSendReport(reportId: string) {
    setSendingReport(true);
    try {
      await apiFetch(`/api/reports/${reportId}/send`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      toast.success('Raport trimis la contabilitate');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Trimitere eșuată');
    } finally {
      setSendingReport(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <Header title="Detaliu decont" />
        <div className="app-content space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <div className="flex h-full flex-col overflow-auto">
        <Header title="Detaliu decont" />
        <div className="app-content">
          <div className="app-panel mx-auto max-w-xl p-6 text-center">
            <h2 className="text-lg font-semibold text-slate-950">Decontul nu a putut fi încărcat</h2>
            <p className="mt-2 text-sm text-slate-600">
              Verifică dacă decontul mai există și încearcă din nou.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button variant="secondary" onClick={() => void refetch()}>
                <RefreshCw size={15} /> Reîncearcă
              </Button>
              <Link href="/deconturi">
                <Button>Înapoi la deconturi</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const byCategory: Record<string, number> = {};
  for (const e of trip.expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }
  const totalExpenses = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const overBudget = trip.budget != null && totalExpenses > trip.budget;
  const tripUser = usersMap.get(trip.userId);
  const canSendToAccounting = user != null && user.role !== 'ACCOUNTANT';

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Detaliu decont" />
      <div className="app-content space-y-6">
        {/* Breadcrumb + title */}
        <div className="flex items-center gap-3">
          <Link href="/deconturi" className="text-slate-500 hover:text-slate-950 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h2 className="text-xl font-bold text-slate-950">{trip.destination}</h2>
          <Badge variant={STATUS_VARIANTS[trip.status] ?? 'gray'}>
            {STATUS_LABELS[trip.status] ?? trip.status}
          </Badge>
          {overBudget && <Badge variant="danger">Buget depășit</Badge>}
        </div>

        {trip.rejectionReason && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Motivul respingerii</p>
            <p className="mt-1 text-sm text-red-800">{trip.rejectionReason}</p>
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Nr. document', value: trip.tripNumber ?? '—' },
            { label: 'Angajat', value: tripUser ? userDisplayName(tripUser) : '—' },
            { label: 'Plecare din', value: trip.departureLocation },
            { label: 'Destinație', value: trip.destination },
            {
              label: 'Perioadă',
              value: `${formatDate(trip.startDate)}${trip.endDate ? ` — ${formatDate(trip.endDate)}` : ''}`,
            },
            {
              label: 'Ore plecare/sosire',
              value: trip.departureTime || trip.arrivalTime
                ? `${trip.departureTime ?? '—'} → ${trip.arrivalTime ?? '—'}`
                : '—',
            },
            {
              label: 'Kilometri',
              value:
                trip.kmStart != null
                  ? `${trip.kmStart} → ${trip.kmEnd ?? '?'} km`
                  : '—',
            },
            {
              label: 'Km urban / extraurban',
              value:
                trip.kmUrban != null || trip.kmExtraUrban != null
                  ? `${trip.kmUrban ?? 0} / ${trip.kmExtraUrban ?? 0} km`
                  : '—',
            },
            {
              label: 'Combustibil plecare/sosire',
              value:
                trip.fuelAtDeparture != null || trip.fuelAtArrival != null
                  ? `${trip.fuelAtDeparture ?? '—'} L → ${trip.fuelAtArrival ?? '—'} L`
                  : '—',
            },
            {
              label: 'Buget / Total',
              value:
                trip.budget != null
                  ? `${formatRON(trip.budget)} / ${formatRON(totalExpenses)}`
                  : formatRON(totalExpenses),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="app-card p-4"
            >
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className="text-slate-950 font-medium text-sm">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Totals by category */}
        <div className="app-panel p-5">
          <h3 className="text-slate-950 font-semibold mb-4">Totaluri pe categorii</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
              const total = byCategory[cat] ?? 0;
              if (total === 0) return null;
              return (
                <div
                  key={cat}
                  className="flex flex-col gap-1 p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <span className={`text-xs font-medium ${CATEGORY_COLORS[cat]}`}>{label}</span>
                  <span className="text-slate-950 font-bold text-sm">{formatRON(total)}</span>
                </div>
              );
            })}
            <div className="flex flex-col gap-1 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <span className="text-xs font-medium text-blue-700">Total</span>
              <span className="text-slate-950 font-bold text-sm">{formatRON(totalExpenses)}</span>
            </div>
          </div>
        </div>

        {/* Expenses table with receipt thumbnails */}
        <div className="app-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-slate-950 font-semibold">
              Cheltuieli ({trip.expenses.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  {['Data', 'Categorie', 'Comerciant', 'Detalii', 'Note', 'Sumă', 'Bon'].map((h) => (
                    <th key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trip.expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-500 py-12 text-sm">
                      Nicio cheltuială înregistrată
                    </td>
                  </tr>
                ) : (
                  trip.expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-medium ${
                            CATEGORY_COLORS[expense.category] ?? 'text-gray-400'
                          }`}
                        >
                          {CATEGORY_LABELS[expense.category] ?? expense.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-950 text-sm">{expense.merchant ?? '—'}</p>
                        {expense.merchantCif && (
                          <p className="text-gray-500 text-xs">CIF: {expense.merchantCif}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm max-w-56">
                        <p>{expenseDetails(expense) ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm max-w-48">
                        <p className="truncate">{expense.notes ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-slate-950 text-sm font-medium">
                          {formatRON(expense.amount)}
                        </span>
                        {expense.currency !== 'RON' && (
                          <span className="text-gray-500 text-xs ml-1">{expense.currency}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {expense.imageUrl ? (
                          <button
                            onClick={() => setLightboxSrc(expense.imageUrl!)}
                            className="group relative flex-shrink-0"
                            title="Click pentru a mări"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={expense.imageUrl}
                              alt="Bon"
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200 group-hover:border-blue-500 transition-colors"
                            />
                            <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ImageIcon size={14} className="text-white" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pb-4">
          {/* Approve / Reject — only MANAGER/ADMIN, only when SUBMITTED */}
          {trip.status === 'SUBMITTED' && user?.role && canApprove.includes(user.role) && (
            <>
              <Button
                onClick={() => approveMutation.mutate()}
                isLoading={approveMutation.isPending}
              >
                <Check size={16} /> Aprobă decont
              </Button>
              <Button
                variant="danger"
                onClick={() => setRejectModal(true)}
                disabled={rejectMutation.isPending}
              >
                <X size={16} /> Respinge
              </Button>
            </>
          )}

          {/* PDF Report */}
          {!generatedReport ? (
            <Button
              variant="secondary"
              onClick={() => reportMutation.mutate()}
              isLoading={reportMutation.isPending}
            >
              <FileText size={16} /> Generează raport PDF
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => handleDownloadReport(generatedReport.id)}
              >
                <Download size={16} /> Descarcă PDF
              </Button>
              {canSendToAccounting && (
                <Button
                  variant="secondary"
                  onClick={() => handleSendReport(generatedReport.id)}
                  isLoading={sendingReport}
                >
                  <Send size={16} /> Trimite la contabilitate
                </Button>
              )}
            </>
          )}

          {/* Foaie de Parcurs — only when car is assigned */}
          {trip.carId && (
            !generatedFoaieParcurs ? (
              <Button
                variant="secondary"
                onClick={openFoaieModal}
              >
                <FileText size={16} /> Foaie de Parcurs
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => handleDownloadReport(generatedFoaieParcurs.id)}
                >
                  <Download size={16} /> Descarcă Foaie Parcurs
                </Button>
                <Button variant="secondary" onClick={openFoaieModal}>
                  <RefreshCw size={16} /> Re-generează
                </Button>
                {canSendToAccounting && (
                  <Button
                    variant="secondary"
                    onClick={() => handleSendReport(generatedFoaieParcurs.id)}
                    isLoading={sendingReport}
                  >
                    <Send size={16} /> Trimite Foaie Parcurs
                  </Button>
                )}
              </>
            )
          )}
        </div>
      </div>

      {/* Foaie de parcurs — choose attributed employees before generating */}
      <Modal
        open={foaieModal}
        onClose={() => setFoaieModal(false)}
        title={generatedFoaieParcurs ? 'Re-generează foaia de parcurs' : 'Generează foaie de parcurs'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Alege angajatul care apare pe foaie ca{' '}
            <span className="font-medium text-slate-950">Conducător auto / Întocmit</span>.
            Implicit este angajatul delegației, dar poți atribui pe altcineva.
            {generatedFoaieParcurs && ' Foaia existentă va fi înlocuită.'}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Conducător auto / Întocmit de
            </label>
            <div className="relative">
              <select
                value={foaieDriverId}
                onChange={(e) => setFoaieDriverId(e.target.value)}
                className="app-select w-full"
              >
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {userDisplayName(u)}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Verificat de (opțional)
            </label>
            <div className="relative">
              <select
                value={foaieVerificatId}
                onChange={(e) => setFoaieVerificatId(e.target.value)}
                className="app-select w-full"
              >
                <option value="">Implicit (administrator)</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {userDisplayName(u)}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setFoaieModal(false)}>
              Anulează
            </Button>
            <Button
              onClick={() => foaieParcursMutation.mutate()}
              isLoading={foaieParcursMutation.isPending}
            >
              {generatedFoaieParcurs ? (
                <><RefreshCw size={16} /> Re-generează</>
              ) : (
                <><FileText size={16} /> Generează</>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        title="Respinge decont"
      >
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Introdu motivul respingerii. Acesta va fi vizibil angajatului.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex: Lipsesc bonurile pentru cazare..."
            rows={4}
            className="app-input w-full resize-none"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRejectModal(false)}>
              Anulează
            </Button>
            <Button
              variant="danger"
              disabled={!rejectReason.trim()}
              isLoading={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate(rejectReason)}
            >
              Respinge decont
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox for receipt images */}
      {lightboxSrc && (
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
