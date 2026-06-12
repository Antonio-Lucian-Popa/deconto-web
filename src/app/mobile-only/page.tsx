'use client';

import { useTranslations } from 'next-intl';
import { Smartphone } from 'lucide-react';

export default function MobileOnlyPage() {
  const t = useTranslations('mobileOnly');
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
      <div className="text-center max-w-sm p-8">
        <Smartphone className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-3">{t('title')}</h1>
        <p className="text-gray-400 mb-6">{t('description')}</p>
        <div className="flex flex-col gap-3">
          <a
            href="#"
            className="px-6 py-3 bg-black border border-white/20 text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            🍎 {t('ios')}
          </a>
          <a
            href="#"
            className="px-6 py-3 bg-black border border-white/20 text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            🤖 {t('android')}
          </a>
        </div>
      </div>
    </div>
  );
}
