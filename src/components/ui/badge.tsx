import { clsx } from 'clsx';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gray';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: 'border-blue-200 bg-blue-50 text-blue-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  gray: 'border-slate-200 bg-slate-100 text-slate-600',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none', variants[variant], className)}>
      {children}
    </span>
  );
}
