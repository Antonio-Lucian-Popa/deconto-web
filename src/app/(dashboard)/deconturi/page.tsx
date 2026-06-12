'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import type { Trip, TripStatus } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { BadgeVariant } from '@/components/ui/badge';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

function formatRON(amount: number) {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
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

export default function DeconturiPage() {
  const t = useTranslations('trips');
  const [statusFilter, setStatusFilter] = useState<TripStatus | ''>('');

  const { data: trips, isLoading } = useQuery({
    queryKey: ['trips', statusFilter],
    queryFn: () => apiFetch<Trip[]>(`/api/trips${statusFilter ? `?status=${statusFilter}` : ''}`),
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="flex-1 p-6">
        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['', 'ACTIVE', 'CLOSED', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
              }`}
            >
              {s === '' ? 'Toate' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">{t('destination')}</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">{t('period')}</th>
                  <th className="text-right text-xs font-medium text-gray-400 px-4 py-3">{t('total')}</th>
                  <th className="text-right text-xs font-medium text-gray-400 px-4 py-3">{t('budget')}</th>
                  <th className="text-center text-xs font-medium text-gray-400 px-4 py-3">{t('status')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : trips?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-12">
                      Nu există deconturi
                    </td>
                  </tr>
                ) : (
                  trips?.map((trip) => {
                    const overBudget = trip.budget != null && (trip.totalExpenses ?? 0) > trip.budget;
                    return (
                      <tr key={trip.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-white text-sm font-medium">{trip.destination}</p>
                          {trip.purpose && (
                            <p className="text-gray-500 text-xs truncate max-w-48">{trip.purpose}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-sm">
                          {formatDate(trip.startDate)}
                          {trip.endDate && ` — ${formatDate(trip.endDate)}`}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-medium ${overBudget ? 'text-red-400' : 'text-white'}`}>
                            {formatRON(trip.totalExpenses ?? 0)}
                          </span>
                          {overBudget && (
                            <Badge variant="danger" className="ml-2">Depășit</Badge>
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
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
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
        </div>
      </div>
    </div>
  );
}
