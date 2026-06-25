'use client';

import { useTranslations } from 'next-intl';
import { Download, Smartphone } from 'lucide-react';

export default function MobileOnlyPage() {
  const t = useTranslations('mobileOnly');
  return (
    <div className="app-shell min-h-screen flex items-center justify-center px-4">
      <div className="app-panel max-w-sm p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/15">
          <Smartphone className="h-8 w-8 text-blue-200" />
        </div>
        <h1 className="text-2xl font-bold text-slate-950 mb-3">{t('title')}</h1>
        <p className="text-slate-400 mb-6">{t('description')}</p>
        <div className="flex flex-col gap-3">
          <a
            href="#"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Download size={16} /> {t('ios')}
          </a>
          <a
            href="#"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Download size={16} /> {t('android')}
          </a>
        </div>
      </div>
    </div>
  );
}
