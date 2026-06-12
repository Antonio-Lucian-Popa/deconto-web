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
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, FileText, Download, Send, Image as ImageIcon } from 'lucide-react';
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
  COMBUSTIBIL: 'text-amber-400',
  MASA: 'text-emerald-400',
  CAZARE: 'text-blue-400',
  TRANSPORT: 'text-purple-400',
  DIURNA: 'text-pink-400',
  ALTELE: 'text-gray-400',
};

const canApprove: UserRole[] = ['ADMIN', 'MANAGER'];

export default function TripDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<Report | null>(null);
  const [sendingReport, setSendingReport] = useState(false);

  const { data: trip, isLoading } = useQuery({
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
        <div className="p-6 space-y-4">
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

  if (!trip) return null;

  const byCategory: Record<string, number> = {};
  for (const e of trip.expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }
  const totalExpenses = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const overBudget = trip.budget != null && totalExpenses > trip.budget;
  const tripUser = usersMap.get(trip.userId);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Detaliu decont" />
      <div className="flex-1 p-6 space-y-6">
        {/* Breadcrumb + title */}
        <div className="flex items-center gap-3">
          <Link href="/deconturi" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h2 className="text-xl font-bold text-white">{trip.destination}</h2>
          <Badge variant={STATUS_VARIANTS[trip.status] ?? 'gray'}>
            {STATUS_LABELS[trip.status] ?? trip.status}
          </Badge>
          {overBudget && <Badge variant="danger">Buget depășit</Badge>}
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Angajat', value: tripUser ? userDisplayName(tripUser) : '—' },
            {
              label: 'Perioadă',
              value: `${formatDate(trip.startDate)}${trip.endDate ? ` — ${formatDate(trip.endDate)}` : ''}`,
            },
            {
              label: 'Kilometri',
              value:
                trip.kmStart != null
                  ? `${trip.kmStart} → ${trip.kmEnd ?? '?'} km`
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
              className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4"
            >
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className="text-white font-medium text-sm">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Totals by category */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Totaluri pe categorii</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
              const total = byCategory[cat] ?? 0;
              if (total === 0) return null;
              return (
                <div
                  key={cat}
                  className="flex flex-col gap-1 p-3 bg-white/5 rounded-lg"
                >
                  <span className={`text-xs font-medium ${CATEGORY_COLORS[cat]}`}>{label}</span>
                  <span className="text-white font-bold text-sm">{formatRON(total)}</span>
                </div>
              );
            })}
            <div className="flex flex-col gap-1 p-3 bg-blue-600/20 border border-blue-600/30 rounded-lg">
              <span className="text-xs font-medium text-blue-400">Total</span>
              <span className="text-white font-bold text-sm">{formatRON(totalExpenses)}</span>
            </div>
          </div>
        </div>

        {/* Expenses table with receipt thumbnails */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-semibold">
              Cheltuieli ({trip.expenses.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Data', 'Categorie', 'Comerciant', 'Note', 'Sumă', 'Bon'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-medium text-gray-400 px-4 py-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trip.expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-12 text-sm">
                      Nicio cheltuială înregistrată
                    </td>
                  </tr>
                ) : (
                  trip.expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
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
                        <p className="text-white text-sm">{expense.merchant ?? '—'}</p>
                        {expense.merchantCif && (
                          <p className="text-gray-500 text-xs">CIF: {expense.merchantCif}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm max-w-48">
                        <p className="truncate">{expense.notes ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-white text-sm font-medium">
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
                              className="w-12 h-12 object-cover rounded-lg border border-white/10 group-hover:border-blue-500 transition-colors"
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
              <Button
                variant="secondary"
                onClick={() => handleSendReport(generatedReport.id)}
                isLoading={sendingReport}
              >
                <Send size={16} /> Trimite la contabilitate
              </Button>
            </>
          )}
        </div>
      </div>

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
            className="w-full px-3 py-2 bg-[#262626] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
