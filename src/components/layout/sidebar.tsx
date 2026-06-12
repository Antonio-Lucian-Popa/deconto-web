'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Trip, UserRole } from '@/lib/api-types';
import {
  LayoutDashboard, FileText, Receipt, BarChart3,
  Car, Users, Settings, LogOut, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  roles?: UserRole[];
  badge?: number;
}

export function Sidebar() {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const { data: submittedTrips } = useQuery({
    queryKey: ['trips', 'submitted'],
    queryFn: () => apiFetch<Trip[]>('/api/trips?status=SUBMITTED'),
    enabled: user?.role === 'ADMIN' || user?.role === 'MANAGER',
  });

  const navItems: NavItem[] = [
    { href: '/dashboard', icon: <LayoutDashboard size={18} />, label: t('dashboard') },
    {
      href: '/deconturi',
      icon: <FileText size={18} />,
      label: t('deconturi'),
      badge: submittedTrips?.length,
    },
    { href: '/cheltuieli', icon: <Receipt size={18} />, label: t('cheltuieli') },
    { href: '/rapoarte', icon: <BarChart3 size={18} />, label: t('rapoarte') },
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
    <aside className="w-64 min-h-screen bg-[#111111] border-r border-white/10 flex flex-col">
      <div className="p-5 border-b border-white/10">
        <span className="text-xl font-bold text-white">Deconto</span>
        {user && (
          <p className="text-xs text-gray-500 mt-1">{user.firstName ?? user.email}</p>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {filteredItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={14} className="opacity-50" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
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
