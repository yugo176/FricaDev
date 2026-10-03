import { cn } from './cn';

export type BadgeTone = 'neutral' | 'brand' | 'ocre' | 'indigo' | 'terre' | 'danger';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  brand: 'bg-brand-50 text-brand-800 dark:bg-brand-800/30 dark:text-brand-100',
  ocre: 'bg-ocre-50 text-ocre-800 dark:bg-ocre-800/30 dark:text-ocre-50',
  indigo: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-800/30 dark:text-indigo-50',
  terre: 'bg-terre-50 text-terre-800 dark:bg-terre-800/30 dark:text-terre-50',
  danger: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300',
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONE[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
