'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import type { User } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', MANAGER: 'Manager', ACCOUNTANT: 'Contabil', EMPLOYEE: 'Angajat',
};
const ROLE_VARIANTS: Record<string, 'danger' | 'default' | 'success' | 'gray'> = {
  ADMIN: 'danger', MANAGER: 'default', ACCOUNTANT: 'success', EMPLOYEE: 'gray',
};

export default function EchipaPage() {
  const t = useTranslations('team');
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MANAGER' | 'ACCOUNTANT' | 'EMPLOYEE'>('EMPLOYEE');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<User[]>('/api/users/'),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      }),
    onSuccess: () => {
      toast.success('Utilizator invitat');
      setShowInvite(false);
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="flex-1 p-6 space-y-6">
        {currentUser?.role === 'ADMIN' && (
          <div className="flex justify-end">
            <Button onClick={() => setShowInvite(true)}>
              <Plus size={16} /> {t('inviteUser')}
            </Button>
          </div>
        )}

        {showInvite && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{t('inviteUser')}</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Input
                label="Email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@companie.ro"
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">{t('role')}</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                  className="w-full px-3 py-2 bg-[#262626] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EMPLOYEE">Angajat</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ACCOUNTANT">Contabil</option>
                </select>
              </div>
              <Button
                onClick={() => inviteMutation.mutate()}
                isLoading={inviteMutation.isPending}
                disabled={!inviteEmail.trim()}
              >
                Invită
              </Button>
            </div>
          </div>
        )}

        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Utilizator', t('role'), t('status'), 'Înregistrat'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : (
                  users?.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <p className="text-white text-sm">
                          {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                        </p>
                        <p className="text-gray-400 text-xs">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ROLE_VARIANTS[u.role] ?? 'gray'}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.isActive ? 'success' : 'danger'}>
                          {u.isActive ? t('active') : t('inactive')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {new Intl.DateTimeFormat('ro-RO').format(new Date(u.createdAt))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
