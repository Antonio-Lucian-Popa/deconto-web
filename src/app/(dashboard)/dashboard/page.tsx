'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import type { StatsSummary, Trip } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  Car,
} from 'lucide-react';
import Link from 'next/link';

const CATEGORY_COLORS: Record<string, string> = {
  COMBUSTIBIL: '#f59e0b',
  MASA: '#10b981',
  CAZARE: '#3b82f6',
  TRANSPORT: '#8b5cf6',
  DIURNA: '#ec4899',
  ALTELE: '#6b7280',
};

const CATEGORY_LABELS: Record<string, string> = {
  COMBUSTIBIL: 'Combustibil',
  MASA: 'Masă',
  CAZARE: 'Cazare',
  TRANSPORT: 'Transport',
  DIURNA: 'Diurnă',
  ALTELE: 'Altele',
};

const TRIP_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activ',
  CLOSED: 'Închis',
  SUBMITTED: 'Trimis',
  APPROVED: 'Aprobat',
  REJECTED: 'Respins',
};
const TRIP_STATUS_VARIANTS: Record<string, 'success' | 'gray' | 'warning' | 'default' | 'danger'> =
  {
    ACTIVE: 'success',
    CLOSED: 'gray',
    SUBMITTED: 'warning',
    APPROVED: 'default',
    REJECTED: 'danger',
  };

function formatRON(amount: number) {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function pendingText(singular: string, plural: string) {
  return (count: number) => (count === 1 ? singular : plural);
}

function StatCard({
  label,
  value,
  icon,
  isLoading,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  isLoading: boolean;
  sub?: string;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-gray-400 text-sm">{label}</span>
        {icon}
      </div>
      {isLoading ? (
        <>
          <Skeleton className="h-9 w-24 mb-1" />
          {sub !== undefined && <Skeleton className="h-4 w-32 mt-1" />}
        </>
      ) : (
        <>
          <div className="text-3xl font-bold text-white">{value}</div>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { user } = useAuth();
  const recentTripStatus = user?.role === 'ACCOUNTANT' ? 'APPROVED' : 'SUBMITTED';
  const recentTripsLabel = user?.role === 'ACCOUNTANT' ? 'Deconturi aprobate' : t('pendingTrips');
  const recentTripsSub = user?.role === 'ACCOUNTANT'
    ? pendingText('decont aprobat pentru contabilitate', 'deconturi aprobate pentru contabilitate')
    : pendingText('decont așteaptă aprobare', 'deconturi așteaptă aprobare');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', 'summary'],
    queryFn: () => apiFetch<StatsSummary>('/api/stats/summary'),
    refetchInterval: 2 * 60 * 1000,
  });

  const { data: recentTrips, isLoading: tripsLoading } = useQuery({
    queryKey: ['trips', 'recent', recentTripStatus],
    queryFn: () => apiFetch<Trip[]>(`/api/trips?status=${recentTripStatus}`),
    refetchInterval: 2 * 60 * 1000,
  });

  const pendingCount = recentTrips?.length ?? 0;

  const categoryData = stats
    ? Object.entries(stats.currentMonth.byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([key, value]) => ({
          name: CATEGORY_LABELS[key] ?? key,
          value,
          color: CATEGORY_COLORS[key] ?? '#6b7280',
        }))
    : [];

  const monthLabel = stats?.currentMonth.label
    ? new Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric' }).format(
        new Date(stats.currentMonth.label + '-01')
      )
    : '';

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="flex-1 p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label={recentTripsLabel}
            value={pendingCount}
            icon={<Clock size={18} className="text-yellow-400" />}
            isLoading={tripsLoading}
            sub={recentTripsSub(pendingCount)}
          />
          <StatCard
            label={t('monthTotal')}
            value={formatRON(stats?.currentMonth.total ?? 0)}
            icon={<TrendingUp size={18} className="text-blue-400" />}
            isLoading={statsLoading}
            sub={`${stats?.currentMonth.count ?? 0} cheltuieli în ${monthLabel}`}
          />
          <StatCard
            label={t('expiring')}
            value={stats?.expiringDocuments.length ?? 0}
            icon={<AlertTriangle size={18} className="text-red-400" />}
            isLoading={statsLoading}
            sub="documente flotă ce expiră în 30 zile"
          />
        </div>

        {/* Active trip banner (if any) */}
        {!statsLoading && stats?.activeTrip && (
          <div className="bg-blue-600/10 border border-blue-600/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-blue-400 text-xs font-medium uppercase tracking-wide mb-0.5">
                Delegație activă
              </p>
              <p className="text-white font-semibold">{stats.activeTrip.destination}</p>
              <p className="text-gray-400 text-sm mt-0.5">
                {formatRON(stats.activeTrip.runningTotal)} cheltuit
                {stats.activeTrip.budget != null &&
                  ` din ${formatRON(stats.activeTrip.budget)} buget`}
              </p>
            </div>
            {stats.activeTrip.budgetRemaining != null && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Ramas</p>
                <p
                  className={`text-lg font-bold ${
                    stats.activeTrip.budgetRemaining < 0
                      ? 'text-red-400'
                      : 'text-green-400'
                  }`}
                >
                  {formatRON(stats.activeTrip.budgetRemaining)}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category donut chart */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-1">{t('byCategory')}</h2>
            <p className="text-gray-500 text-xs mb-4">{monthLabel}</p>
            {statsLoading ? (
              <div className="flex items-center justify-center h-52">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
            ) : categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatRON(value), 'Total']}
                    contentStyle={{
                      background: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#ccc' }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-gray-600 text-sm">
                Nu există cheltuieli luna aceasta
              </div>
            )}
          </div>

          {/* Expiring fleet documents */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Car size={16} className="text-gray-400" />
              <h2 className="text-white font-semibold">{t('expiring')}</h2>
            </div>
            {statsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : stats?.expiringDocuments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-green-400 py-8">
                <CheckCircle2 size={32} />
                <span className="text-sm">Toate documentele flotei sunt valide</span>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-52 pr-1">
                {stats?.expiringDocuments.map((doc) => {
                  const expired = doc.daysLeft < 0;
                  const critical = !expired && doc.daysLeft <= 7;
                  const soon = !expired && !critical && doc.daysLeft <= 30;
                  return (
                    <div
                      key={doc.reminderId}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        expired
                          ? 'bg-red-500/10 border-red-500/30'
                          : critical
                          ? 'bg-orange-500/10 border-orange-500/30'
                          : soon
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{doc.title}</p>
                        <p className="text-gray-400 text-xs">
                          {doc.car.plateNumber} — {doc.car.make} {doc.car.model}
                        </p>
                      </div>
                      <Badge
                        variant={
                          expired ? 'danger' : critical ? 'warning' : 'info'
                        }
                      >
                        {expired
                          ? 'Expirat'
                          : doc.daysLeft === 0
                          ? 'Azi'
                          : `${doc.daysLeft}z`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent trips for review/accounting */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold">
              {user?.role === 'ACCOUNTANT' ? 'Deconturi aprobate recente' : t('recentTrips')}
            </h2>
            <Link
              href={`/deconturi?status=${recentTripStatus}`}
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
            >
              Vezi toate <ChevronRight size={14} />
            </Link>
          </div>
          {tripsLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : recentTrips?.length === 0 ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm px-5 py-8">
              <CheckCircle2 size={16} />
              <span>
                {user?.role === 'ACCOUNTANT'
                  ? 'Nu există deconturi aprobate'
                  : 'Nu există deconturi în așteptare'}
              </span>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentTrips?.slice(0, 5).map((trip) => (
                <Link
                  key={trip.id}
                  href={`/deconturi/${trip.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 text-xs font-bold">
                        {trip.destination.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{trip.destination}</p>
                      <p className="text-gray-500 text-xs">{formatDate(trip.startDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-white text-sm font-medium">
                        {formatRON(trip.totalExpenses ?? 0)}
                      </p>
                      <Badge variant={TRIP_STATUS_VARIANTS[trip.status] ?? 'gray'} className="mt-0.5">
                        {TRIP_STATUS_LABELS[trip.status] ?? trip.status}
                      </Badge>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-gray-600 group-hover:text-gray-400 transition-colors"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
