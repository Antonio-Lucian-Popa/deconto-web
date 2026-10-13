'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch, apiDownload } from '@/lib/api-client';
import type { Report, ReportType, Car } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/hooks/use-auth';
import { useUsers, userDisplayName } from '@/hooks/use-users';
import { Download, Send, Plus, FileText, ChevronDown, Trash2, Route, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  TRIP: 'Delegaţie',
  MONTHLY: 'Lunar',
  FOAIE_PARCURS: 'Foaie Parcurs',
  FOAIE_PARCURS_LUNAR: 'Foaie Parcurs Lunară',
};

const REPORT_TYPE_VARIANTS: Record<ReportType, 'default' | 'warning' | 'info' | 'success'> = {
  TRIP: 'default',
  MONTHLY: 'info',
  FOAIE_PARCURS: 'warning',
  FOAIE_PARCURS_LUNAR: 'success',
};

function formatDateTime(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function formatMonth(monthStr: string | null) {
  if (!monthStr) return '—';
  return new Intl.DateTimeFormat('ro-RO', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(monthStr + '-01'));
}

export default function RapoartePage() {
  const t = useTranslations('reports');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [showFoaie, setShowFoaie] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [foaieMonth, setFoaieMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [foaieCarId, setFoaieCarId] = useState('');
  const [foaieUserId, setFoaieUserId] = useState('');
  const [foaieVerificatId, setFoaieVerificatId] = useState('');
  const [showReassign, setShowReassign] = useState(false);
  const [reassignMonth, setReassignMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reassignDriverId, setReassignDriverId] = useState('');
  const [reassignVerificatId, setReassignVerificatId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiFetch<Report[]>('/api/reports'),
  });

  const { data: users } = useUsers();

  const { data: cars } = useQuery({
    queryKey: ['cars'],
    queryFn: () => apiFetch<Car[]>('/api/cars'),
  });

  const usersMap = useMemo(
    () => new Map((users ?? []).map((u) => [u.id, u])),
    [users]
  );
  const canSendToAccounting = user != null && user.role !== 'ACCOUNTANT';

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<Report>('/api/reports/monthly', {
        method: 'POST',
        body: JSON.stringify({
          month,
          ...(selectedUserId ? { userId: selectedUserId } : {}),
        }),
      }),
    onSuccess: () => {
      toast.success('Raport lunar generat cu succes');
      setShowNew(false);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const foaieLunarMutation = useMutation({
    mutationFn: () =>
      apiFetch<Report>('/api/reports/foaie-parcurs-lunar', {
        method: 'POST',
        body: JSON.stringify({
          carId: foaieCarId,
          month: foaieMonth,
          ...(foaieUserId ? { userId: foaieUserId } : {}),
          ...(foaieVerificatId ? { verificatUserId: foaieVerificatId } : {}),
        }),
      }),
    onSuccess: () => {
      toast.success('Foaie de parcurs lunară generată');
      setShowFoaie(false);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reassignMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ total: number; reassigned: number; skipped: number }>(
        '/api/reports/foaie-parcurs-reassign',
        {
          method: 'POST',
          body: JSON.stringify({
            month: reassignMonth,
            driverUserId: reassignDriverId,
            ...(reassignVerificatId ? { verificatUserId: reassignVerificatId } : {}),
          }),
        }
      ),
    onSuccess: (res) => {
      toast.success(
        `${res.reassigned} foi reatribuite` +
          (res.skipped ? `, ${res.skipped} omise (fără mașină/delegație)` : '')
      );
      setShowReassign(false);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleDownload(id: string) {
    setDownloadingId(id);
    try {
      await apiDownload(`/api/reports/${id}/download`, `raport-${id}.pdf`);
    } catch {
      toast.error('Descărcarea a eşuat');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Ștergi acest raport?')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/reports/${id}`, { method: 'DELETE' });
      toast.success('Raport șters');
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ștergere eșuată');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSend(id: string) {
    setSendingId(id);
    try {
      await apiFetch(`/api/reports/${id}/send`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      toast.success('Raport trimis la contabilitate');
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Trimitere eşuată');
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="app-content space-y-6">
        {/* Action bar */}
        <div className="flex justify-end gap-3 flex-wrap">
          <Button variant="secondary" onClick={() => setShowReassign(true)}>
            <Users size={16} /> Reatribuie foi (lună)
          </Button>
          <Button variant="secondary" onClick={() => setShowFoaie(true)}>
            <Route size={16} /> Foaie de parcurs lunară
          </Button>
          <Button onClick={() => setShowNew(true)}>
            <Plus size={16} /> {t('newMonthly')}
          </Button>
        </div>

        {/* New monthly report modal */}
        <Modal
          open={showNew}
          onClose={() => setShowNew(false)}
          title={t('newMonthly')}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('selectMonth')}
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="app-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('selectEmployee')}
              </label>
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="app-select w-full"
                >
                  <option value="">{t('allEmployees')}</option>
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
            <div className="pt-2 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowNew(false)}>
                Anulează
              </Button>
              <Button
                onClick={() => generateMutation.mutate()}
                isLoading={generateMutation.isPending}
              >
                <FileText size={16} /> Generează
              </Button>
            </div>
          </div>
        </Modal>

        {/* Monthly route sheet (foaie de parcurs lunară) modal */}
        <Modal
          open={showFoaie}
          onClose={() => setShowFoaie(false)}
          title="Foaie de parcurs lunară"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Document legal per vehicul, cu toate deplasările din luna selectată,
              kilometraj de bord continuu și consum normat — conform Codului fiscal.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Vehicul
              </label>
              <div className="relative">
                <select
                  value={foaieCarId}
                  onChange={(e) => setFoaieCarId(e.target.value)}
                  className="app-select w-full"
                >
                  <option value="">Selectează vehiculul…</option>
                  {cars?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.plateNumber} — {c.make} {c.model}
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
                {t('selectMonth')}
              </label>
              <input
                type="month"
                value={foaieMonth}
                onChange={(e) => setFoaieMonth(e.target.value)}
                className="app-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Șofer (opțional)
              </label>
              <div className="relative">
                <select
                  value={foaieUserId}
                  onChange={(e) => setFoaieUserId(e.target.value)}
                  className="app-select w-full"
                >
                  <option value="">Toți șoferii mașinii</option>
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
            <div className="pt-2 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowFoaie(false)}>
                Anulează
              </Button>
              <Button
                onClick={() => foaieLunarMutation.mutate()}
                isLoading={foaieLunarMutation.isPending}
                disabled={!foaieCarId}
              >
                <Route size={16} /> Generează
              </Button>
            </div>
          </div>
        </Modal>

        {/* Bulk reassign driver on a month's foi de parcurs */}
        <Modal
          open={showReassign}
          onClose={() => setShowReassign(false)}
          title="Reatribuie foi de parcurs"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Schimbă <span className="font-medium text-slate-950">Conducătorul auto / Întocmit</span> pe
              toate foile de parcurs (per delegație) <span className="font-medium text-slate-950">generate</span> în
              luna aleasă. Fiecare foaie este re-generată și înlocuită.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Luna generării
              </label>
              <input
                type="month"
                value={reassignMonth}
                onChange={(e) => setReassignMonth(e.target.value)}
                className="app-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Conducător auto / Întocmit de
              </label>
              <div className="relative">
                <select
                  value={reassignDriverId}
                  onChange={(e) => setReassignDriverId(e.target.value)}
                  className="app-select w-full"
                >
                  <option value="">Selectează angajatul…</option>
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
                  value={reassignVerificatId}
                  onChange={(e) => setReassignVerificatId(e.target.value)}
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
            <div className="pt-2 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowReassign(false)}>
                Anulează
              </Button>
              <Button
                onClick={() => reassignMutation.mutate()}
                isLoading={reassignMutation.isPending}
                disabled={!reassignDriverId}
              >
                <Users size={16} /> Reatribuie
              </Button>
            </div>
          </div>
        </Modal>

        {/* Reports table */}
        <div className="app-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  {[
                    t('type'),
                    t('period'),
                    'Generat de',
                    t('sentTo'),
                    t('date'),
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : reports?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-16 text-sm">
                      Nu există rapoarte generate
                    </td>
                  </tr>
                ) : (
                  reports?.map((r) => {
                    const generator = usersMap.get(r.userId);
                    return (
                      <tr
                        key={r.id}
                        className="transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Badge variant={REPORT_TYPE_VARIANTS[r.type] ?? 'default'}>
                            {REPORT_TYPE_LABELS[r.type] ?? r.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-sm">
                          {r.month
                            ? formatMonth(r.month)
                            : r.tripId
                            ? `Decont ${r.tripId.slice(0, 8)}...`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-sm">
                          {generator ? userDisplayName(generator) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {r.sentTo ? (
                            <div>
                              <p className="text-gray-300 text-sm">{r.sentTo}</p>
                              {r.sentAt && (
                                <p className="text-gray-500 text-xs">
                                  {formatDateTime(r.sentAt)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-600 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                          {formatDateTime(r.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleDownload(r.id)}
                              disabled={downloadingId === r.id}
                              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-xs disabled:opacity-40"
                              title="Descarcă PDF"
                            >
                              <Download size={15} />
                              {downloadingId === r.id ? 'Se descarcă...' : 'PDF'}
                            </button>
                            {canSendToAccounting && (
                              <button
                                onClick={() => handleSend(r.id)}
                                disabled={sendingId === r.id}
                                className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-xs disabled:opacity-40"
                                title="Trimite la contabilitate"
                              >
                                <Send size={15} />
                                {sendingId === r.id ? 'Se trimite...' : 'Trimite'}
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(r.id)}
                              disabled={deletingId === r.id}
                              className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-xs disabled:opacity-40"
                              title="Șterge raport"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
