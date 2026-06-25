'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import type { User } from '@/lib/api-types';
import { getAppPath } from '@/lib/api-url';
import { ArrowRight, ShieldCheck, ReceiptText, Car } from 'lucide-react';

export default function LoginPage() {
  const t = useTranslations('auth');
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(getAppPath('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { accessToken?: string; user?: User; message?: string };
      if (!res.ok) throw new Error(data.message ?? t('loginError'));
      if (data.accessToken && data.user) {
        login(data.accessToken, data.user);
        if (data.user.role === 'EMPLOYEE') {
          router.push('/mobile-only');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('loginError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell min-h-screen grid lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden lg:flex flex-col justify-between p-10 xl:p-14">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <span className="text-base font-black text-white">D</span>
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight text-slate-950">Deconto</p>
            <p className="text-xs text-slate-500">Expense ops</p>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="mb-4 text-sm font-medium uppercase text-blue-600">Platformă internă</p>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight text-slate-950">
            Deconturi, cheltuieli și flotă într-un flux clar.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-500">
            Interfață pentru echipe care au nevoie de aprobare rapidă, vizibilitate pe costuri și documente urmărite la timp.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-2xl">
          {[
            { icon: ReceiptText, label: 'Bonuri și rapoarte' },
            { icon: ShieldCheck, label: 'Aprobări controlate' },
            { icon: Car, label: 'Flotă monitorizată' },
          ].map((item) => (
            <div key={item.label} className="app-panel-soft p-4">
              <item.icon size={18} className="text-blue-600" />
              <p className="mt-3 text-sm font-medium text-slate-700">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md app-panel p-6 sm:p-8">
          <div className="mb-8">
            <div className="lg:hidden mb-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl border border-blue-400/25 bg-blue-500/15 flex items-center justify-center">
                <span className="text-sm font-black text-blue-700">D</span>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-950">Deconto</p>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{t('login')}</h2>
            <p className="text-slate-400 mt-2">Intră în panoul companiei tale.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="app-input w-full"
                placeholder="email@companie.ro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="app-input w-full"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors mt-2 inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-950/35"
            >
              {loading ? t('loggingIn') : t('loginButton')}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
