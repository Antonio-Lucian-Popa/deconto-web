import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { User } from '@/lib/api-types';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<User[]>('/api/users/'),
    staleTime: 5 * 60 * 1000,
  });
}

export function userDisplayName(user: Pick<User, 'firstName' | 'lastName' | 'email'>) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.email;
}
