'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch, apiDownload } from '@/lib/api-client';
import type { Expense } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

function formatRON(amount: number) {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
}

const CATEGORY_LABELS: Record<string, string> = {
  COMBUSTIBIL: 'Combustibil', MASA: 'Masă', CAZARE: 'Cazare',
  TRANSPORT: 'Transport', DIURNA: 'Diurnă', ALTELE: 'Altele',
};

export default function CheltuieliPage() {
  const t = useTranslations('expenses');
  const [exporting, setExporting] = useState(false);

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => apiFetch<Expense[]>('/api/expenses'),
  });

  async function handleExport() {
    setExporting(true);
    try {
      await apiDownload('/api/expenses/export', 'cheltuieli-export.csv');
    } catch {
      toast.error('Export eșuat');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="flex-1 p-6">
        <div className="flex justify-end mb-6">
          <Button variant="secondary" isLoading={exporting} onClick={handleExport}>
            <Download size={16} /> Export CSV
          </Button>
        </div>
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Data', 'Categorie', 'Comerciant', 'Note', 'Sumă', 'Bon'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : expenses?.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-500 py-12">Nu există cheltuieli</td></tr>
                ) : (
                  expenses?.map((e) => (
                    <tr key={e.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-gray-300 text-sm">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 text-white text-sm">{CATEGORY_LABELS[e.category] ?? e.category}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{e.merchant ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-sm max-w-48 truncate">{e.notes ?? '—'}</td>
                      <td className="px-4 py-3 text-white text-sm font-medium">{formatRON(e.amount)} {e.currency !== 'RON' && e.currency}</td>
                      <td className="px-4 py-3">
                        {e.imageUrl ? (
                          <a href={e.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs">
                            Vezi
                          </a>
                        ) : <span className="text-gray-600 text-xs">—</span>}
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
