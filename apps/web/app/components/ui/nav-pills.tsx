import { Link } from 'react-router';
import { cn } from './cn';

/** Filtre en forme de pastille (type de publication, tag…). */
export function PillLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      preventScrollReset
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-8 items-center gap-1 rounded-full px-3.5 text-[13px] font-medium transition',
        active
          ? 'bg-stone-900 text-white shadow-card dark:bg-white dark:text-stone-900'
          : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-white',
      )}
    >
      {children}
    </Link>
  );
}

/** Onglets soulignés (« Pour toi » / « Abonnements »…). */
export function TabLinks({ tabs }: { tabs: { label: string; to: string; active: boolean }[] }) {
  return (
    <div className="flex gap-6 border-b border-stone-200 dark:border-stone-800" role="tablist">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          to={tab.to}
          role="tab"
          aria-selected={tab.active}
          className={cn(
            '-mb-px border-b-2 pb-2.5 text-sm transition',
            tab.active
              ? 'border-brand-600 font-semibold text-stone-900 dark:text-white'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
