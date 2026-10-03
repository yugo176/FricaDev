import { useMemo, useState } from 'react';
import { data } from 'react-router';
import { Search, SearchX, Sparkles, Users, X } from 'lucide-react';
import type { CommunityDto } from '@fricadev/shared';
import type { Route } from './+types/communities';
import { CommunityCard } from '~/components/community-card';
import { usePendingMemberships } from '~/components/join-button';
import {
  Button,
  EmptyState,
  PageContainer,
  PageHeader,
  PillLink,
  SectionTitle,
} from '~/components/ui';
import { createApi } from '~/lib/api.server';
import { matchesCommunity, sortCommunities } from '~/lib/community-ui';

export const meta = () => [
  { title: 'Communautés · FricaDev' },
  { name: 'description', content: 'Les communautés de développeurs par pays et par technologie.' },
];

const TABS = [
  { id: 'all', label: 'Tout' },
  { id: 'tech', label: 'Technologies' },
  { id: 'pays', label: 'Pays' },
  { id: 'mine', label: 'Mes communautés' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export async function loader({ request }: Route.LoaderArgs) {
  const api = await createApi(request);
  const tabParam = new URL(request.url).searchParams.get('tab');
  const communities = await api.call<CommunityDto[]>('/v1/communities');
  return data(
    {
      communities,
      tab: (TABS.some((t) => t.id === tabParam) ? tabParam : 'all') as Tab,
      hasProfile: Boolean(api.profile),
      countryCode: api.profile?.countryCode ?? null,
    },
    { headers: await api.headers() },
  );
}

function Grid({ compact, children }: { compact?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={
        compact
          ? 'grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
      }
    >
      {children}
    </div>
  );
}

export default function Communities({ loaderData }: Route.ComponentProps) {
  const { communities, tab, hasProfile, countryCode } = loaderData;
  const [query, setQuery] = useState('');

  const pending = usePendingMemberships();
  const sorted = useMemo(() => sortCommunities(communities), [communities]);
  const isMember = (c: CommunityDto) => pending.get(c.slug) ?? Boolean(c.viewer?.isMember);
  const tech = sorted.filter((c) => c.type === 'TECH');
  const countries = sorted.filter((c) => c.type === 'COUNTRY');
  const mine = sorted.filter(isMember);
  const counts: Record<Tab, number> = {
    all: sorted.length,
    tech: tech.length,
    pays: countries.length,
    mine: mine.length,
  };

  const visible = (list: CommunityDto[]) => list.filter((c) => matchesCommunity(c, query));
  const sections =
    tab === 'mine'
      ? [{ title: null, items: visible(mine), compact: false }]
      : [
          ...(tab !== 'pays'
            ? [{ title: 'Technologies', items: visible(tech), compact: false }]
            : []),
          ...(tab !== 'tech' ? [{ title: 'Pays', items: visible(countries), compact: true }] : []),
        ];
  const total = sections.reduce((n, s) => n + s.items.length, 0);

  const suggestion =
    !query && tab === 'all' && countryCode
      ? communities.find(
          (c) => c.type === 'COUNTRY' && c.countryCode === countryCode && !c.viewer?.isMember,
        )
      : undefined;

  return (
    <PageContainer size="lg">
      <PageHeader
        icon={<Users size={26} aria-hidden />}
        title="Communautés"
        description="Rejoins les devs de ton pays et de tes technologies : leurs publications apparaîtront dans ton fil Abonnements."
      />

      <div className="sticky top-16 z-[15] -mx-4 space-y-3 bg-stone-50/90 px-4 pb-3 pt-1 backdrop-blur-md dark:bg-stone-950/90">
        <label className="group flex h-11 items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-3.5 shadow-card transition focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/10 dark:border-stone-800 dark:bg-stone-900">
          <Search
            size={18}
            className="text-stone-400 group-focus-within:text-brand-600"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-[15px] outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-stone-400 [&::-webkit-search-cancel-button]:hidden"
            placeholder="Chercher une communauté (ex. Sénégal, React, paiement)…"
            aria-label="Chercher une communauté"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Effacer la recherche"
              className="rounded-md p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </label>
        <nav
          aria-label="Filtrer les communautés"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5"
        >
          {TABS.filter((t) => t.id !== 'mine' || hasProfile).map((t) => (
            <PillLink
              key={t.id}
              to={t.id === 'all' ? '/c' : `/c?tab=${t.id}`}
              active={tab === t.id}
            >
              <span className="whitespace-nowrap">{t.label}</span>
              <span className="tabular-nums opacity-60">{counts[t.id]}</span>
            </PillLink>
          ))}
        </nav>
      </div>

      {suggestion && (
        <div className="mt-4">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-600">
            <Sparkles size={14} aria-hidden /> Suggéré pour toi : ton pays
          </p>
          <CommunityCard community={suggestion} hasProfile={hasProfile} compact />
        </div>
      )}

      {total === 0 ? (
        <div className="mt-6">
          {tab === 'mine' && !query ? (
            <EmptyState
              icon={<Users size={22} aria-hidden />}
              title="Tu n’as rejoint aucune communauté"
              description="Rejoins celles de ton pays et de tes technologies pour remplir ton fil Abonnements."
            />
          ) : (
            <EmptyState
              icon={<SearchX size={22} aria-hidden />}
              title={`Aucune communauté pour « ${query} »`}
              description="Essaie un nom de pays ou de technologie."
              action={
                <Button variant="secondary" onClick={() => setQuery('')}>
                  Effacer la recherche
                </Button>
              }
            />
          )}
        </div>
      ) : (
        sections
          .filter((s) => s.items.length > 0)
          .map((s) => (
            <section key={s.title ?? 'mine'}>
              {s.title ? (
                <SectionTitle>
                  {s.title} <span className="font-normal text-stone-400">· {s.items.length}</span>
                </SectionTitle>
              ) : (
                <div className="h-4" />
              )}
              <Grid compact={s.compact}>
                {s.items.map((c) => (
                  <CommunityCard
                    key={c.id}
                    community={c}
                    hasProfile={hasProfile}
                    compact={s.compact}
                  />
                ))}
              </Grid>
            </section>
          ))
      )}
    </PageContainer>
  );
}
