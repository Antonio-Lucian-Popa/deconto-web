'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import type { Company } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { KeyRound, Plus, Save, TestTube2, Trash2, X } from 'lucide-react';
import type { CompanyAiSettings } from '@/lib/api-types';

export default function SetariPage() {
  const t = useTranslations('settings');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ name: '', cif: '', accountantEmail: '' });
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [aiForm, setAiForm] = useState({ enabled: false, model: 'claude-haiku-4-5', apiKey: '' });

  const { data: company, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: () => apiFetch<Company>('/api/company'),
  });

  const { data: aiSettings, isLoading: aiLoading } = useQuery({
    queryKey: ['company', 'ai-settings'],
    queryFn: () => apiFetch<CompanyAiSettings>('/api/company/ai-settings'),
    enabled: user?.role === 'ADMIN',
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

  useEffect(() => {
    if (!aiSettings) return;
    setAiForm((prev) => ({
      enabled: aiSettings.enabled,
      model: aiSettings.model,
      apiKey: prev.apiKey,
    }));
  }, [aiSettings]);

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

  const updateAiMutation = useMutation({
    mutationFn: () => {
      const trimmedKey = aiForm.apiKey.trim();
      return apiFetch<CompanyAiSettings>('/api/company/ai-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          enabled: aiForm.enabled,
          model: aiForm.model,
          ...(trimmedKey ? { apiKey: trimmedKey } : {}),
        }),
      });
    },
    onSuccess: () => {
      toast.success('Setările AI au fost salvate');
      setAiForm((prev) => ({ ...prev, apiKey: '' }));
      queryClient.invalidateQueries({ queryKey: ['company', 'ai-settings'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testAiMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; model: string }>('/api/company/ai-settings/test', {
        method: 'POST',
        body: JSON.stringify({
          model: aiForm.model,
          ...(aiForm.apiKey.trim() ? { apiKey: aiForm.apiKey.trim() } : {}),
        }),
      }),
    onSuccess: (result) => toast.success(`Conexiune AI validă (${result.model})`),
    onError: (err: Error) => toast.error(err.message),
  });

  const clearAiKeyMutation = useMutation({
    mutationFn: () =>
      apiFetch<CompanyAiSettings>('/api/company/ai-settings', {
        method: 'PATCH',
        body: JSON.stringify({ apiKey: null }),
      }),
    onSuccess: () => {
      toast.success('Cheia AI a fost ștearsă');
      setAiForm((prev) => ({ ...prev, enabled: false, apiKey: '' }));
      queryClient.invalidateQueries({ queryKey: ['company', 'ai-settings'] });
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

          {/* AI / OCR settings */}
          {!isReadOnly && (
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <KeyRound size={18} className="text-blue-400" />
                    <h2 className="text-white font-semibold">AI / OCR bonuri</h2>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">
                    Configurează cheia Anthropic folosită de toți utilizatorii companiei pentru scanarea bonurilor.
                  </p>
                </div>
                {aiSettings?.maskedApiKey && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs">
                    {aiSettings.maskedApiKey}
                  </span>
                )}
              </div>

              {aiLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <>
                  <label className="flex items-center gap-3 active:opacity-80">
                    <input
                      type="checkbox"
                      checked={aiForm.enabled}
                      onChange={(event) => setAiForm({ ...aiForm, enabled: event.target.checked })}
                      className="h-4 w-4 rounded border-white/20 bg-[#262626] accent-blue-600"
                    />
                    <span className="text-sm text-gray-300">Activează OCR cu cheia companiei</span>
                  </label>

                  <Select
                    label="Model Claude"
                    value={aiForm.model}
                    onChange={(event) => setAiForm({ ...aiForm, model: event.target.value })}
                  >
                    {(aiSettings?.availableModels ?? []).map((model) => (
                      <option key={model.id} value={model.id}>{model.label}</option>
                    ))}
                  </Select>

                  <Input
                    label={aiSettings?.hasApiKey ? 'Schimbă API key' : 'Anthropic API key'}
                    type="password"
                    value={aiForm.apiKey}
                    onChange={(event) => setAiForm({ ...aiForm, apiKey: event.target.value })}
                    placeholder={aiSettings?.hasApiKey ? 'Lasă gol ca să păstrezi cheia existentă' : 'sk-ant-...'}
                    autoComplete="off"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => testAiMutation.mutate()}
                      isLoading={testAiMutation.isPending}
                      disabled={!aiForm.apiKey.trim() && !aiSettings?.hasApiKey}
                    >
                      <TestTube2 size={16} /> Testează conexiunea
                    </Button>
                    <Button
                      onClick={() => updateAiMutation.mutate()}
                      isLoading={updateAiMutation.isPending}
                    >
                      <Save size={16} /> Salvează AI
                    </Button>
                    {aiSettings?.hasApiKey && (
                      <Button
                        variant="danger"
                        onClick={() => clearAiKeyMutation.mutate()}
                        isLoading={clearAiKeyMutation.isPending}
                      >
                        <Trash2 size={16} /> Șterge cheia
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">
                    Cheia este criptată în baza de date și nu va fi afișată complet după salvare.
                  </p>
                </>
              )}
            </div>
          )}

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
