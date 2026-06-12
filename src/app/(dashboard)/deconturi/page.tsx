'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import type { Trip, TripStatus } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useUsers, userDisplayName } from '@/hooks/use-users';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Search, Filter } from 'lucide-react';

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

  // Filters
  const [statusFilter, setStatusFilter] = useState<TripStatus | ''>('');
  const [userFilter, setUserFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const canFilterByUser = user?.role !== 'EMPLOYEE';

  // Build query string
  const queryStr = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (userFilter && canFilterByUser) params.set('userId', userFilter);
    if (fromFilter) params.set('from', fromFilter);
    if (toFilter) params.set('to', toFilter);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [statusFilter, userFilter, fromFilter, toFilter, canFilterByUser]);

  const { data: trips, isLoading } = useQuery({
    queryKey: ['trips', queryStr],
    queryFn: () => apiFetch<Trip[]>(`/api/trips${queryStr}`),
  });

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

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="flex-1 p-6 space-y-4">
        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              placeholder="Caută destinație..."
              className="pl-9 pr-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {(['', 'ACTIVE', 'CLOSED', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); resetPage(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
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
              className="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-2 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
              />
            </div>
            <span className="text-gray-500 text-sm">—</span>
            <input
              type="date"
              value={toFilter}
              onChange={(e) => { setToFilter(e.target.value); resetPage(); }}
              className="px-2 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">{t('destination')}</th>
                  {canFilterByUser && (
                    <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">{t('employee')}</th>
                  )}
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">{t('period')}</th>
                  <th className="text-right text-xs font-medium text-gray-400 px-4 py-3">{t('total')}</th>
                  <th className="text-right text-xs font-medium text-gray-400 px-4 py-3">{t('budget')}</th>
                  <th className="text-center text-xs font-medium text-gray-400 px-4 py-3">{t('status')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
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
                    return (
                      <tr
                        key={trip.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-white text-sm font-medium">{trip.destination}</p>
                          {trip.purpose && (
                            <p className="text-gray-500 text-xs truncate max-w-48">
                              {trip.purpose}
                            </p>
                          )}
                        </td>
                        {canFilterByUser && (
                          <td className="px-4 py-3">
                            {employee ? (
                              <p className="text-gray-300 text-sm">{userDisplayName(employee)}</p>
                            ) : (
                              <p className="text-gray-500 text-sm">—</p>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">
                          {formatDate(trip.startDate)}
                          {trip.endDate && ` — ${formatDate(trip.endDate)}`}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`text-sm font-medium ${
                              overBudget ? 'text-red-400' : 'text-white'
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
                        <td className="px-4 py-3 text-right text-gray-300 text-sm">
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
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm whitespace-nowrap"
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <span className="text-xs text-gray-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} din{' '}
                {filtered.length} deconturi
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
    </div>
  );
}
