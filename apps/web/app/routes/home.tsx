import { data, Link } from 'react-router';
import { Award, Compass, HelpCircle, Inbox, Users, X } from 'lucide-react';
import { POST_TYPES, type Page, type PostSummaryDto, type PostType } from '@fricadev/shared';
import type { Route } from './+types/home';
import { InfiniteFeed } from '~/components/infinite-feed';
import { QuickComposer } from '~/components/quick-composer';
import { ButtonLink, Card, CardTitle, EmptyState, PillLink, TabLinks } from '~/components/ui';
import { createApi } from '~/lib/api.server';
import { demoFeed } from '~/lib/demo-feed';
import { POST_TYPE_UI } from '~/lib/post-types';

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'FricaDev · Le réseau des développeurs africains' },
    {
      name: 'description',
      content:
        'Projets, questions, code et articles des développeurs de tout le continent africain.',
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const api = await createApi(request);
  const url = new URL(request.url);
  const typeParam = url.searchParams.get('type');
  const type = (POST_TYPES as readonly string[]).includes(typeParam ?? '')
    ? (typeParam as PostType)
    : null;
  const tag = url.searchParams.get('tag')?.trim().toLowerCase().replace(/^#/, '') || null;
  const cursor = url.searchParams.get('cursor');
  const scope = url.searchParams.get('scope') === 'following' && api.profile ? 'following' : null;

  const query = new URLSearchParams({ limit: '10' });
  if (type) query.set('type', type);
  if (tag) query.set('tag', tag);
  if (cursor) query.set('cursor', cursor);

  let page: Page<PostSummaryDto>;
  let offline = false;
  try {
    page = await api.call<Page<PostSummaryDto>>(`/v1/posts${scope ? '/following' : ''}?${query}`);
  } catch {
    // API injoignable : on affiche un aperçu plutôt qu'une page cassée.
    page = { items: demoFeed, nextCursor: null };
    offline = true;
  }

  return data(
    {
      page,
      type,
      tag,
      scope,
      offline,
      hasProfile: Boolean(api.profile),
      displayName: api.profile?.displayName ?? null,
    },
    { headers: await api.headers() },
  );
}

function href(params: { scope?: string | null; type?: PostType | null; tag?: string | null }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const qs = query.toString();
  return qs ? `/?${qs}` : '/';
}

function Welcome() {
  return (
    <Card padding="lg" className="overflow-hidden">
      <div className="relative">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-brand-600">
          Pour les devs, par les devs
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          Le réseau des développeurs africains
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-stone-600 dark:text-stone-400">
          Pose tes questions, partage ton code et tes projets, trouve des coéquipiers dans 25 pays.
          Chaque aide utile te fait gagner en réputation.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink to="/auth/login?returnTo=/new">Rejoindre FricaDev</ButtonLink>
          <ButtonLink
            to="/c"
            variant="secondary"
            size="md"
            icon={<Compass size={16} aria-hidden />}
          >
            Explorer les communautés
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { page, type, tag, scope, offline, hasProfile, displayName } = loaderData;
  const publishHref = hasProfile ? '/new' : '/auth/login?returnTo=/new';

  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-up px-4 pb-16 pt-5 sm:pt-8">
      {offline && (
        <p className="mb-4 rounded-xl border border-ocre-50 bg-ocre-50 px-4 py-2.5 text-sm text-ocre-800">
          Le service est momentanément indisponible : aperçu avec des publications de démonstration.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0 space-y-4">
          {!hasProfile && <Welcome />}
          {hasProfile && displayName && <QuickComposer firstName={displayName.split(' ')[0]!} />}

          {hasProfile && (
            <TabLinks
              tabs={[
                { label: 'Pour toi', to: href({ type, tag }), active: !scope },
                {
                  label: 'Abonnements',
                  to: href({ scope: 'following', type, tag }),
                  active: scope === 'following',
                },
              ]}
            />
          )}

          <nav className="flex flex-wrap items-center gap-2" aria-label="Filtres du fil">
            <PillLink to={href({ scope, tag })} active={type === null}>
              Tout
            </PillLink>
            {(['QUESTION', 'PROJECT', 'CODE', 'ARTICLE'] as const).map((value) => (
              <PillLink key={value} to={href({ scope, type: value, tag })} active={type === value}>
                {POST_TYPE_UI[value].plural}
              </PillLink>
            ))}
            {tag && (
              <Link
                to={href({ scope, type })}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-50 px-3 text-[13px] font-medium text-brand-800 dark:bg-brand-800/30 dark:text-brand-100"
              >
                #{tag} <X size={13} aria-label="Retirer le filtre" />
              </Link>
            )}
          </nav>

          <InfiniteFeed
            initial={page}
            params={{ scope, type, tag }}
            linkable={!offline}
            empty={
              scope ? (
                <EmptyState
                  icon={<Users size={22} aria-hidden />}
                  title="Ton fil d’abonnements est vide"
                  description="Suis des devs et rejoins des communautés pour voir leurs publications ici."
                  action={<ButtonLink to="/c">Découvrir les communautés</ButtonLink>}
                />
              ) : (
                <EmptyState
                  icon={<Inbox size={22} aria-hidden />}
                  title={tag || type ? 'Rien ne correspond à ce filtre' : 'Le fil est encore vide'}
                  description="Lance la conversation : pose une question ou présente ton projet."
                  action={<ButtonLink to={publishHref}>Publier</ButtonLink>}
                />
              )
            }
          />
        </main>

        <aside className="hidden space-y-4 lg:block">
          <div className="sticky top-24 space-y-4">
            <Card>
              <CardTitle>Une question ?</CardTitle>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Des devs qui ont déjà résolu le même problème te répondent, souvent en quelques
                heures.
              </p>
              <ButtonLink
                to={hasProfile ? '/new?type=QUESTION' : '/auth/login?returnTo=/new'}
                className="mt-4 w-full"
                icon={<HelpCircle size={16} aria-hidden />}
              >
                Poser une question
              </ButtonLink>
            </Card>
            <Card>
              <CardTitle
                action={
                  <Link to="/c" className="text-xs font-medium text-brand-600 hover:underline">
                    Tout voir
                  </Link>
                }
              >
                Communautés
              </CardTitle>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Rejoins les devs de ton pays et de tes technologies.
              </p>
            </Card>
            <Card>
              <CardTitle>
                <span className="inline-flex items-center gap-1.5">
                  <Award size={15} className="text-ocre-400" aria-hidden /> Réputation
                </span>
              </CardTitle>
              <dl className="space-y-2 text-sm">
                {[
                  ['Réponse acceptée', '+15'],
                  ['Réponse jugée utile', '+5'],
                  ['Publication jugée utile', '+5'],
                  ['Publication aimée', '+2'],
                ].map(([label, points]) => (
                  <div key={label} className="flex justify-between">
                    <dt className="text-stone-600 dark:text-stone-400">{label}</dt>
                    <dd className="font-semibold tabular-nums text-brand-600">{points}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}

export { keepPageOnReaction as shouldRevalidate } from '~/lib/revalidate';
