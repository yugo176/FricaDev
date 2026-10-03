import { useEffect, useMemo, useRef, useState } from 'react';
import { data, Form, Link, useSubmit } from 'react-router';
import { Compass, History, Search, SearchX, X } from 'lucide-react';
import {
  ACTIVITY_FILTERS,
  type ActivityDto,
  type ActivityFilter,
  type ActivitySummaryDto,
  type Page,
} from '@fricadev/shared';
import type { Route } from './+types/activity';
import { ActivityItem } from '~/components/activity-item';
import { InfiniteList, toQuery } from '~/components/infinite-list';
import {
  ButtonLink,
  EmptyState,
  PageContainer,
  PageHeader,
  PillLink,
  Skeleton,
} from '~/components/ui';
import { requireProfile } from '~/lib/api.server';
import { dateGroup } from '~/lib/dates';

export const meta = () => [
  { title: 'Mon activité · FricaDev' },
  { name: 'robots', content: 'noindex' },
];

const TABS: { id: ActivityFilter | null; label: string }[] = [
  { id: null, label: 'Tout' },
  { id: 'likes', label: 'J’aime' },
  { id: 'useful', label: 'Utile' },
  { id: 'comments', label: 'Commentaires' },
  { id: 'applications', label: 'Candidatures' },
  { id: 'posts', label: 'Mes publications' },
];

export async function loader({ request }: Route.LoaderArgs) {
  const api = await requireProfile(request);
  const url = new URL(request.url);
  const typeParam = url.searchParams.get('type');
  const type = (ACTIVITY_FILTERS as readonly string[]).includes(typeParam ?? '')
    ? (typeParam as ActivityFilter)
    : null;
  const q = url.searchParams.get('q')?.trim().slice(0, 80) ?? '';
  const query = toQuery({ type, q: q || null, limit: '20' });
  const [page, summary] = await Promise.all([
    api.call<Page<ActivityDto>>(`/v1/users/me/activity?${query}`),
    api.call<ActivitySummaryDto>('/v1/users/me/activity/summary'),
  ]);
  return data(
    { page, summary, type, q },
    { headers: { ...(await api.headers()), 'Cache-Control': 'private, no-store' } },
  );
}

const href = (type: ActivityFilter | null, q: string) => {
  const qs = toQuery({ type, q: q || null });
  return qs ? `/activite?${qs}` : '/activite';
};

/** Recherche dans les titres, envoyée 300 ms après la frappe. */
function SearchBox({ type, q }: { type: ActivityFilter | null; q: string }) {
  const submit = useSubmit();
  const form = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => setValue(q), [q]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function schedule(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (form.current) submit(form.current, { replace: true, preventScrollReset: true });
    }, 300);
  }

  return (
    <Form ref={form} method="get" role="search" onSubmit={() => clearTimeout(timer.current)}>
      {type && <input type="hidden" name="type" value={type} />}
      <label className="group flex h-11 items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-3.5 shadow-card transition focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/10 dark:border-stone-800 dark:bg-stone-900">
        <Search
          size={17}
          className="shrink-0 text-stone-400 group-focus-within:text-brand-600"
          aria-hidden
        />
        <input
          name="q"
          value={value}
          onChange={(e) => schedule(e.target.value)}
          maxLength={80}
          placeholder="Retrouver une publication (titre)…"
          aria-label="Retrouver une publication dans mon activité"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-stone-400 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {value && (
          <button
            type="button"
            onClick={() => schedule('')}
            aria-label="Effacer la recherche"
            className="rounded-md p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </label>
    </Form>
  );
}

/** Lignes regroupées par date : Aujourd'hui, Hier, Cette semaine… */
function ActivityList({ items }: { items: ActivityDto[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, ActivityDto[]>();
    for (const a of items) {
      const key = dateGroup(a.at);
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return [...map.entries()];
  }, [items]);
  return (
    <div className="card overflow-clip">
      {groups.map(([label, list]) => (
        <section key={label} aria-label={label}>
          <h2 className="border-b border-stone-100 bg-stone-50/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:border-stone-800 dark:bg-stone-950/40">
            {label}
          </h2>
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {list.map((a) => (
              <ActivityItem key={a.id} activity={a} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="card flex gap-3 px-4 py-3.5" aria-hidden>
      <Skeleton className="h-5 w-5 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
    </div>
  );
}

export default function Activity({ loaderData }: Route.ComponentProps) {
  const { page, summary, type, q } = loaderData;
  const total = Object.values(summary).reduce((n, v) => n + v, 0);
  const count = (id: ActivityFilter | null) => (id ? summary[id] : total);

  const empty = q ? (
    <EmptyState
      icon={<SearchX size={22} aria-hidden />}
      title={`Rien pour « ${q} »`}
      description="La recherche porte sur le titre des publications."
      action={
        <ButtonLink to={href(type, '')} variant="secondary">
          Effacer la recherche
        </ButtonLink>
      }
    />
  ) : (
    <EmptyState
      icon={<Compass size={22} aria-hidden />}
      title={type ? 'Rien dans cet onglet pour l’instant' : 'Pas encore d’activité'}
      description="Aime, réponds ou candidate : tu retrouveras ici tout ce que tu as croisé."
      action={<ButtonLink to="/">Explorer le fil</ButtonLink>}
    />
  );

  return (
    <PageContainer>
      <PageHeader
        icon={<History size={26} aria-hidden />}
        title="Mon activité"
        description="Tout ce que tu as aimé, commenté, publié ou rejoint, pour retrouver une publication en quelques secondes. Toi seul vois cette page."
      />
      <div className="space-y-4">
        <SearchBox type={type} q={q} />
        <nav
          aria-label="Filtrer mon activité"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5"
        >
          {TABS.map((tab) => (
            <PillLink key={tab.label} to={href(tab.id, q)} active={type === tab.id}>
              <span className="whitespace-nowrap">{tab.label}</span>
              <span className="tabular-nums opacity-60">{count(tab.id)}</span>
            </PillLink>
          ))}
        </nav>
        <InfiniteList
          initial={page}
          endpoint="/api/activity"
          params={{ type, q: q || null }}
          empty={empty}
          skeleton={<RowSkeleton />}
          endLabel="C’est tout pour ton activité"
          renderItems={(items) => <ActivityList items={items} />}
        />
        <p className="text-center text-xs text-stone-500">
          <Link to="/notifications" className="hover:text-brand-600 hover:underline">
            Ce que les autres ont fait sur tes publications est dans les notifications
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}
