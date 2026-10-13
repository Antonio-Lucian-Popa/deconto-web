'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import type { Car, Trip, TripStatus } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useUsers, userDisplayName } from '@/hooks/use-users';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Search, Filter, Plus } from 'lucide-react';
import { toast } from 'sonner';

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

const STATUS_VARIANTS: Record<TripStatus, BadgeVariant> = {
  ACTIVE: 'success',
  CLOSED: 'gray',
  SUBMITTED: 'warning',
  APPROVED: 'default',
  REJECTED: 'danger',
};

const STATUS_LABELS: Record<TripStatus, string> = {
  ACTIVE: 'Activ',
  CLOSED: 'Închis',
  SUBMITTED: 'Trimis',
  APPROVED: 'Aprobat',
  REJECTED: 'Respins',
};

const PAGE_SIZE = 15;

export default function DeconturiPage() {
  const t = useTranslations('trips');
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // Filters
  const [statusFilter, setStatusFilter] = useState<TripStatus | ''>(
    (searchParams.get('status') as TripStatus | null) ?? ''
  );
  const [userFilter, setUserFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [tripForm, setTripForm] = useState({
    departureLocation: '', destination: '', purpose: '', startDate: new Date().toISOString().slice(0, 10),
    departureTime: '', endDate: '', budget: '', carId: '', kmStart: '', totalKm: '', fuelAtDeparture: '',
  });

  useEffect(() => {
    const status = searchParams.get('status') as TripStatus | null;
    setStatusFilter(status ?? '');
    setPage(1);
  }, [searchParams]);

  const canFilterByUser = user?.role !== 'EMPLOYEE';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const canApprove = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const statusOptions: (TripStatus | '')[] = isAccountant
    ? ['APPROVED']
    : ['', 'ACTIVE', 'CLOSED', 'SUBMITTED', 'APPROVED', 'REJECTED'];

  // Build query string
  const queryStr = useMemo(() => {
    const params = new URLSearchParams();
    const effectiveStatus = isAccountant ? 'APPROVED' : statusFilter;
    if (effectiveStatus) params.set('status', effectiveStatus);
    if (userFilter && canFilterByUser) params.set('userId', userFilter);
    if (fromFilter) params.set('from', fromFilter);
    if (toFilter) params.set('to', toFilter);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [statusFilter, userFilter, fromFilter, toFilter, canFilterByUser, isAccountant]);

  const { data: trips, isLoading } = useQuery({
    queryKey: ['trips', queryStr],
    queryFn: () => apiFetch<Trip[]>(`/api/trips${queryStr}`),
  });

  const { data: cars } = useQuery({
    queryKey: ['cars'],
    queryFn: () => apiFetch<Car[]>('/api/cars'),
  });

  const createMutation = useMutation({
    mutationFn: () => apiFetch<Trip>('/api/trips', {
      method: 'POST',
      body: JSON.stringify({
        departureLocation: tripForm.departureLocation.trim(),
        destination: tripForm.destination.trim(),
        purpose: tripForm.purpose.trim() || undefined,
        startDate: new Date(`${tripForm.startDate}T12:00:00`).toISOString(),
        departureTime: tripForm.departureTime || undefined,
        endDate: tripForm.endDate ? new Date(`${tripForm.endDate}T12:00:00`).toISOString() : undefined,
        budget: tripForm.budget ? Number(tripForm.budget) : undefined,
        carId: tripForm.carId,
        kmStart: tripForm.kmStart ? Number(tripForm.kmStart) : undefined,
        totalKm: tripForm.totalKm ? Number(tripForm.totalKm) : undefined,
        fuelAtDeparture: tripForm.fuelAtDeparture ? Number(tripForm.fuelAtDeparture) : undefined,
      }),
    }),
    onSuccess: (created) => {
      toast.success('Decont creat');
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      router.push(`/deconturi/${created.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (!tripForm.carId) return toast.error('Selectează vehiculul');
    createMutation.mutate();
  }

  const { data: users } = useUsers();

  const usersMap = useMemo(
    () => new Map((users ?? []).map((u) => [u.id, u])),
    [users]
  );

  // Client-side search by destination
  const filtered = useMemo(() => {
    if (!trips) return [];
    if (!search.trim()) return trips;
    const q = search.toLowerCase();
    return trips.filter(
      (t) =>
        t.destination.toLowerCase().includes(q) ||
        (t.purpose ?? '').toLowerCase().includes(q)
    );
  }, [trips, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetPage() {
    setPage(1);
  }

  function selectStatus(status: TripStatus | '') {
    setStatusFilter(status);
    resetPage();
    router.replace(status ? `/deconturi?status=${status}` : '/deconturi', { scroll: false });
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="app-content space-y-4">
        {!isAccountant && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Deconturi de deplasare</h2>
              <p className="mt-1 text-sm text-slate-500">Creează, completează și urmărește delegațiile companiei.</p>
            </div>
            <Button onClick={() => {
              setTripForm({ departureLocation: '', destination: '', purpose: '', startDate: new Date().toISOString().slice(0, 10), departureTime: '', endDate: '', budget: '', carId: cars?.[0]?.id ?? '', kmStart: '', totalKm: '', fuelAtDeparture: '' });
              setCreateOpen(true);
            }}><Plus size={16} /> {t('newTrip')}</Button>
          </div>
        )}
        {/* Filters row */}
        <div className="app-filter-bar">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              placeholder="Caută destinație..."
              className="app-input w-full pl-9 sm:w-56"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => selectStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  (isAccountant ? s === 'APPROVED' : statusFilter === s)
                    ? 'border border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-950/20'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {s === '' ? 'Toate' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Employee filter */}
          {canFilterByUser && users && users.length > 0 && (
            <select
              value={userFilter}
              onChange={(e) => { setUserFilter(e.target.value); resetPage(); }}
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
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-gray-500" />
              <input
                type="date"
                value={fromFilter}
                onChange={(e) => { setFromFilter(e.target.value); resetPage(); }}
                className="app-input w-[9rem]"
              />
            </div>
            <span className="text-slate-500 text-sm">-</span>
            <input
              type="date"
              value={toFilter}
              onChange={(e) => { setToFilter(e.target.value); resetPage(); }}
              className="app-input w-[9rem]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="app-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>{t('destination')}</th>
                  {canFilterByUser && (
                    <th>{t('employee')}</th>
                  )}
                  <th>{t('period')}</th>
                  <th className="text-right">{t('total')}</th>
                  <th className="text-right">{t('budget')}</th>
                  <th className="text-center">{t('status')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: canFilterByUser ? 7 : 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canFilterByUser ? 7 : 6}
                      className="text-center text-gray-500 py-16"
                    >
                      Nu există deconturi
                    </td>
                  </tr>
                ) : (
                  paginated.map((trip) => {
                    const overBudget =
                      trip.budget != null && (trip.totalExpenses ?? 0) > trip.budget;
                    const employee = usersMap.get(trip.userId);
                    const needsApproval = canApprove && trip.status === 'SUBMITTED';
                    return (
                      <tr
                        key={trip.id}
                          className={`transition-colors ${
                          needsApproval
                            ? 'bg-blue-500/[0.06] hover:bg-blue-500/10'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="text-slate-950 text-sm font-medium">{trip.destination}</p>
                            {needsApproval && (
                              <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                Nou
                              </span>
                            )}
                          </div>
                          {trip.purpose && (
                            <p className="text-gray-500 text-xs truncate max-w-48">
                              {trip.purpose}
                            </p>
                          )}
                        </td>
                        {canFilterByUser && (
                          <td className="px-4 py-3">
                            {employee ? (
                              <p className="text-slate-700 text-sm">{userDisplayName(employee)}</p>
                            ) : (
                              <p className="text-gray-500 text-sm">—</p>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-slate-600 text-sm whitespace-nowrap">
                          {formatDate(trip.startDate)}
                          {trip.endDate && ` — ${formatDate(trip.endDate)}`}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`text-sm font-medium ${
                              overBudget ? 'text-red-600' : 'text-slate-950'
                            }`}
                          >
                            {formatRON(trip.totalExpenses ?? 0)}
                          </span>
                          {overBudget && (
                            <Badge variant="danger" className="ml-2">
                              Depășit
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 text-sm">
                          {trip.budget != null ? formatRON(trip.budget) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={STATUS_VARIANTS[trip.status]}>
                            {STATUS_LABELS[trip.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/deconturi/${trip.id}`}
                            prefetch={false}
                            className="flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-blue-600 hover:text-blue-700"
                          >
                            Detalii <ChevronRight size={14} />
                          </Link>
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
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-gray-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} din{' '}
                {filtered.length} deconturi
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
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-500 text-sm">
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Decont nou" size="lg">
        <form className="space-y-5" onSubmit={submitCreate}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Plecare din *" required value={tripForm.departureLocation} onChange={(event) => setTripForm({ ...tripForm, departureLocation: event.target.value })} placeholder="Ex. București" />
            <Input label="Destinație *" required value={tripForm.destination} onChange={(event) => setTripForm({ ...tripForm, destination: event.target.value })} placeholder="Ex. Cluj-Napoca" />
            <div className="sm:col-span-2">
              <Input label="Scopul deplasării" value={tripForm.purpose} onChange={(event) => setTripForm({ ...tripForm, purpose: event.target.value })} placeholder="Ex. Întâlnire client" />
            </div>
            <Input label="Data plecării *" required type="date" value={tripForm.startDate} onChange={(event) => setTripForm({ ...tripForm, startDate: event.target.value })} />
            <Input label="Ora plecării" type="time" value={tripForm.departureTime} onChange={(event) => setTripForm({ ...tripForm, departureTime: event.target.value })} />
            <Input label="Data întoarcerii" type="date" min={tripForm.startDate} value={tripForm.endDate} onChange={(event) => setTripForm({ ...tripForm, endDate: event.target.value })} />
            <Input label="Buget estimat (RON)" type="number" min="0.01" step="0.01" value={tripForm.budget} onChange={(event) => setTripForm({ ...tripForm, budget: event.target.value })} />
            <div className="sm:col-span-2">
              <Select label="Vehicul *" required value={tripForm.carId} onChange={(event) => setTripForm({ ...tripForm, carId: event.target.value })}>
                <option value="">Selectează vehiculul</option>
                {(cars ?? []).map((car) => <option key={car.id} value={car.id}>{car.plateNumber} — {car.make} {car.model}</option>)}
              </Select>
            </div>
            <Input label="Kilometraj la plecare" type="number" min="0" value={tripForm.kmStart} onChange={(event) => setTripForm({ ...tripForm, kmStart: event.target.value })} />
            <Input label="Distanță estimată (km)" type="number" min="1" value={tripForm.totalKm} onChange={(event) => setTripForm({ ...tripForm, totalKm: event.target.value })} />
            <Input label="Combustibil la plecare (litri)" type="number" min="0" step="0.01" value={tripForm.fuelAtDeparture} onChange={(event) => setTripForm({ ...tripForm, fuelAtDeparture: event.target.value })} />
          </div>
          {(cars ?? []).length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Adaugă mai întâi un vehicul în secțiunea Flotă.</p>}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Anulează</Button>
            <Button type="submit" disabled={(cars ?? []).length === 0} isLoading={createMutation.isPending}>Creează decontul</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
