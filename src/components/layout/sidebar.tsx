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

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      icon: <LayoutDashboard size={18} />,
      label: t('dashboard'),
    },
    {
      href: '/deconturi',
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
    <aside className={clsx('w-64 min-h-screen bg-[#111111] border-r border-white/10 flex flex-col flex-shrink-0', className)}>
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <span className="text-xl font-bold text-white">Deconto</span>
        {user && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
          </p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
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
      <div className="p-3 border-t border-white/10 space-y-1">
        {user && (
          <div className="px-3 py-2">
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
            <p className="text-xs text-gray-600 capitalize">{user.role.toLowerCase()}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          {tAuth('logout')}
        </button>
      </div>
    </aside>
  );
}
