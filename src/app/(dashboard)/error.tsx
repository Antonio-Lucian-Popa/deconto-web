'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard page error', error);
  }, [error]);

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="app-panel w-full max-w-lg p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertTriangle size={26} />
        </div>
        <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-950">
          Pagina nu a putut fi afișată
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          A apărut o problemă temporară. Reîncarcă pagina; dacă persistă, eroarea este păstrată în consolă pentru diagnosticare.
        </p>
        <Button className="mt-6" onClick={reset}>
          <RefreshCw size={16} /> Reîncarcă pagina
        </Button>
      </div>
    </div>
  );
}
