'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, LogOut, UserRound, Save } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiFetch } from '@/lib/api-client';
import type { User } from '@/lib/api-types';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { clsx } from 'clsx';

function displayName(user: Pick<User, 'firstName' | 'lastName' | 'email'>) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email;
}

export function UserMenu() {
  const { user, updateUser, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '' });
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

  const profileMutation = useMutation({
    mutationFn: () =>
      apiFetch<User>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: form.firstName.trim() || null,
          lastName: form.lastName.trim() || null,
        }),
      }),
    onSuccess: (updated) => {
      toast.success('Nume actualizat');
      updateUser({ firstName: updated.firstName, lastName: updated.lastName });
      setProfileOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!user) return null;

  function openProfile() {
    setForm({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' });
    setOpen(false);
    setProfileOpen(true);
  }

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
            <button
              onClick={openProfile}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <UserRound size={16} className="text-slate-400" /> Editează profilul
            </button>
            <button
              onClick={() => void logout()}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={16} /> Deconectare
            </button>
          </div>
        </div>
      )}

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="Editează profilul" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Schimbă-ți numele afișat în aplicație și folosit pe documente.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Prenume"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="Prenume"
            />
            <Input
              label="Nume"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Nume"
            />
          </div>
          <Input label="Email" value={user.email} disabled />
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => setProfileOpen(false)}>
              Anulează
            </Button>
            <Button onClick={() => profileMutation.mutate()} isLoading={profileMutation.isPending}>
              <Save size={16} /> Salvează
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
