'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import type { Company } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Plus, X, Save } from 'lucide-react';

export default function SetariPage() {
  const t = useTranslations('settings');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ name: '', cif: '', accountantEmail: '' });
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');

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
      const cats = company.settings?.customCategories;
      if (Array.isArray(cats)) setCustomCategories(cats as string[]);
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiFetch<Company>('/api/company', {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          settings: { ...(company?.settings ?? {}), customCategories },
        }),
      }),
    onSuccess: () => {
      toast.success('Setări salvate');
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isReadOnly = user?.role !== 'ADMIN';

  function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed || customCategories.includes(trimmed)) return;
    setCustomCategories((prev) => [...prev, trimmed]);
    setNewCategory('');
  }

  function removeCategory(cat: string) {
    setCustomCategories((prev) => prev.filter((c) => c !== cat));
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="flex-1 p-6">
        <div className="max-w-2xl space-y-6">
          {/* Company info card */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Informații companie</h2>
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
                  disabled={isReadOnly}
                  placeholder="SC Exemplu SRL"
                />
                <Input
                  label={t('cif')}
                  value={form.cif}
                  onChange={(e) => setForm({ ...form, cif: e.target.value })}
                  disabled={isReadOnly}
                  placeholder="RO12345678"
                />
                <Input
                  label={t('accountantEmail')}
                  type="email"
                  value={form.accountantEmail}
                  onChange={(e) => setForm({ ...form, accountantEmail: e.target.value })}
                  disabled={isReadOnly}
                  placeholder="contabil@companie.ro"
                />
              </>
            )}
          </div>

          {/* Custom categories */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-white font-semibold">Categorii personalizate cheltuieli</h2>
              <p className="text-gray-500 text-sm mt-1">
                Adaugă categorii suplimentare față de cele implicite (Combustibil, Masă, Cazare, Transport, Diurnă, Altele).
              </p>
            </div>

            {/* Default categories (read-only display) */}
            <div className="flex flex-wrap gap-2">
              {['Combustibil', 'Masă', 'Cazare', 'Transport', 'Diurnă', 'Altele'].map((cat) => (
                <span
                  key={cat}
                  className="px-3 py-1 rounded-full text-xs bg-white/5 text-gray-500 border border-white/5"
                >
                  {cat}
                </span>
              ))}
              {customCategories.map((cat) => (
                <span
                  key={cat}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30"
                >
                  {cat}
                  {!isReadOnly && (
                    <button
                      onClick={() => removeCategory(cat)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>

            {/* Add new category */}
            {!isReadOnly && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                  placeholder="Nouă categorie..."
                  className="flex-1 px-3 py-2 bg-[#262626] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <Button variant="secondary" onClick={addCategory} disabled={!newCategory.trim()}>
                  <Plus size={16} /> Adaugă
                </Button>
              </div>
            )}
          </div>

          {/* Save button */}
          {!isReadOnly && (
            <div className="flex justify-end">
              <Button
                onClick={() => updateMutation.mutate()}
                isLoading={updateMutation.isPending}
                size="lg"
              >
                <Save size={16} /> Salvează setările
              </Button>
            </div>
          )}

          {isReadOnly && (
            <p className="text-gray-500 text-sm">
              Doar administratorii pot modifica setările companiei.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
