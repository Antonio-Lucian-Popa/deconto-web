'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/lib/api-types';
import { clsx } from 'clsx';

function displayName(user: Pick<User, 'firstName' | 'lastName' | 'email'>) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email;
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.firstName?.[0] || user.email[0]).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 transition-colors',
          open ? 'bg-slate-100' : 'hover:bg-slate-50'
        )}
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-[#fff]">
          {initial}
        </span>
        <span className="hidden max-w-[200px] truncate text-sm font-medium text-slate-700 sm:block">
          {displayName(user)}
        </span>
        <ChevronDown size={15} className={clsx('text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{displayName(user)}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="p-1.5">
            <Link
              href="/setari"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Settings size={16} className="text-slate-400" /> Setări
            </Link>
            <button
              onClick={() => void logout()}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={16} /> Deconectare
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
