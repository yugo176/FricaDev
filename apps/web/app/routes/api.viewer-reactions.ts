import { data } from 'react-router';
import type { ReactionType } from '@fricadev/shared';
import type { Route } from './+types/api.viewer-reactions';
import { createApi } from '~/lib/api.server';

/** Réactions du visiteur pour une page du fil (le fil lui-même reste identique pour tous). */
export async function loader({ request }: Route.LoaderArgs) {
  const api = await createApi(request);
  const ids = new URL(request.url).searchParams.get('ids') ?? '';
  if (!api.profile || !ids) return data({} as Record<string, ReactionType[]>);
  const reactions = await api
    .call<Record<string, ReactionType[]>>(
      `/v1/posts/viewer-reactions?ids=${encodeURIComponent(ids)}`,
    )
    .catch(() => ({}) as Record<string, ReactionType[]>);
  return data(reactions, {
    headers: { ...(await api.headers()), 'Cache-Control': 'private, no-store' },
  });
}
