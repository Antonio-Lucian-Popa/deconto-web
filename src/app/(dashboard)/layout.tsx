'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Menu, X } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
    if (!isLoading && user?.role === 'EMPLOYEE') {
      router.push('/mobile-only');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="app-shell flex h-screen">
        <div className="w-[272px] space-y-3 bg-[#111c3b] p-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <Sidebar className="hidden md:flex" />
      <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 shadow-sm backdrop-blur-xl md:hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          aria-label="Deschide meniul"
        >
          <Menu size={20} />
        </button>
        <div className="text-center min-w-0">
          <p className="text-slate-950 font-semibold leading-tight">Deconto</p>
          <p className="text-xs text-slate-500 truncate max-w-[180px]">{user.email}</p>
        </div>
        <div className="w-10" />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="relative h-full w-[272px] max-w-[86vw] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <Sidebar className="flex" onNavigate={() => setMobileMenuOpen(false)} />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Închide meniul"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden pt-16 md:pt-0 min-w-0">
        {children}
      </main>
    </div>
  );
}
