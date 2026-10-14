'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import type { User } from '@/lib/api-types';
import { getAppPath } from '@/lib/api-url';
import { ArrowRight, ShieldCheck, ReceiptText, Car, Sparkles } from 'lucide-react';

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
      const res = await fetch(getAppPath('/session/auth/login'), {
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
    <div className="min-h-screen grid lg:grid-cols-[1.08fr_0.92fr]">
      {/* Hero */}
      <section className="auth-aurora relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-500/40 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-sky-400/30 blur-3xl animate-blob" style={{ animationDelay: '-6s' }} />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl animate-blob" style={{ animationDelay: '-10s' }} />
        {/* subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur">
            <span className="text-lg font-black text-white">D</span>
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight text-white">Deconto</p>
            <p className="text-xs text-blue-100/70">Expense operations</p>
          </div>
        </div>

        <div className="relative max-w-xl animate-fade-rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-100 ring-1 ring-white/15 backdrop-blur">
            <Sparkles size={13} /> Platformă internă
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-5xl">
            Deconturi, cheltuieli și flotă,
            <span className="bg-gradient-to-r from-sky-300 via-white to-fuchsia-200 bg-clip-text text-transparent"> într-un flux clar.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-blue-100/80">
            Interfață pentru echipe care au nevoie de aprobare rapidă, vizibilitate pe costuri și documente urmărite la timp.
          </p>
        </div>

        <div className="relative grid max-w-2xl grid-cols-3 gap-3">
          {[
            { icon: ReceiptText, label: 'Bonuri și rapoarte', desc: 'Generate automat' },
            { icon: ShieldCheck, label: 'Aprobări controlate', desc: 'Flux pe roluri' },
            { icon: Car, label: 'Flotă monitorizată', desc: 'GPS & documente' },
          ].map((item, i) => (
            <div
              key={item.label}
              className="glass-card rounded-2xl p-4 animate-fade-rise"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white">
                <item.icon size={17} />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">{item.label}</p>
              <p className="mt-0.5 text-[11px] text-blue-100/60">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Auth form */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f8fc] px-4 py-10 sm:px-6">
        <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl lg:hidden" />
        <div className="relative w-full max-w-md animate-fade-rise rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_24px_60px_rgba(30,41,59,0.12)] sm:p-8">
          <div className="mb-8">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
                <span className="text-base font-black text-white">D</span>
              </div>
              <p className="text-xl font-bold tracking-tight text-slate-950">Deconto</p>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">{t('login')}</h2>
            <p className="mt-2 text-slate-500">Intră în panoul companiei tale.</p>
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
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 font-semibold text-white shadow-[0_8px_22px_rgba(37,99,235,0.32)] transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-[0_10px_26px_rgba(37,99,235,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 active:translate-y-px disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? t('loggingIn') : t('loginButton')}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Acces securizat · Datele companiei tale sunt protejate
          </p>
        </div>
      </section>
    </div>
  );
}
