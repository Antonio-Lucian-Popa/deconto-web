'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Trip, UserRole } from '@/lib/api-types';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  BarChart3,
  Car,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  Gift,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  roles?: UserRole[];
  badge?: number;
}

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Fetch pending (SUBMITTED) trips for badge — only ADMIN/MANAGER
  const { data: submittedTrips } = useQuery({
    queryKey: ['trips', 'submitted-badge'],
    queryFn: () => apiFetch<Trip[]>('/api/trips?status=SUBMITTED'),
    enabled: user?.role === 'ADMIN' || user?.role === 'MANAGER',
    refetchInterval: 60_000, // refresh every minute
  });

  const pendingCount = submittedTrips?.length ?? 0;
  const tripsHref = pendingCount > 0 ? '/deconturi?status=SUBMITTED' : '/deconturi';

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      icon: <LayoutDashboard size={18} />,
      label: t('dashboard'),
    },
    {
      href: tripsHref,
      icon: <FileText size={18} />,
      label: t('deconturi'),
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      href: '/cheltuieli',
      icon: <Receipt size={18} />,
      label: t('cheltuieli'),
    },
    {
      href: '/rapoarte',
      icon: <BarChart3 size={18} />,
      label: t('rapoarte'),
    },
    {
      href: '/flota',
      icon: <Car size={18} />,
      label: t('flota'),
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
    },
    {
      href: '/echipa',
      icon: <Users size={18} />,
      label: t('echipa'),
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      href: '/setari',
      icon: <Settings size={18} />,
      label: t('setari'),
      roles: ['ADMIN'],
    },
  ];

  const filteredItems = navItems.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role))
  );

  return (
    <aside className={clsx('w-64 min-h-screen bg-[#242424] text-white flex flex-col flex-shrink-0', className)}>
      {/* Logo */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-sm font-black text-white">D</span>
          </div>
          <div className="min-w-0">
            <span className="text-base font-bold text-white tracking-tight">Deconto</span>
            <p className="text-[11px] text-zinc-500 -mt-0.5">Expense ops</p>
          </div>
        </div>
        {user && (
          <p className="text-[11px] text-zinc-500 mt-6 mb-2">Main menu</p>
        )}
        {user && (
          <p className="sr-only">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
          </p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-3 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const itemPathname = item.href.split('?')[0];
          const isActive =
            pathname === itemPathname || pathname.startsWith(`${itemPathname}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border border-transparent',
                isActive
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge != null && (
                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
              {isActive && !item.badge && (
                <ChevronRight size={14} className="opacity-40" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="p-3 space-y-3">
        <div className="rounded-lg bg-zinc-700/70 p-4 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white">
            <Gift size={18} />
          </div>
          <p className="text-sm font-semibold text-white">Plan companie</p>
          <p className="mt-1 text-[11px] leading-4 text-zinc-400">
            Rapoarte, flotă și aprobări într-un dashboard.
          </p>
        </div>
        {user && (
          <div className="px-3 py-2 rounded-lg bg-zinc-800">
            <p className="text-xs text-zinc-300 truncate">{user.email}</p>
            <p className="text-[11px] text-zinc-500 capitalize">{user.role.toLowerCase()}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          {tAuth('logout')}
        </button>
      </div>
    </aside>
  );
}
