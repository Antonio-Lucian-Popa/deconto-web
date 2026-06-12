'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import type { StatsSummary, Trip } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, Clock, TrendingUp, CheckCircle } from 'lucide-react';

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

function formatRON(amount: number) {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', 'summary'],
    queryFn: () => apiFetch<StatsSummary>('/api/stats/summary'),
  });

  const { data: recentTrips, isLoading: tripsLoading } = useQuery({
    queryKey: ['trips', 'submitted', 'recent'],
    queryFn: () => apiFetch<Trip[]>('/api/trips?status=SUBMITTED'),
  });

  const pendingCount = recentTrips?.length ?? 0;

  const categoryData = stats
    ? Object.entries(stats.currentMonth.byCategory).map(([key, value]) => ({
        name: CATEGORY_LABELS[key] ?? key,
        value,
        color: CATEGORY_COLORS[key] ?? '#6b7280',
      }))
    : [];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="flex-1 p-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-gray-400 text-sm">{t('pendingTrips')}</span>
              <Clock size={18} className="text-yellow-400" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-3xl font-bold text-white">{pendingCount}</span>
            )}
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-gray-400 text-sm">{t('monthTotal')}</span>
              <TrendingUp size={18} className="text-blue-400" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <span className="text-2xl font-bold text-white">
                {formatRON(stats?.currentMonth.total ?? 0)}
              </span>
            )}
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-gray-400 text-sm">{t('expiring')}</span>
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-3xl font-bold text-white">
                {stats?.expiringDocuments.length ?? 0}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category donut chart */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">{t('byCategory')}</h2>
            {statsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatRON(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                Nu există cheltuieli luna aceasta
              </div>
            )}
          </div>

          {/* Expiring documents */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">{t('expiring')}</h2>
            {statsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : stats?.expiringDocuments.length === 0 ? (
              <div className="flex items-center gap-2 text-green-400 text-sm py-4">
                <CheckCircle size={16} />
                <span>Toate documentele sunt valide</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {stats?.expiringDocuments.map((doc) => (
                  <div key={doc.reminderId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white text-sm font-medium">{doc.title}</p>
                      <p className="text-gray-400 text-xs">{doc.car.plateNumber} — {doc.car.make} {doc.car.model}</p>
                    </div>
                    <Badge variant={doc.daysLeft < 0 ? 'danger' : doc.daysLeft <= 7 ? 'warning' : 'info'}>
                      {doc.daysLeft < 0 ? 'Expirat' : `${doc.daysLeft}z`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent submitted trips */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">{t('recentTrips')}</h2>
          {tripsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recentTrips?.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">Nu există deconturi în așteptare</p>
          ) : (
            <div className="space-y-2">
              {recentTrips?.slice(0, 5).map((trip) => (
                <div key={trip.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">{trip.destination}</p>
                    <p className="text-gray-400 text-xs">{formatDate(trip.startDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm">{formatRON(trip.totalExpenses ?? 0)}</p>
                    <Badge variant="warning">Trimis</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
