import { data, redirect, useFetcher } from 'react-router';
import {
  Award,
  CalendarDays,
  CheckCircle2,
  History,
  MessageCircle,
  PenLine,
  Plus,
  Settings,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import type { Page, PostSummaryDto, PublicProfileDto } from '@fricadev/shared';
import type { Route } from './+types/profile';
import { Avatar } from '~/components/avatar';
import { Flag } from '~/components/flag';
import { InfiniteFeed } from '~/components/infinite-feed';
import { TagList } from '~/components/post-card';
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageContainer,
  SectionTitle,
  Stat,
} from '~/components/ui';
import { ApiError, createApi } from '~/lib/api.server';
import { COUNTRY_NAMES } from '~/lib/countries';

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: 'Profil introuvable · FricaDev' }];
  const { profile } = loaderData;
  return [
    { title: `${profile.displayName} (@${profile.handle}) · FricaDev` },
    {
      name: 'description',
      content: profile.bio ?? `Profil de ${profile.displayName} sur FricaDev.`,
    },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const api = await createApi(request);
  try {
    const [profile, posts] = await Promise.all([
      api.call<PublicProfileDto>(`/v1/users/${params.handle}`),
      api.call<Page<PostSummaryDto>>(
        `/v1/posts?author=${encodeURIComponent(params.handle)}&limit=10`,
      ),
    ]);
    return data(
      {
        profile,
        posts,
        isMe: api.profile?.handle === profile.handle,
        canFollow: Boolean(api.profile) && api.profile?.handle !== profile.handle,
      },
      { headers: await api.headers() },
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      throw data('Profil introuvable', { status: 404 });
    }
    throw error;
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const api = await createApi(request);
  if (!api.profile) throw redirect(`/auth/login?returnTo=/u/${params.handle}`);
  const follow = (await request.formData()).get('follow') === '1';
  await api.call(`/v1/users/${params.handle}/follow`, { method: follow ? 'PUT' : 'DELETE' });
  return data({ ok: true }, { headers: await api.headers() });
}

/** Clé partagée : le compteur d'abonnés suit le bouton sans attendre le serveur. */
const FOLLOW_FETCHER = 'follow';

function FollowButton({ following }: { following: boolean }) {
  const fetcher = useFetcher({ key: FOLLOW_FETCHER });
  const optimistic = fetcher.formData ? fetcher.formData.get('follow') === '1' : following;
  return (
    <fetcher.Form method="post">
      <input type="hidden" name="follow" value={optimistic ? '0' : '1'} />
      <Button
        variant={optimistic ? 'secondary' : 'primary'}
        aria-pressed={optimistic}
        icon={optimistic ? <UserCheck size={16} aria-hidden /> : <UserPlus size={16} aria-hidden />}
      >
        {optimistic ? 'Abonné' : 'Suivre'}
      </Button>
    </fetcher.Form>
  );
}

const memberSince = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(iso));

export default function ProfilePage({ loaderData }: Route.ComponentProps) {
  const { profile, posts, isMe, canFollow } = loaderData;
  const follow = useFetcher({ key: FOLLOW_FETCHER });
  const wasFollowing = profile.viewer?.isFollowing ?? false;
  const nowFollowing = follow.formData ? follow.formData.get('follow') === '1' : wasFollowing;
  const followers = profile.stats.followers + Number(nowFollowing) - Number(wasFollowing);
  const country = profile.countryCode ? COUNTRY_NAMES[profile.countryCode] : null;

  return (
    <PageContainer>
      <Card padding="none" className="overflow-hidden">
        {/* Bandeau aux couleurs de la marque */}
        <div className="h-24 bg-brand-600 sm:h-28" aria-hidden>
          <svg
            className="h-full w-full opacity-20"
            preserveAspectRatio="none"
            viewBox="0 0 400 100"
          >
            <path d="M0 70 Q100 20 200 60 T400 40 V100 H0Z" fill="#EF9F27" />
            <path d="M0 85 Q120 50 240 80 T400 70 V100 H0Z" fill="#E1F5EE" />
          </svg>
        </div>
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-fit self-start rounded-full ring-4 ring-white dark:ring-stone-900">
              <Avatar
                name={profile.displayName}
                seed={profile.handle}
                src={profile.avatarUrl}
                size={88}
              />
            </div>
            <div className="flex gap-2">
              {isMe && (
                <>
                  <ButtonLink
                    to="/settings"
                    variant="secondary"
                    size="md"
                    icon={<Settings size={16} aria-hidden />}
                  >
                    Modifier le profil
                  </ButtonLink>
                  <ButtonLink
                    to="/activite"
                    variant="secondary"
                    size="md"
                    icon={<History size={16} aria-hidden />}
                  >
                    Mon activité
                  </ButtonLink>
                  <ButtonLink to="/new" icon={<Plus size={16} aria-hidden />}>
                    Publier
                  </ButtonLink>
                </>
              )}
              {canFollow && <FollowButton following={profile.viewer?.isFollowing ?? false} />}
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{profile.displayName}</h1>
          <p className="text-stone-500">@{profile.handle}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-stone-500">
            {country && (
              <span className="inline-flex items-center gap-1.5">
                <Flag code={profile.countryCode} height={12} /> {country}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={15} aria-hidden /> Membre depuis {memberSince(profile.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <strong className="font-semibold text-stone-900 dark:text-white">{followers}</strong>{' '}
              abonné{followers > 1 ? 's' : ''}
            </span>
            <span>
              <strong className="font-semibold text-stone-900 dark:text-white">
                {profile.stats.following}
              </strong>{' '}
              abonnement{profile.stats.following > 1 ? 's' : ''}
            </span>
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-prose text-[15px] leading-relaxed">{profile.bio}</p>
          )}

          {profile.skills.length > 0 && (
            <div className="mt-4">
              <TagList tags={profile.skills} size="md" />
            </div>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Réputation"
              value={profile.reputation}
              icon={<Award size={13} className="text-ocre-400" aria-hidden />}
            />
            <Stat
              label="Publications"
              value={profile.stats.posts}
              icon={<PenLine size={13} aria-hidden />}
            />
            <Stat
              label="Réponses"
              value={profile.stats.answers}
              icon={<MessageCircle size={13} aria-hidden />}
            />
            <Stat
              label="Acceptées"
              value={profile.stats.acceptedAnswers}
              icon={<CheckCircle2 size={13} className="text-brand-600" aria-hidden />}
            />
          </dl>
        </div>
      </Card>

      <SectionTitle>Publications</SectionTitle>
      <InfiniteFeed
        initial={posts}
        params={{ author: profile.handle }}
        empty={
          <EmptyState
            icon={<PenLine size={22} aria-hidden />}
            title={isMe ? 'Tu n’as encore rien publié' : 'Aucune publication pour l’instant'}
            description={isMe ? 'Partage ta première question ou présente ton projet.' : undefined}
            action={isMe ? <ButtonLink to="/new">Publier</ButtonLink> : undefined}
          />
        }
      />
    </PageContainer>
  );
}

export { keepPageOnReaction as shouldRevalidate } from '~/lib/revalidate';
