'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch, apiDownload } from '@/lib/api-client';
import type { Report, ReportListResponse, ReportType, Car } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { PdfViewer } from '@/components/ui/pdf-viewer';
import { useAuth } from '@/hooks/use-auth';
import { useUsers, userDisplayName } from '@/hooks/use-users';
import { Download, Send, Plus, FileText, ChevronDown, Trash2, Route, Users, AlertCircle, ChevronLeft, ChevronRight, Eye, CalendarRange, Sparkles, Info, FolderArchive } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  TRIP: 'Delegaţie',
  MONTHLY: 'Lunar',
  FOAIE_PARCURS: 'Foaie Parcurs',
  FOAIE_PARCURS_LUNAR: 'Foaie Parcurs Lunară',
  BON_CONSUM_COMBUSTIBIL: 'Bon consum combustibil',
};

const REPORT_TYPE_VARIANTS: Record<ReportType, 'default' | 'warning' | 'info' | 'success'> = {
  TRIP: 'default',
  MONTHLY: 'info',
  FOAIE_PARCURS: 'warning',
  FOAIE_PARCURS_LUNAR: 'success',
  BON_CONSUM_COMBUSTIBIL: 'info',
};

const REPORTS_PER_PAGE = 20;

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
  const [page, setPage] = useState(1);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterType, setFilterType] = useState<'' | ReportType>('');
  const [viewing, setViewing] = useState<Report | null>(null);
  const [showGenMonth, setShowGenMonth] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [genMonth, setGenMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [genTypes, setGenTypes] = useState<Record<'MONTHLY' | 'FOAIE_PARCURS_LUNAR' | 'BON_CONSUM_COMBUSTIBIL', boolean>>({
    MONTHLY: true,
    FOAIE_PARCURS_LUNAR: true,
    BON_CONSUM_COMBUSTIBIL: true,
  });

  const reportsQuery = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(REPORTS_PER_PAGE),
    });
    if (filterMonth) params.set('month', filterMonth);
    if (filterType) params.set('type', filterType);
    return params.toString();
  }, [page, filterMonth, filterType]);

  const { data: reportPage, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', reportsQuery],
    queryFn: () => apiFetch<ReportListResponse>(`/api/reports?${reportsQuery}`),
  });
  const reports = reportPage?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((reportPage?.total ?? 0) / REPORTS_PER_PAGE));

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

  const genMonthMutation = useMutation({
    mutationFn: () => {
      const types = (Object.keys(genTypes) as Array<keyof typeof genTypes>).filter((k) => genTypes[k]);
      return apiFetch<{
        monthly: 'generated' | 'exists' | 'no-data' | 'skipped';
        foiParcurs: { generated: number; skippedExisting: number; carsWithoutTrips: number };
        bonConsum: { generated: number; skippedExisting: number };
      }>('/api/reports/generate-month', {
        method: 'POST',
        body: JSON.stringify({ month: genMonth, types }),
      });
    },
    onSuccess: (res) => {
      const parts: string[] = [];
      if (res.monthly === 'generated') parts.push('1 raport lunar');
      if (res.foiParcurs.generated > 0) parts.push(`${res.foiParcurs.generated} foi de parcurs`);
      if (res.bonConsum.generated > 0) parts.push(`${res.bonConsum.generated} bonuri consum`);
      const total = (res.monthly === 'generated' ? 1 : 0) + res.foiParcurs.generated + res.bonConsum.generated;
      if (total === 0) {
        toast.info('Nimic nou de generat pentru luna selectată (deja există sau nu sunt date).');
      } else {
        toast.success(`Generat: ${parts.join(', ')}.`);
      }
      setShowGenMonth(false);
      // Focus the list on the generated month so the ZIP download is one click away.
      setFilterMonth(genMonth);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleDownloadZip() {
    const params = new URLSearchParams();
    if (filterMonth) params.set('month', filterMonth);
    if (filterType) params.set('type', filterType);
    setDownloadingZip(true);
    try {
      await apiDownload(
        `/api/reports/download-zip?${params.toString()}`,
        `rapoarte-${filterMonth || 'toate'}.zip`
      );
    } catch {
      toast.error('Descărcarea ZIP a eșuat');
    } finally {
      setDownloadingZip(false);
    }
  }

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
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="mr-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            title="Ce face fiecare buton?"
            aria-label="Ajutor"
          >
            <Info size={18} />
          </button>
          <Button variant="secondary" onClick={() => setShowReassign(true)}>
            <Users size={16} /> Reatribuie foi (lună)
          </Button>
          <Button variant="secondary" onClick={() => setShowFoaie(true)}>
            <Route size={16} /> Foaie de parcurs lunară
          </Button>
          <Button variant="secondary" onClick={() => setShowNew(true)}>
            <Plus size={16} /> {t('newMonthly')}
          </Button>
          <Button onClick={() => setShowGenMonth(true)}>
            <CalendarRange size={16} /> Generează luna
          </Button>
        </div>

        {/* Filters — help the accountant pull everything from a given month/type */}
        <div className="app-filter-bar">
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
                setPage(1);
              }}
            />
          </div>
          <div className="w-full sm:w-60">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Tip document
            </label>
            <select
              className="app-select w-full"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as '' | ReportType);
                setPage(1);
              }}
            >
              <option value="">Toate tipurile</option>
              {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((key) => (
                <option key={key} value={key}>
                  {REPORT_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          {(filterMonth || filterType) && (
            <button
              type="button"
              onClick={() => {
                setFilterMonth('');
                setFilterType('');
                setPage(1);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Resetează filtrele
            </button>
          )}
          <div className="flex items-center gap-3 sm:ml-auto">
            <span className="text-sm text-slate-500">
              <strong className="text-slate-900">{reportPage?.total ?? 0}</strong> documente
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadZip}
              isLoading={downloadingZip}
              disabled={(!filterMonth && !filterType) || (reportPage?.total ?? 0) === 0}
              title={
                !filterMonth && !filterType
                  ? 'Alege o lună sau un tip pentru a descărca ZIP'
                  : 'Descarcă toate documentele din selecție ca ZIP'
              }
            >
              <FolderArchive size={15} /> Descarcă ZIP
            </Button>
          </div>
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
              Schimbă <span className="font-medium text-slate-950">Conducătorul auto / Întocmit</span> (și opțional
              Verificat) pe <span className="font-medium text-slate-950">toate foile de parcurs din luna aleasă</span> —
              atât cele lunare (per mașină), cât și cele per delegație. Fiecare foaie este re-generată și înlocuită.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Luna
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

        {/* Help: what each button does */}
        <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Ghid rapid — Rapoarte" size="lg">
          <div className="space-y-5 text-sm">
            <p className="leading-6 text-slate-500">
              Pe această pagină generezi, vizualizezi și trimiți documentele companiei. Iată ce face fiecare acțiune:
            </p>
            <div className="space-y-3">
              {[
                { icon: <CalendarRange size={16} />, title: 'Generează luna', body: 'Creează dintr-un singur clic toate documentele unei luni (raport de cheltuieli, foi de parcurs per mașină și bonuri de consum). Sare peste cele deja generate, deci o poți rula din nou fără duplicate.' },
                { icon: <FolderArchive size={16} />, title: 'Descarcă ZIP', body: 'Descarcă într-o singură arhivă toate documentele din selecția curentă (după lună și/sau tip). Întâi alege luna/tipul din filtre, apoi apasă butonul.' },
                { icon: <Plus size={16} />, title: 'Raport lunar nou', body: 'Generează un raport de cheltuieli pentru o lună — pentru toți angajații sau doar pentru unul ales.' },
                { icon: <Route size={16} />, title: 'Foaie de parcurs lunară', body: 'Generează foaia de parcurs legală pentru o mașină, pe luna aleasă, cu kilometraj și consum normat.' },
                { icon: <Users size={16} />, title: 'Reatribuie foi (lună)', body: 'Schimbă conducătorul auto / „Întocmit" pe toate foile de parcurs generate într-o lună și le regenerează.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    {item.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 leading-6 text-slate-500">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="font-semibold text-slate-900">Pe fiecare rând din tabel</p>
              <ul className="mt-2 space-y-1.5 text-slate-600">
                <li className="flex items-center gap-2"><Eye size={15} className="text-slate-400" /> <strong className="font-semibold text-slate-700">Vezi</strong> — deschide documentul în pagină (fără descărcare).</li>
                <li className="flex items-center gap-2"><Download size={15} className="text-slate-400" /> <strong className="font-semibold text-slate-700">PDF</strong> — descarcă documentul.</li>
                <li className="flex items-center gap-2"><Send size={15} className="text-slate-400" /> <strong className="font-semibold text-slate-700">Trimite</strong> — trimite documentul la contabilitate pe email.</li>
                <li className="flex items-center gap-2"><Trash2 size={15} className="text-slate-400" /> <strong className="font-semibold text-slate-700">Șterge</strong> — elimină documentul.</li>
              </ul>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowHelp(false)}>Am înțeles</Button>
            </div>
          </div>
        </Modal>

        {/* One-click: generate a whole month's documents */}
        <Modal
          open={showGenMonth}
          onClose={() => setShowGenMonth(false)}
          title="Generează raportele lunii"
          size="sm"
        >
          <div className="space-y-5">
            <p className="text-sm leading-6 text-slate-500">
              Creează dintr-un singur clic toate documentele lunii alese. Se sar cele
              deja generate, așa că o poți rula din nou fără duplicate.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Luna</label>
              <input
                type="month"
                value={genMonth}
                onChange={(e) => setGenMonth(e.target.value)}
                className="app-input w-full"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Ce se generează</p>
              {([
                { key: 'MONTHLY', label: 'Raport cheltuieli lunar', desc: 'Toate cheltuielile companiei pe lună' },
                { key: 'FOAIE_PARCURS_LUNAR', label: 'Foi de parcurs lunare', desc: 'Câte una per mașină cu deplasări' },
                { key: 'BON_CONSUM_COMBUSTIBIL', label: 'Bonuri consum combustibil', desc: 'PDF pentru fiecare bon al lunii' },
              ] as const).map((item) => (
                <label
                  key={item.key}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={genTypes[item.key]}
                    onChange={(e) => setGenTypes((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 accent-blue-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">{item.label}</span>
                    <span className="block text-xs text-slate-500">{item.desc}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setShowGenMonth(false)}>
                Anulează
              </Button>
              <Button
                onClick={() => genMonthMutation.mutate()}
                isLoading={genMonthMutation.isPending}
                disabled={!Object.values(genTypes).some(Boolean)}
              >
                <Sparkles size={16} /> Generează
              </Button>
            </div>
          </div>
        </Modal>

        {isError && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
            <div className="flex min-w-0 items-center gap-3">
              <AlertCircle className="shrink-0" size={19} />
              <p className="text-sm font-medium">Lista rapoartelor nu a putut fi încărcată.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Reîncearcă
            </Button>
          </div>
        )}

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
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-16 text-sm">
                      Nu există rapoarte generate
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => {
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewing(r)}
                              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
                              title="Vizualizează documentul"
                            >
                              <Eye size={15} />
                              Vezi
                            </button>
                            <button
                              onClick={() => handleDownload(r.id)}
                              disabled={downloadingId === r.id}
                              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
                              title="Descarcă PDF"
                            >
                              <Download size={15} />
                              {downloadingId === r.id ? 'Se descarcă...' : 'PDF'}
                            </button>
                            {canSendToAccounting && (
                              <button
                                onClick={() => handleSend(r.id)}
                                disabled={sendingId === r.id}
                                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40"
                                title="Trimite la contabilitate"
                              >
                                <Send size={15} />
                                {sendingId === r.id ? 'Se trimite...' : 'Trimite'}
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(r.id)}
                              disabled={deletingId === r.id}
                              className="flex items-center gap-1.5 rounded-lg p-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
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
          {!isLoading && reportPage && reportPage.total > REPORTS_PER_PAGE && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {reportPage.total} rapoarte · pagina {page} din {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft size={15} /> Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Următor <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {viewing && (
        <PdfViewer
          path={`/api/reports/${viewing.id}/view`}
          title={`${REPORT_TYPE_LABELS[viewing.type] ?? 'Document'}${viewing.month ? ` · ${formatMonth(viewing.month)}` : ''}`}
          filename={`raport-${REPORT_TYPE_LABELS[viewing.type]?.toLowerCase().replace(/\s+/g, '-') ?? viewing.id}.pdf`}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
