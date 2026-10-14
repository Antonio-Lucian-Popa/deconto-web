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
  CreditCard,
  Tractor,
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
      href: '/utilaje',
      icon: <Tractor size={18} />,
      label: t('utilaje'),
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
    },
    {
      href: '/echipa',
      icon: <Users size={18} />,
      label: t('echipa'),
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      href: '/billing',
      icon: <CreditCard size={18} />,
      label: t('abonament'),
      roles: ['ADMIN'],
    },
    {
      href: '/setari',
      icon: <Settings size={18} />,
      label: t('setari'),
    },
  ];

  const filteredItems = navItems.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role))
  );

  return (
    <aside className={clsx('min-h-screen w-[272px] flex-shrink-0 flex-col border-r border-slate-800/80 bg-gradient-to-b from-[#111c3b] via-[#142249] to-[#101a36] text-white shadow-[12px_0_40px_rgba(15,23,42,0.08)]', className)}>
      {/* Logo */}
      <div className="p-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-950/30">
            <span className="text-base font-black text-white">D</span>
          </div>
          <div className="min-w-0">
            <span className="text-base font-bold tracking-tight text-white">Deconto</span>
            <p className="-mt-0.5 text-[11px] text-blue-200/55">Expense operations</p>
          </div>
        </div>
        {user && (
          <p className="mb-2 mt-7 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200/40">Meniu principal</p>
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
              prefetch={false}
              onClick={onNavigate}
              className={clsx(
                'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'border-blue-400/20 bg-blue-500/20 text-white shadow-inner shadow-blue-400/5'
                  : 'border-transparent text-blue-100/65 hover:bg-white/[0.07] hover:text-white'
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge != null && (
                <span className="min-w-[22px] rounded-full bg-blue-500 px-1.5 py-0.5 text-center text-xs text-white shadow-sm">
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
        {user?.role === 'ADMIN' && (
          <Link
            href="/billing"
            prefetch={false}
            onClick={onNavigate}
            className="block rounded-2xl border border-blue-300/10 bg-white/[0.07] p-4 text-center transition-all hover:border-blue-300/20 hover:bg-white/[0.1]"
          >
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200">
              <CreditCard size={18} />
            </div>
            <p className="text-sm font-semibold text-white">Abonament</p>
            <p className="mt-1 text-[11px] leading-4 text-blue-100/50">
              Gestionează planul și plata companiei.
            </p>
          </Link>
        )}
        {user && (
          <div className="rounded-xl border border-white/5 bg-black/10 px-3 py-2.5">
            <p className="truncate text-xs font-medium text-blue-50">{user.email}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-200/45">{user.role.toLowerCase()}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-blue-100/60 transition-colors hover:bg-red-500/10 hover:text-red-200"
        >
          <LogOut size={18} />
          {tAuth('logout')}
        </button>
      </div>
    </aside>
  );
}
