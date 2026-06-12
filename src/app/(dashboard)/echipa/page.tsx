'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import type { User, UserRole } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Plus, Users, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { userDisplayName } from '@/hooks/use-users';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ACCOUNTANT: 'Contabil',
  EMPLOYEE: 'Angajat',
};
const ROLE_VARIANTS: Record<UserRole, 'danger' | 'default' | 'success' | 'gray'> = {
  ADMIN: 'danger',
  MANAGER: 'default',
  ACCOUNTANT: 'success',
  EMPLOYEE: 'gray',
};

interface InviteResult {
  user: User;
  temporaryPassword: string;
}

export default function EchipaPage() {
  const t = useTranslations('team');
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<'MANAGER' | 'ACCOUNTANT' | 'EMPLOYEE'>('EMPLOYEE');
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [copiedPwd, setCopiedPwd] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<User[]>('/api/users/'),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      apiFetch<InviteResult>('/api/users/invite', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          firstName: inviteFirstName || undefined,
          lastName: inviteLastName || undefined,
          role: inviteRole,
        }),
      }),
    onSuccess: (data) => {
      toast.success('Utilizator invitat cu succes');
      setInviteResult(data);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleCloseInvite() {
    setShowInvite(false);
    setInviteResult(null);
    setInviteEmail('');
    setInviteFirstName('');
    setInviteLastName('');
    setInviteRole('EMPLOYEE');
    setCopiedPwd(false);
  }

  async function copyPassword(pwd: string) {
    await navigator.clipboard.writeText(pwd);
    setCopiedPwd(true);
    setTimeout(() => setCopiedPwd(false), 2000);
  }

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="flex-1 p-6 space-y-6">
        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Users size={16} />
            {!isLoading && (
              <span>
                <span className="text-white font-semibold">{users?.length ?? 0}</span> utilizatori
              </span>
            )}
          </div>
          {isAdmin && (
            <Button onClick={() => setShowInvite(true)}>
              <Plus size={16} /> {t('inviteUser')}
            </Button>
          )}
        </div>

        {/* Users table */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Utilizator', t('role'), t('status'), 'Înregistrat'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {[1, 2, 3, 4].map((j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-12 text-sm">
                      Nu există utilizatori
                    </td>
                  </tr>
                ) : (
                  users?.map((u) => (
                    <tr
                      key={u.id}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        u.id === currentUser?.id ? 'bg-blue-600/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-medium">
                              {(u.firstName ?? u.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">
                              {userDisplayName(u)}
                              {u.id === currentUser?.id && (
                                <span className="ml-2 text-xs text-blue-400">(tu)</span>
                              )}
                            </p>
                            <p className="text-gray-400 text-xs">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ROLE_VARIANTS[u.role]}>
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.isActive !== false ? 'success' : 'danger'}>
                          {u.isActive !== false ? t('active') : t('inactive')}
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

      {/* Invite modal */}
      <Modal
        open={showInvite}
        onClose={handleCloseInvite}
        title={inviteResult ? 'Utilizator creat' : t('inviteUser')}
        size="sm"
      >
        {inviteResult ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm font-medium mb-1">Utilizator creat cu succes!</p>
              <p className="text-gray-400 text-sm">
                {userDisplayName(inviteResult.user)} ({inviteResult.user.email})
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Parolă temporară
              </label>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-[#262626] border border-white/10 rounded-lg text-white text-sm font-mono">
                  {inviteResult.temporaryPassword}
                </code>
                <button
                  onClick={() => copyPassword(inviteResult.temporaryPassword)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
                  title="Copiază"
                >
                  {copiedPwd ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-yellow-400 text-xs mt-2">
                ⚠️ Salvează această parolă — nu o vei mai putea vedea.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCloseInvite}>Închide</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prenume"
                value={inviteFirstName}
                onChange={(e) => setInviteFirstName(e.target.value)}
                placeholder="Ion"
              />
              <Input
                label="Nume"
                value={inviteLastName}
                onChange={(e) => setInviteLastName(e.target.value)}
                placeholder="Popescu"
              />
            </div>
            <Input
              label="Email *"
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
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={handleCloseInvite}>Anulează</Button>
              <Button
                onClick={() => inviteMutation.mutate()}
                isLoading={inviteMutation.isPending}
                disabled={!inviteEmail.trim()}
              >
                Invită utilizator
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
