import { data, redirect } from 'react-router';
import { Inbox, Plus, Users } from 'lucide-react';
import type { CommunityDto, Page, PostSummaryDto } from '@fricadev/shared';
import type { Route } from './+types/community';
import { CommunityIcon } from '~/components/community-card';
import { InfiniteFeed } from '~/components/infinite-feed';
import { JoinButton, useMembership } from '~/components/join-button';
import { ButtonLink, Card, EmptyState, PageContainer, SectionTitle } from '~/components/ui';
import { ApiError, createApi } from '~/lib/api.server';

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: 'Communauté introuvable · FricaDev' }];
  return [
    { title: `${loaderData.community.name} · FricaDev` },
    { name: 'description', content: loaderData.community.description ?? '' },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const api = await createApi(request);
  try {
    const [community, posts] = await Promise.all([
      api.call<CommunityDto>(`/v1/communities/${params.slug}`),
      api.call<Page<PostSummaryDto>>(
        `/v1/posts?community=${encodeURIComponent(params.slug)}&limit=10`,
      ),
    ]);
    return data(
      { community, posts, hasProfile: Boolean(api.profile) },
      { headers: await api.headers() },
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      throw data('Communauté introuvable', { status: 404 });
    }
    throw error;
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const api = await createApi(request);
  if (!api.profile) throw redirect(`/auth/login?returnTo=/c/${params.slug}`);
  const join = (await request.formData()).get('join') === '1';
  await api.call(`/v1/communities/${params.slug}/membership`, { method: join ? 'PUT' : 'DELETE' });
  return data({ ok: true }, { headers: await api.headers() });
}

export default function CommunityPage({ loaderData }: Route.ComponentProps) {
  const { community, posts, hasProfile } = loaderData;
  const { memberCount: members } = useMembership(community);

  return (
    <PageContainer>
      <Card padding="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <CommunityIcon community={community} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{community.name}</h1>
            {community.description && (
              <p className="mt-1 text-[15px] text-stone-500">{community.description}</p>
            )}
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-stone-500">
              <Users size={15} aria-hidden />
              <strong className="font-semibold text-stone-900 dark:text-white">{members}</strong>
              membre{members > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <JoinButton community={community} hasProfile={hasProfile} />
            {hasProfile && (
              <ButtonLink
                to={`/new?community=${community.id}`}
                variant="secondary"
                size="md"
                icon={<Plus size={16} aria-hidden />}
              >
                Publier
              </ButtonLink>
            )}
          </div>
        </div>
      </Card>

      <SectionTitle>Publications</SectionTitle>
      <InfiniteFeed
        initial={posts}
        params={{ community: community.slug }}
        empty={
          <EmptyState
            icon={<Inbox size={22} aria-hidden />}
            title="Aucune publication pour l’instant"
            description="Lance la discussion dans cette communauté."
            action={
              hasProfile ? (
                <ButtonLink to={`/new?community=${community.id}`}>Publier ici</ButtonLink>
              ) : undefined
            }
          />
        }
      />
    </PageContainer>
  );
}

export { keepPageOnReaction as shouldRevalidate } from '~/lib/revalidate';
