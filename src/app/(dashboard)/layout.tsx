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
        <div className="w-64 bg-[#242424] p-4 space-y-3">
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-950"
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
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="relative w-72 max-w-[85vw] h-full" onClick={(e) => e.stopPropagation()}>
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
