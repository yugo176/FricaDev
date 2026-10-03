import { data, Link } from 'react-router';
import { ArrowRight, Handshake, Search, X } from 'lucide-react';
import {
  COMMITMENT_LABELS,
  COMMITMENTS,
  type Commitment,
  type OpeningDto,
  type Page,
} from '@fricadev/shared';
import type { Route } from './+types/teammates';
import { InfiniteList } from '~/components/infinite-list';
import { OpeningCard } from '~/components/opening-card';
import {
  ButtonLink,
  EmptyState,
  Input,
  PageContainer,
  PageHeader,
  PillLink,
} from '~/components/ui';
import { createApi } from '~/lib/api.server';

export const meta = () => [
  { title: 'Coéquipiers · FricaDev' },
  {
    name: 'description',
    content:
      'Rejoins un projet de développeurs africains : postes ouverts, compétences recherchées.',
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const api = await createApi(request);
  const url = new URL(request.url);
  const commitmentParam = url.searchParams.get('commitment');
  const commitment = (COMMITMENTS as readonly string[]).includes(commitmentParam ?? '')
    ? (commitmentParam as Commitment)
    : null;
  const skill = url.searchParams.get('skill')?.trim().toLowerCase().replace(/^#/, '') || null;
  const query = new URLSearchParams({ limit: '10' });
  if (commitment) query.set('commitment', commitment);
  if (skill) query.set('skill', skill);
  const page = await api.call<Page<OpeningDto>>(`/v1/openings?${query}`);
  return data(
    { page, commitment, skill, hasProfile: Boolean(api.profile) },
    { headers: await api.headers() },
  );
}

function href(params: { commitment?: string | null; skill?: string | null }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const qs = query.toString();
  return qs ? `/coequipiers?${qs}` : '/coequipiers';
}

export default function Teammates({ loaderData }: Route.ComponentProps) {
  const { page, commitment, skill, hasProfile } = loaderData;

  return (
    <PageContainer>
      <PageHeader
        icon={<Handshake size={26} aria-hidden />}
        title="Coéquipiers"
        description="Des devs de tout le continent cherchent des coéquipiers pour leurs projets. Trouve celui qui te correspond."
        actions={
          hasProfile ? (
            <ButtonLink to="/new?type=PROJECT" variant="secondary" size="md">
              Présenter mon projet
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="mb-5 space-y-3">
        <form method="get" action="/coequipiers" className="relative" role="search">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          {commitment && <input type="hidden" name="commitment" value={commitment} />}
          <Input
            name="skill"
            defaultValue={skill ?? ''}
            placeholder="Une compétence : react, flutter, design…"
            aria-label="Filtrer par compétence"
            className="pl-10"
          />
        </form>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Type d’engagement">
          <PillLink to={href({ skill })} active={commitment === null}>
            Tous
          </PillLink>
          {COMMITMENTS.map((value) => (
            <PillLink
              key={value}
              to={href({ commitment: value, skill })}
              active={commitment === value}
            >
              {COMMITMENT_LABELS[value]}
            </PillLink>
          ))}
          {skill && (
            <Link
              to={href({ commitment })}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-50 px-3 text-[13px] font-medium text-brand-800 dark:bg-brand-800/30 dark:text-brand-100"
            >
              #{skill} <X size={13} aria-label="Retirer le filtre" />
            </Link>
          )}
        </nav>
      </div>

      <InfiniteList
        initial={page}
        endpoint="/api/openings"
        params={{ commitment, skill }}
        endLabel="Tu as vu tous les postes ouverts"
        renderItem={(opening) => (
          <OpeningCard opening={opening}>
            <div className="flex justify-end">
              <ButtonLink
                to={`/p/${opening.project.id}#equipe`}
                variant={opening.viewer?.application ? 'secondary' : 'primary'}
                size="sm"
              >
                {opening.viewer?.isOwner
                  ? 'Gérer les candidatures'
                  : opening.viewer?.application
                    ? 'Voir ma candidature'
                    : 'Voir le projet et candidater'}
                <ArrowRight size={14} aria-hidden />
              </ButtonLink>
            </div>
          </OpeningCard>
        )}
        empty={
          <EmptyState
            icon={<Handshake size={22} aria-hidden />}
            title={
              skill || commitment
                ? 'Aucun poste pour ce filtre'
                : 'Aucun poste ouvert pour l’instant'
            }
            description="Présente ton projet et ouvre un poste : les devs intéressés pourront candidater."
            action={
              <ButtonLink to={hasProfile ? '/new?type=PROJECT' : '/auth/login?returnTo=/new'}>
                Présenter un projet
              </ButtonLink>
            }
          />
        }
      />
    </PageContainer>
  );
}
