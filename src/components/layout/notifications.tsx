'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell, FileText, CarFront, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import type { StatsSummary, Trip } from '@/lib/api-types';
import { useAuth } from '@/hooks/use-auth';
import { clsx } from 'clsx';

type NotificationTone = 'danger' | 'warning' | 'info';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: NotificationTone;
  icon: React.ReactNode;
}

const toneStyles: Record<NotificationTone, { dot: string; icon: string }> = {
  danger: { dot: 'bg-red-500', icon: 'bg-red-50 text-red-600' },
  warning: { dot: 'bg-amber-500', icon: 'bg-amber-50 text-amber-600' },
  info: { dot: 'bg-blue-500', icon: 'bg-blue-50 text-blue-600' },
};

export function Notifications() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const canSeeTrips = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const { data: stats } = useQuery({
    queryKey: ['stats', 'summary'],
    queryFn: () => apiFetch<StatsSummary>('/api/stats/summary'),
    refetchInterval: 2 * 60 * 1000,
  });

  const { data: submittedTrips } = useQuery({
    queryKey: ['trips', 'submitted-badge'],
    queryFn: () => apiFetch<Trip[]>('/api/trips?status=SUBMITTED'),
    enabled: canSeeTrips,
    refetchInterval: 60_000,
  });

  const items = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];

    for (const trip of submittedTrips ?? []) {
      list.push({
        id: `trip-${trip.id}`,
        title: 'Decont în așteptare',
        description: `${trip.destination} — așteaptă aprobare`,
        href: `/deconturi/${trip.id}`,
        tone: 'info',
        icon: <FileText size={15} />,
      });
    }

    for (const doc of stats?.expiringDocuments ?? []) {
      const expired = doc.daysLeft < 0;
      const critical = !expired && doc.daysLeft <= 7;
      list.push({
        id: `doc-${doc.reminderId}`,
        title: expired
          ? `${doc.title} a expirat`
          : doc.daysLeft === 0
          ? `${doc.title} expiră azi`
          : `${doc.title} expiră în ${doc.daysLeft} zile`,
        description: `${doc.car.plateNumber} — ${doc.car.make} ${doc.car.model}`,
        href: '/flota',
        tone: expired || critical ? 'danger' : 'warning',
        icon: <CarFront size={15} />,
      });
    }

    // Most urgent first: danger, then warning, then info.
    const order: Record<NotificationTone, number> = { danger: 0, warning: 1, info: 2 };
    return list.sort((a, b) => order[a.tone] - order[b.tone]);
  }, [stats, submittedTrips]);

  const count = items.length;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'relative flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition',
          open
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
        )}
        aria-label="Notificări"
        aria-expanded={open}
      >
        <Bell size={17} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-semibold text-slate-950">Notificări</p>
            {count > 0 && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {count} {count === 1 ? 'nouă' : 'noi'}
              </span>
            )}
          </div>

          {count === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={22} />
              </span>
              <p className="text-sm font-medium text-slate-700">Ești la zi</p>
              <p className="text-xs text-slate-400">Nu există notificări noi momentan.</p>
            </div>
          ) : (
            <div className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <span
                    className={clsx(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      toneStyles[item.tone].icon
                    )}
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-slate-900">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{item.description}</p>
                  </div>
                  <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', toneStyles[item.tone].dot)} />
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] text-slate-400">
            {count > 0 ? (
              <>
                <AlertTriangle size={13} className="text-amber-500" />
                <span>Acționează din timp pentru a evita întârzierile.</span>
              </>
            ) : (
              <>
                <Clock size={13} />
                <span>Verificăm automat deconturile și documentele flotei.</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
