'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch, apiDownload } from '@/lib/api-client';
import type { Report } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Send, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr));
}

export default function RapoartePage() {
  const t = useTranslations('reports');
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiFetch<Report[]>('/api/reports'),
  });

  const generateMutation = useMutation({
    mutationFn: (m: string) =>
      apiFetch('/api/reports/monthly', { method: 'POST', body: JSON.stringify({ month: m }) }),
    onSuccess: () => {
      toast.success('Raport generat');
      setShowNew(false);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/reports/${id}/send`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      toast.success('Raport trimis la contabilitate');
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowNew(true)}>
            <Plus size={16} /> {t('newMonthly')}
          </Button>
        </div>

        {showNew && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">{t('newMonthly')}</h3>
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{t('selectMonth')}</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="px-3 py-2 bg-[#262626] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button onClick={() => generateMutation.mutate(month)} isLoading={generateMutation.isPending}>
                {t('generate')}
              </Button>
              <Button variant="ghost" onClick={() => setShowNew(false)}>Anulează</Button>
            </div>
          </div>
        )}

        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {[t('type'), t('period'), t('sentTo'), t('date'), ''].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : reports?.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-500 py-12">Nu există rapoarte</td></tr>
                ) : (
                  reports?.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <Badge variant={r.type === 'TRIP' ? 'default' : 'info'}>
                          {r.type === 'TRIP' ? 'Delegație' : 'Lunar'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{r.month ?? r.tripId ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{r.sentTo ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => apiDownload(`/api/reports/${r.id}/download`, `raport-${r.id}.pdf`).catch(() => toast.error('Download eșuat'))}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Descarcă"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => sendMutation.mutate(r.id)}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Trimite la contabilitate"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
