import { Link } from 'react-router';
import {
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  Github,
  Heart,
  MessageCircle,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { LANGUAGE_UI } from '~/lib/languages';
import type { CommunityDto, PostDto, PostSummaryDto } from '@fricadev/shared';
import { POST_TYPE_UI } from '~/lib/post-types';
import { Avatar } from './avatar';
import { CommunityIcon } from './community-card';
import { CountryLabel } from './flag';
import { JoinButton, useMembership } from './join-button';
import { TagList } from './post-card';
import { ButtonLink, LangDot, MetaItem, StageChip, StatusMark, buttonClass, cn } from './ui';

const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Bloc de la colonne de droite : titre en petites capitales, contenu libre. */
export function SidebarBlock({
  title,
  count,
  action,
  children,
  className,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('card p-4', className)} aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          {title}
          {count !== undefined && <span className="ml-1.5 text-stone-400">· {count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800/50">
      <p className="flex items-center gap-1.5 text-lg font-semibold tabular-nums leading-tight">
        <span className="text-stone-400">{icon}</span>
        {value}
      </p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  );
}

/** Champs propres au type : pitch, avancement et liens d'un projet, langage, temps de lecture. */
function DetailsBlock({ post }: { post: PostDto }) {
  const d = post.details;
  if (!d) return null;
  const language = d.language ? LANGUAGE_UI[d.language] : null;
  const link = 'nofollow noopener noreferrer ugc';
  return (
    <div className="mt-4 space-y-3">
      {d.pitch && (
        <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">{d.pitch}</p>
      )}
      {(d.stage || language || d.readingMinutes) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {d.stage && <StageChip stage={d.stage} />}
          {language && <LangDot label={language.label} color={language.color} />}
          {d.readingMinutes && (
            <MetaItem icon={<Clock size={13} aria-hidden />}>
              {d.readingMinutes} min de lecture
            </MetaItem>
          )}
        </div>
      )}
      {(d.repoUrl || d.demoUrl) && (
        <div className="grid grid-cols-2 gap-2">
          {d.repoUrl && (
            <a
              href={d.repoUrl}
              target="_blank"
              rel={link}
              className={buttonClass('secondary', 'sm', 'w-full')}
            >
              <Github size={14} aria-hidden /> Le code
            </a>
          )}
          {d.demoUrl && (
            <a
              href={d.demoUrl}
              target="_blank"
              rel={link}
              className={buttonClass('primary', 'sm', cn('w-full', !d.repoUrl && 'col-span-2'))}
            >
              <ExternalLink size={14} aria-hidden /> La démo
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** « À propos » : auteur, statut (question), stack ou tags, date et chiffres clés. */
export function AboutCard({ post, memberCount }: { post: PostDto; memberCount?: number }) {
  const isProject = post.type === 'PROJECT';
  const isQuestion = post.type === 'QUESTION';
  const author = post.author;
  const title = isProject
    ? 'À propos du projet'
    : isQuestion
      ? 'À propos de la question'
      : `À propos ${post.type === 'ARTICLE' ? 'de l’article' : 'du code'}`;

  return (
    <SidebarBlock title={title}>
      {isQuestion &&
        (post.hasAcceptedAnswer ? (
          <StatusMark tone="success" icon={<CheckCircle2 size={15} aria-hidden />} className="mb-3">
            Résolue : une réponse a été acceptée
          </StatusMark>
        ) : (
          <StatusMark tone="pending" icon={<Clock size={15} aria-hidden />} className="mb-3">
            En attente d’une réponse acceptée
          </StatusMark>
        ))}

      <Link
        to={`/u/${author.handle}`}
        className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-stone-100 dark:hover:bg-stone-800/70"
      >
        <Avatar name={author.displayName} seed={author.handle} src={author.avatarUrl} size={40} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate font-semibold">{author.displayName}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
            <CountryLabel code={author.countryCode} height={10} />
            {author.reputation !== undefined && (
              <span className="inline-flex items-center gap-1 font-medium text-ocre-800 dark:text-ocre-50">
                <Award size={12} className="text-ocre-400" aria-hidden /> {author.reputation} pts
              </span>
            )}
          </span>
        </span>
      </Link>

      <DetailsBlock post={post} />

      {post.tags.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-stone-500">
            {isProject ? 'Stack' : 'Tags'}
          </p>
          <TagList tags={post.tags} />
        </div>
      )}

      <p className="mt-4 text-xs text-stone-500">
        Publié le {DATE.format(new Date(post.createdAt))}
        {post.community && (
          <>
            {' dans '}
            <Link
              to={`/c/${post.community.slug}`}
              className="font-medium text-brand-600 hover:underline"
            >
              {post.community.name}
            </Link>
          </>
        )}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat icon={<Heart size={14} aria-hidden />} value={post.likeCount} label="J’aime" />
        <Stat icon={<ThumbsUp size={14} aria-hidden />} value={post.usefulCount} label="Utile" />
        <Stat
          icon={<MessageCircle size={14} aria-hidden />}
          value={post.commentCount}
          label={isQuestion ? 'Réponses' : 'Commentaires'}
        />
        {isProject && memberCount !== undefined && (
          <Stat icon={<Users size={14} aria-hidden />} value={memberCount} label="Membres" />
        )}
      </div>
    </SidebarBlock>
  );
}

/** Communauté de la publication, avec le bouton Rejoindre (comme la barre latérale de Reddit). */
export function CommunitySideCard({
  community,
  hasProfile,
}: {
  community: CommunityDto;
  hasProfile: boolean;
}) {
  const { memberCount } = useMembership(community);
  return (
    <SidebarBlock title="Communauté">
      <Link to={`/c/${community.slug}`} className="group flex items-center gap-3">
        <CommunityIcon community={community} size={40} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-semibold group-hover:text-brand-600">
            {community.name}
          </span>
          <span className="text-xs text-stone-500">
            {memberCount} membre{memberCount > 1 ? 's' : ''}
          </span>
        </span>
      </Link>
      {community.description && (
        <p className="mt-2.5 line-clamp-3 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
          {community.description}
        </p>
      )}
      <JoinButton community={community} hasProfile={hasProfile} size="sm" className="mt-3 block" />
    </SidebarBlock>
  );
}

/** Publications du même type partageant un tag. */
export function SimilarPosts({ type, posts }: { type: PostDto['type']; posts: PostSummaryDto[] }) {
  if (posts.length === 0) return null;
  const ui = POST_TYPE_UI[type];
  return (
    <SidebarBlock title={`${ui.plural} similaires`}>
      <ul className="space-y-3">
        {posts.map((p) => (
          <li key={p.id}>
            <Link to={`/p/${p.id}`} className="group block">
              <span className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-brand-600">
                {p.title}
              </span>
              <span className="mt-1 flex items-center gap-3 text-xs text-stone-500">
                <span>{p.author.displayName}</span>
                <span className="inline-flex items-center gap-1">
                  <Heart size={12} aria-hidden /> {p.likeCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle size={12} aria-hidden /> {p.commentCount}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <ButtonLink
        to={`/?type=${type}`}
        variant="ghost"
        size="sm"
        className="mt-3 w-full text-stone-500"
      >
        Voir plus de {ui.plural.toLowerCase()}
      </ButtonLink>
    </SidebarBlock>
  );
}
