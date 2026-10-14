'use client';

import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/lib/api-types';
import { Notifications } from '@/components/layout/notifications';
import { UserMenu } from '@/components/layout/user-menu';

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
    <header className="flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl">{title}</h1>
        <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">Control, verificare și raportare într-un singur loc</p>
      </div>
      {user && (
        <div className="flex items-center gap-2 min-w-0 sm:gap-3">
          <Notifications />
          <Badge variant={roleVariants[user.role]} className="hidden sm:inline-flex">{roleLabels[user.role]}</Badge>
          <UserMenu />
        </div>
      )}
    </header>
  );
}
