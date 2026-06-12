'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { TripDetail, UserRole } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Check, X } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

function formatRON(amount: number) {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activ', CLOSED: 'Închis', SUBMITTED: 'Trimis', APPROVED: 'Aprobat', REJECTED: 'Respins',
};
const STATUS_VARIANTS: Record<string, 'success' | 'gray' | 'warning' | 'default' | 'danger'> = {
  ACTIVE: 'success', CLOSED: 'gray', SUBMITTED: 'warning', APPROVED: 'default', REJECTED: 'danger',
};
const CATEGORY_LABELS: Record<string, string> = {
  COMBUSTIBIL: 'Combustibil', MASA: 'Masă', CAZARE: 'Cazare',
  TRANSPORT: 'Transport', DIURNA: 'Diurnă', ALTELE: 'Altele',
};

const canApprove: UserRole[] = ['ADMIN', 'MANAGER'];

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => apiFetch<TripDetail>(`/api/trips/${id}`),
  });

  const approveMutation = useMutation({
    mutationFn: () => apiFetch(`/api/trips/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Decont aprobat');
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      apiFetch(`/api/trips/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
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
    mutationFn: () => apiFetch(`/api/reports/trip/${id}`, { method: 'POST' }),
    onSuccess: () => toast.success('Raport generat cu succes'),
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <Header title="Detaliu decont" />
        <div className="p-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!trip) return null;

  const byCategory: Record<string, number> = {};
  for (const e of trip.expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Detaliu decont" />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/deconturi" className="text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <h2 className="text-xl font-bold text-white">{trip.destination}</h2>
          <Badge variant={STATUS_VARIANTS[trip.status] ?? 'gray'}>
            {STATUS_LABELS[trip.status] ?? trip.status}
          </Badge>
        </div>

        {/* Trip info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Data start', value: formatDate(trip.startDate) },
            { label: 'Data final', value: trip.endDate ? formatDate(trip.endDate) : '—' },
            { label: 'Km start', value: trip.kmStart ?? '—' },
            { label: 'Km final', value: trip.kmEnd ?? '—' },
          ].map((item) => (
            <div key={item.label} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className="text-white font-medium">{String(item.value)}</p>
            </div>
          ))}
        </div>

        {/* Totals by category */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Totaluri pe categorii</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(byCategory).map(([cat, total]) => (
              <div key={cat} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300 text-sm">{CATEGORY_LABELS[cat] ?? cat}</span>
                <span className="text-white font-medium text-sm">{formatRON(total)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 bg-blue-600/20 rounded-lg">
              <span className="text-blue-400 text-sm font-medium">Total</span>
              <span className="text-white font-bold text-sm">
                {formatRON(trip.expenses.reduce((s, e) => s + e.amount, 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Expenses list */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h3 className="text-white font-semibold">Cheltuieli ({trip.expenses.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Data</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Categorie</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Comerciant</th>
                  <th className="text-right text-xs font-medium text-gray-400 px-4 py-3">Sumă</th>
                  <th className="text-center text-xs font-medium text-gray-400 px-4 py-3">Bon</th>
                </tr>
              </thead>
              <tbody>
                {trip.expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-300 text-sm">{formatDate(expense.date)}</td>
                    <td className="px-4 py-3">
                      <span className="text-white text-sm">{CATEGORY_LABELS[expense.category] ?? expense.category}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{expense.merchant ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-white text-sm font-medium">{formatRON(expense.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      {expense.imageUrl ? (
                        <a
                          href={expense.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          Vezi bon
                        </a>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {trip.status === 'SUBMITTED' && user?.role && canApprove.includes(user.role) && (
            <>
              <Button
                onClick={() => approveMutation.mutate()}
                isLoading={approveMutation.isPending}
              >
                <Check size={16} /> Aprobă
              </Button>
              <Button
                variant="danger"
                onClick={() => setRejectModal(true)}
              >
                <X size={16} /> Respinge
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            onClick={() => reportMutation.mutate()}
            isLoading={reportMutation.isPending}
          >
            Generează raport PDF
          </Button>
        </div>
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold mb-4">Respinge decont</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Introdu motivul respingerii..."
              rows={4}
              className="w-full px-3 py-2 bg-[#262626] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="secondary" onClick={() => setRejectModal(false)}>Anulează</Button>
              <Button
                variant="danger"
                disabled={!rejectReason.trim()}
                isLoading={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate(rejectReason)}
              >
                Respinge
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
