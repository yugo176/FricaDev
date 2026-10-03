import { useEffect, useRef, useState } from 'react';
import { Form, Link, useSubmit } from 'react-router';
import { CalendarDays, FileText, Search, X } from 'lucide-react';
import { cn } from '../ui';
import { apiParams, inboxHref, type InboxFilters } from './filters';

function Segmented({
  items,
  label,
}: {
  label: string;
  items: { to: string; active: boolean; children: React.ReactNode; title?: string }[];
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-10 shrink-0 rounded-xl border border-stone-200 bg-white p-1 shadow-card dark:border-stone-800 dark:bg-stone-900"
    >
      {items.map((item, i) => (
        <Link
          key={i}
          to={item.to}
          title={item.title}
          preventScrollReset
          aria-current={item.active ? 'true' : undefined}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition',
            item.active
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white',
          )}
        >
          {item.children}
        </Link>
      ))}
    </div>
  );
}

/** Toutes / Non lues, recherche (envoyée 300 ms après la frappe) et regroupement. */
export function NotificationsToolbar({ filters }: { filters: InboxFilters }) {
  const submit = useSubmit();
  const form = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Navigation (précédent/suivant, autre filtre) : le champ suit l'URL.
  useEffect(() => setQ(filters.q), [filters.q]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function schedule(value: string) {
    setQ(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (form.current) submit(form.current, { replace: true, preventScrollReset: true });
    }, 300);
  }

  const hidden = {
    ...apiParams(filters),
    q: null,
    group: filters.group === 'post' ? 'post' : null,
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        label="Lecture"
        items={[
          {
            to: inboxHref(filters, { unread: false }),
            active: !filters.unread,
            children: 'Toutes',
          },
          {
            to: inboxHref(filters, { unread: true }),
            active: filters.unread,
            children: 'Non lues',
          },
        ]}
      />

      <Form
        ref={form}
        method="get"
        role="search"
        className="order-last w-full sm:order-none sm:w-auto sm:flex-1"
        onSubmit={() => clearTimeout(timer.current)}
      >
        {Object.entries(hidden).map(([key, value]) =>
          value ? <input key={key} type="hidden" name={key} value={value} /> : null,
        )}
        <label className="group flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 shadow-card transition focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/10 dark:border-stone-800 dark:bg-stone-900">
          <Search
            size={16}
            className="shrink-0 text-stone-400 group-focus-within:text-brand-600"
            aria-hidden
          />
          <input
            name="q"
            value={q}
            onChange={(e) => schedule(e.target.value)}
            maxLength={80}
            placeholder="Chercher une personne, une publication…"
            aria-label="Chercher dans les notifications"
            className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {q && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => schedule('')}
              className="rounded-md p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X size={15} aria-hidden />
            </button>
          )}
        </label>
      </Form>

      <Segmented
        label="Regrouper par"
        items={[
          {
            to: inboxHref(filters, { group: 'date' }),
            active: filters.group === 'date',
            title: 'Regrouper par date',
            children: (
              <>
                <CalendarDays size={14} aria-hidden />{' '}
                <span className="hidden sm:inline">Date</span>
              </>
            ),
          },
          {
            to: inboxHref(filters, { group: 'post' }),
            active: filters.group === 'post',
            title: 'Regrouper par publication',
            children: (
              <>
                <FileText size={14} aria-hidden />{' '}
                <span className="hidden sm:inline">Publication</span>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
