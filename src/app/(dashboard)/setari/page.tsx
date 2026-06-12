'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import type { Company } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export default function SetariPage() {
  const t = useTranslations('settings');
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', cif: '', accountantEmail: '' });

  const { data: company, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: () => apiFetch<Company>('/api/company'),
  });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name ?? '',
        cif: company.cif ?? '',
        accountantEmail: company.accountantEmail ?? '',
      });
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/company', { method: 'PATCH', body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success('Setări salvate');
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="flex-1 p-6">
        <div className="max-w-lg bg-[#1a1a1a] border border-white/10 rounded-xl p-6 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <>
              <Input
                label={t('companyName')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label={t('cif')}
                value={form.cif}
                onChange={(e) => setForm({ ...form, cif: e.target.value })}
                placeholder="RO12345678"
              />
              <Input
                label={t('accountantEmail')}
                type="email"
                value={form.accountantEmail}
                onChange={(e) => setForm({ ...form, accountantEmail: e.target.value })}
                placeholder="contabil@companie.ro"
              />
              <div className="pt-2">
                <Button onClick={() => updateMutation.mutate()} isLoading={updateMutation.isPending}>
                  Salvează
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
