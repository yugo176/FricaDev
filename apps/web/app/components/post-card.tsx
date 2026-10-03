import { Link } from 'react-router';
import { Clock, MessageCircle } from 'lucide-react';
import type { PostDetails, PostSummaryDto, ReactionType } from '@fricadev/shared';
import { LANGUAGE_UI } from '~/lib/languages';
import { Avatar } from './avatar';
import { PostTypeBadge } from './post-type-badge';
import { Card, LangDot, MetaItem, StageChip } from './ui';
import { COUNTRY_NAMES, timeAgo } from '~/lib/countries';
import { Flag } from './flag';
import { PostReactions } from './post-reactions';
import { useViewerProfile } from '~/lib/viewer-reactions';

export function TagList({ tags, size = 'sm' }: { tags: string[]; size?: 'sm' | 'md' }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Link
          key={tag}
          to={`/?tag=${encodeURIComponent(tag)}`}
          className={`rounded-lg bg-stone-100 font-medium text-stone-600 transition hover:bg-brand-50 hover:text-brand-800 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-brand-800/30 dark:hover:text-brand-100 ${
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-[13px]'
          }`}
        >
          #{tag}
        </Link>
      ))}
    </div>
  );
}

/** Ligne auteur : avatar, nom, pays, date — identique sur les cartes, publications et réponses. */
export function AuthorLine({
  author,
  createdAt,
  edited,
  size = 36,
  extra,
}: {
  author: {
    handle: string;
    displayName: string;
    avatarUrl?: string | null;
    countryCode: string | null;
  };
  createdAt: string;
  edited?: boolean;
  size?: number;
  extra?: React.ReactNode;
}) {
  const country = author.countryCode ? COUNTRY_NAMES[author.countryCode] : null;
  return (
    <div className="relative z-10 flex min-w-0 items-center gap-3">
      <Link to={`/u/${author.handle}`} tabIndex={-1} aria-hidden>
        <Avatar name={author.displayName} seed={author.handle} src={author.avatarUrl} size={size} />
      </Link>
      <div className="min-w-0 text-sm leading-tight">
        <Link to={`/u/${author.handle}`} className="font-semibold hover:underline">
          {author.displayName}
        </Link>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-stone-500">
          {country && (
            <>
              <Flag code={author.countryCode} height={10} />
              {country} ·{' '}
            </>
          )}
          <time dateTime={createdAt}>{timeAgo(createdAt)}</time>
          {edited ? ' · modifié' : ''}
          {extra}
        </p>
      </div>
    </div>
  );
}

/** Avancement, langage, temps de lecture : la couleur reste dans le détail. */
export function PostMeta({ details }: { details: PostDetails | null }) {
  if (!details?.stage && !details?.language && !details?.readingMinutes) return null;
  const language = details.language ? LANGUAGE_UI[details.language] : null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      {details.stage && <StageChip stage={details.stage} />}
      {language && <LangDot label={language.label} color={language.color} />}
      {details.readingMinutes && (
        <MetaItem icon={<Clock size={13} aria-hidden />}>
          {details.readingMinutes} min de lecture
        </MetaItem>
      )}
    </div>
  );
}

export function PostCard({
  post,
  linkable = true,
  viewerReactions,
  compact = false,
}: {
  post: PostSummaryDto;
  /** Colonne étroite (aperçu du formulaire) : icônes et nombres seulement. */
  compact?: boolean;
  linkable?: boolean;
  /** null = visiteur non connecté, undefined = pas encore chargé (voir useViewerReactions). */
  viewerReactions?: ReactionType[] | null;
}) {
  const code = post.type === 'CODE' ? post.codePreview : null;
  const href = `/p/${post.id}`;
  const viewer = useViewerProfile();
  const details = post.details;

  return (
    <Card as="article" interactive={linkable} className="relative">
      <header className="flex items-start justify-between gap-3">
        <AuthorLine
          author={post.author}
          createdAt={post.createdAt}
          extra={
            post.community ? (
              <>
                {' · '}
                <Link to={`/c/${post.community.slug}`} className="text-brand-600 hover:underline">
                  {post.community.name}
                </Link>
              </>
            ) : null
          }
        />
        <PostTypeBadge type={post.type} />
      </header>

      <h2 className="mt-3.5 text-[17px] font-semibold leading-snug tracking-tight">
        {linkable ? (
          // Le lien couvre toute la carte (pseudo-élément) ; les autres liens restent au-dessus.
          <Link
            to={href}
            className="after:absolute after:inset-0 after:rounded-2xl hover:text-brand-600"
          >
            {post.title}
          </Link>
        ) : (
          post.title
        )}
      </h2>

      {code ? (
        <pre className="mt-3 max-h-48 overflow-hidden rounded-xl bg-stone-900 p-3.5 font-mono text-[13px] leading-relaxed text-emerald-200 dark:bg-black/40">
          <code>{code}</code>
        </pre>
      ) : (
        (details?.pitch || details?.subtitle || post.excerpt) && (
          <p className="mt-1.5 line-clamp-3 text-[15px] leading-relaxed text-stone-600 dark:text-stone-400">
            {details?.pitch ?? details?.subtitle ?? post.excerpt}
          </p>
        )
      )}

      <PostMeta details={details} />

      {post.tags.length > 0 && (
        <div className="relative z-10 mt-3.5">
          <TagList tags={post.tags} />
        </div>
      )}

      <footer className="relative z-10 mt-4 flex items-center gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
        <PostReactions
          postId={post.id}
          likeCount={post.likeCount}
          usefulCount={post.usefulCount}
          viewerReactions={viewer ? viewerReactions : null}
          isOwn={viewer?.handle === post.author.handle}
          labels={!compact}
        />
        <Link
          to={`${href}#reponses`}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium tabular-nums text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-white"
        >
          <MessageCircle size={15} aria-hidden /> {post.commentCount}
          <span className={compact ? 'hidden' : 'hidden sm:inline'}>
            {post.type === 'QUESTION'
              ? post.commentCount > 1
                ? 'réponses'
                : 'réponse'
              : post.commentCount > 1
                ? 'commentaires'
                : 'commentaire'}
          </span>
        </Link>
      </footer>
    </Card>
  );
}
