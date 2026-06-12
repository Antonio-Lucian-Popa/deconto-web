'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import type { CarOverview } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

function formatRON(amount: number) {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount);
}

export default function FlotaPage() {
  const t = useTranslations('fleet');

  const { data: fleet, isLoading } = useQuery({
    queryKey: ['fleet', 'overview'],
    queryFn: () => apiFetch<CarOverview[]>('/api/fleet/overview'),
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : fleet?.length === 0 ? (
          <div className="text-center text-gray-500 py-20">Nu există mașini în flotă</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fleet?.map((car) => (
              <div key={car.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg">{car.plateNumber}</h3>
                    <p className="text-gray-400 text-sm">{car.make} {car.model} {car.year && `(${car.year})`}</p>
                  </div>
                  <span className="text-blue-400 font-medium text-sm">{formatRON(car.totalCosts12m)}</span>
                </div>
                {car.assignedUser && (
                  <p className="text-gray-400 text-sm">
                    👤 {[car.assignedUser.firstName, car.assignedUser.lastName].filter(Boolean).join(' ') || car.assignedUser.email}
                  </p>
                )}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Documente</p>
                  {car.documents.length === 0 ? (
                    <p className="text-gray-600 text-xs">Niciun document</p>
                  ) : (
                    <div className="space-y-1.5">
                      {car.documents.map((doc) => (
                        <div key={doc.reminderId} className="flex items-center justify-between">
                          <span className="text-gray-300 text-xs">{doc.title}</span>
                          <Badge
                            variant={doc.status === 'expired' ? 'danger' : doc.status === 'expires_soon' ? 'warning' : 'success'}
                          >
                            {doc.status === 'expired' ? 'Expirat' : doc.status === 'expires_soon' ? `${doc.daysLeft}z` : 'Valid'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
