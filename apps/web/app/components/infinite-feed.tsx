import type { Page, PostSummaryDto } from '@fricadev/shared';
import { useViewerReactions } from '~/lib/viewer-reactions';
import { InfiniteList } from './infinite-list';
import { PostCard } from './post-card';

/** Cartes du fil, avec les réactions du visiteur chargées par lots après l'affichage. */
export function PostCards({
  posts,
  linkable = true,
}: {
  posts: PostSummaryDto[];
  linkable?: boolean;
}) {
  const reactions = useViewerReactions(posts.map((p) => p.id));
  return (
    <>
      {posts.map((post) => (
        <div key={post.id} className="feed-item">
          <PostCard post={post} linkable={linkable} viewerReactions={reactions?.[post.id]} />
        </div>
      ))}
    </>
  );
}

/** Fil de publications à défilement infini (accueil, profils, communautés). */
export function InfiniteFeed({
  initial,
  params,
  empty,
  linkable = true,
}: {
  initial: Page<PostSummaryDto>;
  /** Paramètres du fil (scope, type, tag, community, author). */
  params: Record<string, string | null | undefined>;
  empty: React.ReactNode;
  linkable?: boolean;
}) {
  return (
    <InfiniteList
      initial={initial}
      endpoint="/api/feed"
      params={params}
      empty={empty}
      renderItems={(posts) => <PostCards posts={posts} linkable={linkable} />}
    />
  );
}
