import { Link } from 'react-router';
import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Handshake,
  Heart,
  MessageCircle,
  PenLine,
  ThumbsUp,
} from 'lucide-react';
import type { ActivityDto, ActivityKind } from '@fricadev/shared';
import { timeAgo } from '~/lib/countries';
import { PostTypeBadge } from './post-type-badge';
import { StatusMark, cn } from './ui';

/** Icône (colorée, sans fond) et phrase de chaque type d'action. */
export const ACTIVITY_UI: Record<ActivityKind, { Icon: typeof Heart; text: string; tone: string }> =
  {
    like: { Icon: Heart, text: 'Tu as aimé', tone: 'text-terre-600 dark:text-terre-400' },
    useful: {
      Icon: ThumbsUp,
      text: 'Tu as trouvé utile',
      tone: 'text-brand-600 dark:text-brand-400',
    },
    comment: {
      Icon: MessageCircle,
      text: 'Tu as répondu à',
      tone: 'text-indigo-600 dark:text-indigo-400',
    },
    application: {
      Icon: Handshake,
      text: 'Tu as candidaté sur',
      tone: 'text-ocre-600 dark:text-ocre-200',
    },
    post: { Icon: PenLine, text: 'Tu as publié', tone: 'text-stone-500 dark:text-stone-400' },
  };

/** Lien vers l'endroit exact : la réponse, la section équipe, ou la publication. */
export function activityHref(a: ActivityDto) {
  if (a.comment) return `/p/${a.post.id}#r-${a.comment.id}`;
  if (a.application) return `/p/${a.post.id}#equipe`;
  return `/p/${a.post.id}`;
}

function ApplicationStatus({ status }: { status: string }) {
  if (status === 'ACCEPTED')
    return (
      <StatusMark tone="success" icon={<CircleCheck size={13} aria-hidden />}>
        Acceptée
      </StatusMark>
    );
  if (status === 'DECLINED')
    return (
      <StatusMark tone="muted" icon={<CircleX size={13} aria-hidden />}>
        Non retenue
      </StatusMark>
    );
  return (
    <StatusMark tone="pending" icon={<CircleDashed size={13} aria-hidden />}>
      En attente
    </StatusMark>
  );
}

/** Une ligne de « Mon activité » : l'action, la publication concernée, le moment. */
export function ActivityItem({ activity: a }: { activity: ActivityDto }) {
  const { Icon, text, tone } = ACTIVITY_UI[a.kind];
  return (
    <li className="group relative flex items-start gap-3 px-4 py-3.5 transition hover:bg-stone-50 dark:hover:bg-stone-800/40">
      <Icon size={18} className={cn('mt-0.5 shrink-0', tone)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-stone-500">
          {text}
          {a.application && (
            <>
              {' '}
              le poste{' '}
              <span className="font-medium text-stone-700 dark:text-stone-300">
                {a.application.role}
              </span>{' '}
              de
            </>
          )}
        </p>
        <Link
          to={activityHref(a)}
          className="mt-0.5 line-clamp-2 font-semibold leading-snug tracking-tight after:absolute after:inset-0 group-hover:text-brand-600"
        >
          {a.post.title}
        </Link>
        {a.comment && (
          <p className="mt-1 line-clamp-2 border-l-2 border-stone-200 pl-2.5 text-[13px] text-stone-600 dark:border-stone-700 dark:text-stone-400">
            {a.comment.excerpt}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone-500">
          <PostTypeBadge type={a.post.type} />
          {a.kind !== 'post' && <span>{a.post.author.displayName}</span>}
          {a.application && <ApplicationStatus status={a.application.status} />}
          {a.kind === 'post' && (
            <span className="inline-flex items-center gap-2.5 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Heart size={12} aria-hidden /> {a.post.likeCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <ThumbsUp size={12} aria-hidden /> {a.post.usefulCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle size={12} aria-hidden /> {a.post.commentCount}
              </span>
            </span>
          )}
        </div>
      </div>
      <time dateTime={a.at} className="shrink-0 text-xs tabular-nums text-stone-400">
        {timeAgo(a.at)}
      </time>
    </li>
  );
}
