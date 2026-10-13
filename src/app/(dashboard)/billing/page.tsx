'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import type {
  BillingStatus,
  BillingPlan,
  BillingInterval,
  SubscriptionStatus,
} from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { Check, CreditCard, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Probă',
  START: 'Start',
  BUSINESS: 'Business',
  SCALE: 'Scale',
  ENTERPRISE: 'Enterprise',
};

const STATUS_META: Record<SubscriptionStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'gray' }> = {
  active: { label: 'Activ', variant: 'success' },
  trialing: { label: 'Perioadă de probă', variant: 'warning' },
  past_due: { label: 'Plată restantă', variant: 'danger' },
  canceled: { label: 'Anulat', variant: 'gray' },
  unpaid: { label: 'Neachitat', variant: 'danger' },
  incomplete: { label: 'Incomplet', variant: 'warning' },
  incomplete_expired: { label: 'Expirat', variant: 'danger' },
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number | null }) {
  const pct = max != null && max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const near = max != null && used >= max;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-slate-950 font-medium tabular-nums">
          {used}
          {max != null ? ` / ${max}` : ' / nelimitat'}
        </span>
      </div>
      {max != null && (
        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={near ? 'h-full bg-red-500' : 'h-full bg-blue-600'}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [pendingTier, setPendingTier] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['billing', 'status'],
    queryFn: () => apiFetch<BillingStatus>('/api/billing/status'),
  });

  const { data: plans } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => apiFetch<BillingPlan[]>('/api/billing/plans'),
  });

  // Return from Stripe Checkout.
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast.success('Abonamentul a fost activat. Mulțumim!');
      refetch();
      router.replace('/billing');
    } else if (checkout === 'cancel') {
      toast.info('Plata a fost anulată.');
      router.replace('/billing');
    }
  }, [searchParams, refetch, router]);

  const checkoutMutation = useMutation({
    mutationFn: (tier: 'START' | 'BUSINESS' | 'SCALE') =>
      apiFetch<{ url: string }>('/api/billing/checkout-session', {
        method: 'POST',
        body: JSON.stringify({ tier, interval }),
      }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setPendingTier(null);
    },
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ url: string }>('/api/billing/portal-session', { method: 'POST' }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMeta = status ? STATUS_META[status.subscriptionStatus] : null;
  const trialDaysLeft =
    status?.subscriptionStatus === 'trialing' && status.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(status.trialEndsAt).getTime() - Date.now()) / 86_400_000))
      : null;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Abonament" />
      <div className="app-content space-y-6">
        {/* Current subscription */}
        {isLoading || !status ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="app-panel p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                <span className="text-lg font-bold text-slate-950">
                  Plan {PLAN_LABELS[status.planTier] ?? status.planTier}
                </span>
                {statusMeta && <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>}
                {status.cancelAtPeriodEnd && <Badge variant="warning">Se anulează la final de perioadă</Badge>}
              </div>
              {isAdmin && (
                <Button
                  variant="secondary"
                  onClick={() => portalMutation.mutate()}
                  isLoading={portalMutation.isPending}
                >
                  <ExternalLink size={16} /> Gestionează plata
                </Button>
              )}
            </div>

            {trialDaysLeft != null && (
              <p className="text-sm text-gray-500">
                {trialDaysLeft > 0
                  ? `Mai ai ${trialDaysLeft} ${trialDaysLeft === 1 ? 'zi' : 'zile'} din perioada de probă.`
                  : 'Perioada de probă s-a încheiat. Alege un plan pentru a continua.'}
              </p>
            )}
            {status.subscriptionStatus === 'active' && status.currentPeriodEnd && (
              <p className="text-sm text-gray-500">
                {status.cancelAtPeriodEnd
                  ? `Accesul rămâne activ până la ${formatDate(status.currentPeriodEnd)}.`
                  : `Se reînnoiește automat pe ${formatDate(status.currentPeriodEnd)}.`}
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-4 pt-1">
              <UsageBar label="Mașini și utilaje" used={status.usage.units} max={status.usage.maxUnits} />
              <UsageBar label="Utilizatori" used={status.usage.users} max={status.usage.maxUsers} />
            </div>
          </div>
        )}

        {/* Plan picker — ADMIN only */}
        {isAdmin ? (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-base font-semibold text-slate-950">Planuri disponibile</h3>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                {(['monthly', 'annual'] as BillingInterval[]).map((it) => (
                  <button
                    key={it}
                    onClick={() => setInterval(it)}
                    className={
                      'px-3 py-1.5 text-sm rounded-md transition-colors ' +
                      (interval === it ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50')
                    }
                  >
                    {it === 'monthly' ? 'Lunar' : 'Anual'}
                    {it === 'annual' && <span className="ml-1 text-xs opacity-80">(reducere)</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {(plans ?? []).map((plan) => {
                const isCurrent = status?.planTier === plan.tier;
                const price = plan.price ? plan.price[interval] : null;
                return (
                  <div
                    key={plan.tier}
                    className={
                      'app-panel p-5 flex flex-col ' +
                      (isCurrent ? 'ring-2 ring-blue-600' : '')
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-slate-950">
                        {PLAN_LABELS[plan.tier]}
                      </span>
                      {isCurrent && <Badge variant="info">Plan curent</Badge>}
                    </div>
                    <div className="mt-3">
                      {price != null ? (
                        <>
                          <span className="text-3xl font-black text-slate-950 tabular-nums">{price}</span>
                          <span className="text-gray-500 text-sm"> RON / lună{interval === 'annual' ? ', facturat anual' : ''}</span>
                        </>
                      ) : (
                        <span className="text-gray-500 text-sm">Preț la cerere</span>
                      )}
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-gray-600 flex-1">
                      <li className="flex items-center gap-2">
                        <Check size={15} className="text-blue-600" />
                        {plan.limits.maxUnits ?? '∞'} mașini și utilaje
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={15} className="text-blue-600" />
                        {plan.limits.maxUsers ?? '∞'} utilizatori
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={15} className="text-blue-600" />
                        Rapoarte, foi de parcurs, flotă
                      </li>
                    </ul>
                    <Button
                      className="mt-5 w-full justify-center"
                      disabled={!plan.available || isCurrent}
                      isLoading={checkoutMutation.isPending && pendingTier === plan.tier}
                      onClick={() => {
                        setPendingTier(plan.tier);
                        checkoutMutation.mutate(plan.tier);
                      }}
                    >
                      {isCurrent ? 'Plan activ' : !plan.available ? 'Indisponibil' : 'Alege planul'}
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400">
              Plata este procesată securizat de Stripe. Poți schimba sau anula planul oricând din „Gestionează plata".
            </p>
          </>
        ) : (
          <div className="app-panel p-5">
            <p className="text-sm text-gray-500">
              Abonamentul este gestionat de administratorul organizației. Contactează-l pentru modificări de plan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
