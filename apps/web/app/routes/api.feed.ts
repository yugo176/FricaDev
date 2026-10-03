import { data } from 'react-router';
import type { Page, PostSummaryDto } from '@fricadev/shared';
import type { Route } from './+types/api.feed';
import { createApi } from '~/lib/api.server';

const FORWARDED = ['type', 'tag', 'community', 'author', 'cursor'] as const;

/**
 * Pages suivantes du fil, chargées pendant le défilement.
 * scope=following → fil « Abonnements » (connecté) ; sinon fil public filtré.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const api = await createApi(request);
  const url = new URL(request.url);
  const query = new URLSearchParams({ limit: '10' });
  for (const key of FORWARDED) {
    const value = url.searchParams.get(key);
    if (value) query.set(key, value);
  }
  const following = url.searchParams.get('scope') === 'following' && api.isAuthenticated();
  const page = await api.call<Page<PostSummaryDto>>(
    `/v1/posts${following ? '/following' : ''}?${query}`,
  );
  return data(page, {
    headers: { ...(await api.headers()), 'Cache-Control': 'private, max-age=15' },
  });
}
