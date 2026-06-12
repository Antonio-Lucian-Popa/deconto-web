'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch, apiDownload } from '@/lib/api-client';
import type { Report } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useUsers, userDisplayName } from '@/hooks/use-users';
import { Download, Send, Plus, FileText, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';

function formatDateTime(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function formatMonth(monthStr: string | null) {
  if (!monthStr) return '—';
  return new Intl.DateTimeFormat('ro-RO', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(monthStr + '-01'));
}

export default function RapoartePage() {
  const t = useTranslations('reports');
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedUserId, setSelectedUserId] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiFetch<Report[]>('/api/reports'),
  });

  const { data: users } = useUsers();

  const usersMap = useMemo(
    () => new Map((users ?? []).map((u) => [u.id, u])),
    [users]
  );

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<Report>('/api/reports/monthly', {
        method: 'POST',
        body: JSON.stringify({
          month,
          ...(selectedUserId ? { userId: selectedUserId } : {}),
        }),
      }),
    onSuccess: () => {
      toast.success('Raport lunar generat cu succes');
      setShowNew(false);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleDownload(id: string) {
    setDownloadingId(id);
    try {
      await apiDownload(`/api/reports/${id}/download`, `raport-${id}.pdf`);
    } catch {
      toast.error('Descărcarea a eşuat');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleSend(id: string) {
    setSendingId(id);
    try {
      await apiFetch(`/api/reports/${id}/send`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      toast.success('Raport trimis la contabilitate');
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Trimitere eşuată');
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="flex-1 p-6 space-y-6">
        {/* Action bar */}
        <div className="flex justify-end">
          <Button onClick={() => setShowNew(true)}>
            <Plus size={16} /> {t('newMonthly')}
          </Button>
        </div>

        {/* New monthly report modal */}
        <Modal
          open={showNew}
          onClose={() => setShowNew(false)}
          title={t('newMonthly')}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('selectMonth')}
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 bg-[#262626] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('selectEmployee')}
              </label>
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#262626] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
                >
                  <option value="">{t('allEmployees')}</option>
                  {users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {userDisplayName(u)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowNew(false)}>
                Anulează
              </Button>
              <Button
                onClick={() => generateMutation.mutate()}
                isLoading={generateMutation.isPending}
              >
                <FileText size={16} /> Generează
              </Button>
            </div>
          </div>
        </Modal>

        {/* Reports table */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {[
                    t('type'),
                    t('period'),
                    'Generat de',
                    t('sentTo'),
                    t('date'),
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
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
                ) : reports?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-16 text-sm">
                      Nu există rapoarte generate
                    </td>
                  </tr>
                ) : (
                  reports?.map((r) => {
                    const generator = usersMap.get(r.userId);
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Badge variant={r.type === 'TRIP' ? 'default' : 'info'}>
                            {r.type === 'TRIP' ? 'Delegaţie' : 'Lunar'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-sm">
                          {r.type === 'MONTHLY'
                            ? formatMonth(r.month)
                            : r.tripId
                            ? `Decont ${r.tripId.slice(0, 8)}...`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-sm">
                          {generator ? userDisplayName(generator) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {r.sentTo ? (
                            <div>
                              <p className="text-gray-300 text-sm">{r.sentTo}</p>
                              {r.sentAt && (
                                <p className="text-gray-500 text-xs">
                                  {formatDateTime(r.sentAt)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-600 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                          {formatDateTime(r.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleDownload(r.id)}
                              disabled={downloadingId === r.id}
                              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-xs disabled:opacity-40"
                              title="Descarcă PDF"
                            >
                              <Download size={15} />
                              {downloadingId === r.id ? 'Se descarcă...' : 'PDF'}
                            </button>
                            <button
                              onClick={() => handleSend(r.id)}
                              disabled={sendingId === r.id}
                              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-xs disabled:opacity-40"
                              title="Trimite la contabilitate"
                            >
                              <Send size={15} />
                              {sendingId === r.id ? 'Se trimite...' : 'Trimite'}
                            </button>
                          </div>
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
