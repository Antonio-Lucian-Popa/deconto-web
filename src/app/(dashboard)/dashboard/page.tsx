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
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import {
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

function Sparkline({ color, values }: { color: string; values: number[] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const spread = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 92 + 4;
      const y = 42 - ((value - min) / spread) * 32;
      return `${x},${y}`;
    })
    .join(' ');
  const lastPoint = points.split(' ').at(-1)?.split(',') ?? ['96', '20'];

  return (
    <svg viewBox="0 0 100 48" className="h-12 w-20 overflow-visible" aria-hidden="true">
      <path d="M4 42H96" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 4" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPoint[0]} cy={lastPoint[1]} r="2.6" fill={color} />
    </svg>
  );
}

function StatCard({
  label,
  value,
  isLoading,
  sub,
  delta,
  trend,
  tone = 'blue',
}: {
  label: string;
  value: React.ReactNode;
  isLoading: boolean;
  sub?: string;
  delta?: string;
  trend: number[];
  tone?: 'blue' | 'green' | 'red' | 'amber';
}) {
  const colors = {
    blue: '#2563eb',
    green: '#16a34a',
    red: '#ef4444',
    amber: '#f59e0b',
  };

  return (
    <div className="app-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="text-xs font-medium text-slate-500">{label}</span>
          {isLoading ? (
            <>
              <Skeleton className="mt-2 h-8 w-24" />
              <Skeleton className="mt-2 h-3 w-28" />
            </>
          ) : (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight text-slate-950">
                  {value}
                </span>
                {delta && (
                  <span
                    className={`text-[11px] font-semibold ${
                      delta.startsWith('-') ? 'text-red-500' : 'text-emerald-600'
                    }`}
                  >
                    {delta}
                  </span>
                )}
              </div>
              {sub && <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>}
            </>
          )}
        </div>
        <Sparkline values={trend} color={colors[tone]} />
      </div>
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

  const monthTotal = stats?.currentMonth.total ?? 0;
  const expenseCount = stats?.currentMonth.count ?? 0;
  const expiringCount = stats?.expiringDocuments.length ?? 0;

  const trendData = [
    { label: 'Lun', costs: monthTotal * 0.72, trips: pendingCount + 1 },
    { label: 'Mar', costs: monthTotal * 0.68, trips: Math.max(0, pendingCount - 1) },
    { label: 'Mie', costs: monthTotal * 0.82, trips: pendingCount + 2 },
    { label: 'Joi', costs: monthTotal * 0.76, trips: pendingCount + 1 },
    { label: 'Vin', costs: monthTotal * 0.92, trips: pendingCount + 3 },
    { label: 'Sâm', costs: monthTotal * 0.88, trips: pendingCount + 2 },
    { label: 'Dum', costs: monthTotal, trips: pendingCount + 4 },
  ];

  const categoryBars = categoryData.slice(0, 6).map((item) => ({
    name: item.name,
    value: item.value,
    fill: item.color,
  }));

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="app-content space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={recentTripsLabel}
            value={pendingCount}
            isLoading={tripsLoading}
            sub={recentTripsSub(pendingCount)}
            delta="+1.5%"
            trend={[4, 6, 5, 8, 7, 9, 12]}
            tone="green"
          />
          <StatCard
            label={t('monthTotal')}
            value={formatRON(monthTotal)}
            isLoading={statsLoading}
            sub={`${expenseCount} cheltuieli în ${monthLabel}`}
            delta="+2.8%"
            trend={[8, 9, 7, 10, 12, 11, 14]}
            tone="blue"
          />
          <StatCard
            label={t('expiring')}
            value={expiringCount}
            isLoading={statsLoading}
            sub="documente flotă ce expiră în 30 zile"
            delta="-3.5%"
            trend={[8, 7, 7, 5, 4, 3, 2]}
            tone="red"
          />
          <StatCard
            label="Cheltuieli"
            value={expenseCount}
            isLoading={statsLoading}
            sub="înregistrări luna curentă"
            delta="+4.2%"
            trend={[3, 5, 6, 5, 8, 9, 11]}
            tone="green"
          />
        </div>

        {/* Active trip banner (if any) */}
        {!statsLoading && stats?.activeTrip && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-blue-600 text-xs font-medium uppercase tracking-wide mb-0.5">
                Delegație activă
              </p>
              <p className="text-slate-950 font-semibold">{stats.activeTrip.destination}</p>
              <p className="text-slate-400 text-sm mt-0.5">
                {formatRON(stats.activeTrip.runningTotal)} cheltuit
                {stats.activeTrip.budget != null &&
                  ` din ${formatRON(stats.activeTrip.budget)} buget`}
              </p>
            </div>
            {stats.activeTrip.budgetRemaining != null && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Rămas</p>
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_0.75fr]">
          <div className="app-panel p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">Evoluție costuri</h2>
                <p className="mt-1 text-xs text-slate-500">{monthLabel || 'Luna curentă'}</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-blue-600" /> Costuri
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-orange-400" /> Deconturi
                </span>
              </div>
            </div>
            {statsLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#eef2f7" strokeDasharray="3 3" vertical />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value: number, name) => [
                      name === 'costs' ? formatRON(value) : value,
                      name === 'costs' ? 'Costuri' : 'Deconturi',
                    ]}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
                    }}
                  />
                  <Line type="monotone" dataKey="costs" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="trips" stroke="#fb923c" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="app-panel p-5">
            <h2 className="font-semibold text-slate-950">Surse costuri</h2>
            <p className="mt-1 text-xs text-slate-500">{formatRON(monthTotal)} total</p>
            {statsLoading ? (
              <div className="flex h-52 items-center justify-center">
                <Skeleton className="h-36 w-36 rounded-full" />
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
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
                    }}
                    labelStyle={{ color: '#0f172a' }}
                    itemStyle={{ color: '#475569' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-gray-600 text-sm">
                Nu există cheltuieli luna aceasta
              </div>
            )}
          </div>

          <div className="app-panel p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Car size={16} className="text-slate-400" />
              <h2 className="font-semibold text-slate-950">{t('expiring')}</h2>
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
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{doc.title}</p>
                        <p className="text-slate-400 text-xs">
                          {doc.car.plateNumber} - {doc.car.make} {doc.car.model}
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.35fr]">
          <div className="app-panel p-5">
            <h2 className="font-semibold text-slate-950">{t('byCategory')}</h2>
            <p className="mt-1 text-xs text-slate-500">Distribuție pe categorii</p>
            {statsLoading ? (
              <Skeleton className="mt-4 h-48 w-full" />
            ) : categoryBars.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={categoryBars}
                  layout="vertical"
                  margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={92}
                    tick={{ fill: '#475569', fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatRON(value), 'Total']}
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={22}>
                    {categoryBars.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                Nu există cheltuieli luna aceasta
              </div>
            )}
          </div>

        {/* Recent trips for review/accounting */}
        <div className="app-panel overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="font-semibold text-slate-950">
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
          <div className="divide-y divide-slate-100">
              {recentTrips?.slice(0, 5).map((trip) => (
                <Link
                  key={trip.id}
                  href={`/deconturi/${trip.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 text-xs font-bold">
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
    </div>
  );
}
