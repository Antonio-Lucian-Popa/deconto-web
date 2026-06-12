'use client';

import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/lib/api-types';

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
    <header className="h-14 border-b border-white/10 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      {user && (
        <div className="flex items-center gap-3">
          <Badge variant={roleVariants[user.role]}>{roleLabels[user.role]}</Badge>
          <span className="text-sm text-gray-400">{user.email}</span>
        </div>
      )}
    </header>
  );
}
