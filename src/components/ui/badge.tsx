import { clsx } from 'clsx';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gray';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-blue-50 text-blue-700 border border-blue-100',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border border-amber-100',
  danger: 'bg-red-50 text-red-700 border border-red-100',
  info: 'bg-cyan-50 text-cyan-700 border border-cyan-100',
  gray: 'bg-slate-100 text-slate-600 border border-slate-200',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none', variants[variant], className)}>
      {children}
    </span>
  );
}
