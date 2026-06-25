'use client';

import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/lib/api-types';
import { Bell, Search } from 'lucide-react';

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ACCOUNTANT: 'Contabil',
  EMPLOYEE: 'Angajat',
};

const roleVariants: Record<UserRole, 'default' | 'success' | 'warning' | 'info' | 'gray' | 'danger'> = {
  ADMIN: 'danger',
  MANAGER: 'default',
  ACCOUNTANT: 'success',
  EMPLOYEE: 'gray',
};

export function Header({ title }: { title: string }) {
  const { user } = useAuth();
  return (
    <header className="min-h-16 border-b border-slate-200 bg-white flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold text-slate-950 truncate tracking-tight">{title}</h1>
        <p className="hidden sm:block text-xs text-slate-500 mt-0.5">Control, verificare și raportare într-un singur loc</p>
      </div>
      {user && (
        <div className="hidden sm:flex items-center gap-3 min-w-0">
          <button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Caută">
            <Search size={17} />
          </button>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Notificări">
            <Bell size={17} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
          </button>
          <Badge variant={roleVariants[user.role]}>{roleLabels[user.role]}</Badge>
          <span className="text-sm text-slate-500 truncate">{user.email}</span>
        </div>
      )}
    </header>
  );
}
