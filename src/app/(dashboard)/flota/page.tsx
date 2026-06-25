'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import type { CarOverview } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Car, User, ChevronRight, AlertTriangle, CheckCircle2, MapPin, ExternalLink } from 'lucide-react';

function formatRON(amount: number) {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
}

function formatDateTime(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export default function FlotaPage() {
  const t = useTranslations('fleet');

  const { data: fleet, isLoading } = useQuery({
    queryKey: ['fleet', 'overview'],
    queryFn: () => apiFetch<CarOverview[]>('/api/fleet/overview'),
  });

  const expiredCount = fleet?.reduce(
    (n, car) => n + car.documents.filter((d) => d.status === 'expired').length,
    0
  ) ?? 0;
  const soonCount = fleet?.reduce(
    (n, car) => n + car.documents.filter((d) => d.status === 'expires_soon').length,
    0
  ) ?? 0;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="app-content space-y-6">
        {/* Summary bar */}
        {!isLoading && fleet && fleet.length > 0 && (
          <div className="app-panel-soft flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6">
            <span className="text-gray-400 text-sm">
              <span className="text-white font-semibold">{fleet.length}</span> mașini în flotă
            </span>
            {expiredCount > 0 && (
              <span className="flex items-center gap-1.5 text-red-400 text-sm">
                <AlertTriangle size={14} />
                {expiredCount} documente expirate
              </span>
            )}
            {soonCount > 0 && (
              <span className="flex items-center gap-1.5 text-yellow-400 text-sm">
                <AlertTriangle size={14} />
                {soonCount} expiră curând
              </span>
            )}
            {expiredCount === 0 && soonCount === 0 && (
              <span className="flex items-center gap-1.5 text-green-400 text-sm">
                <CheckCircle2 size={14} />
                Toate documentele valide
              </span>
            )}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : fleet?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
            <Car size={48} className="opacity-20" />
            <p>Nu există mașini în flotă</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fleet?.map((car) => {
              const hasExpired = car.documents.some((d) => d.status === 'expired');
              const hasSoon = car.documents.some((d) => d.status === 'expires_soon');
              const borderColor = hasExpired
                ? 'border-red-500/40'
                : hasSoon
                ? 'border-yellow-500/40'
                : 'border-white/10';

              return (
                <div
                  key={car.id}
                  className={`app-card ${borderColor} p-5 space-y-4`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-bold text-lg tracking-wide">{car.plateNumber}</h3>
                      <p className="text-gray-400 text-sm">
                        {car.make} {car.model}{car.year ? ` (${car.year})` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-400 font-medium text-sm">{formatRON(car.totalCosts12m)}</p>
                      <p className="text-gray-600 text-xs">costuri 12 luni</p>
                    </div>
                  </div>

                  {/* Assigned user */}
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-gray-500" />
                    {car.assignedUser ? (
                      <span className="text-gray-300">
                        {[car.assignedUser.firstName, car.assignedUser.lastName].filter(Boolean).join(' ') || car.assignedUser.email}
                      </span>
                    ) : (
                      <span className="text-gray-600 italic">Neasignat</span>
                    )}
                  </div>

                  {/* GPS */}
                  <div className="rounded-lg bg-white/[0.055] border border-white/10 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin size={14} className={car.latestLocation ? 'text-green-400' : 'text-gray-600'} />
                        <span className="text-xs font-medium text-gray-400">GPS</span>
                      </div>
                      {car.latestLocation ? (
                        <span className="text-[11px] text-gray-500">
                          {formatDateTime(car.latestLocation.capturedAt)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-600">Fără poziție</span>
                      )}
                    </div>
                    {car.latestLocation && (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-300 tabular-nums">
                            {car.latestLocation.latitude.toFixed(5)}, {car.latestLocation.longitude.toFixed(5)}
                          </p>
                          {car.latestLocation.accuracy != null && (
                            <p className="text-[11px] text-gray-600">
                              Acuratețe {Math.round(car.latestLocation.accuracy)} m
                            </p>
                          )}
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${car.latestLocation.latitude},${car.latestLocation.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                        >
                          Hartă <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Documents status */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Documente</p>
                    {car.documents.length === 0 ? (
                      <p className="text-gray-600 text-xs">Niciun document înregistrat</p>
                    ) : (
                      <div className="space-y-1">
                        {car.documents.slice(0, 4).map((doc) => (
                          <div key={doc.reminderId} className="flex items-center justify-between">
                            <span className="text-gray-300 text-xs truncate max-w-36">{doc.title}</span>
                            <Badge
                              variant={doc.status === 'expired' ? 'danger' : doc.status === 'expires_soon' ? 'warning' : 'success'}
                            >
                              {doc.status === 'expired'
                                ? 'Expirat'
                                : doc.status === 'expires_soon'
                                ? `${doc.daysLeft}z`
                                : formatDate(doc.expiresAt)}
                            </Badge>
                          </div>
                        ))}
                        {car.documents.length > 4 && (
                          <p className="text-gray-600 text-xs">+{car.documents.length - 4} mai multe</p>
                        )}
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/flota/${car.id}`}
                    className="flex items-center justify-end text-blue-400 text-xs hover:text-blue-300 transition-colors"
                  >
                    Detalii <ChevronRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
