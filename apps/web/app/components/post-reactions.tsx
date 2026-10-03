import { useEffect, useRef, useState } from 'react';
import { Link, useFetcher, useLocation } from 'react-router';
import { Heart, ThumbsUp } from 'lucide-react';
import type { ReactionType } from '@fricadev/shared';
import { cn } from './ui';

const BUTTONS: { type: ReactionType; label: string; Icon: typeof Heart; on: string }[] = [
  {
    type: 'LIKE',
    label: 'J’aime',
    Icon: Heart,
    on: 'border-terre-800/40 bg-terre-50 text-terre-800 dark:border-terre-50/30 dark:bg-terre-800/30 dark:text-terre-50',
  },
  {
    type: 'USEFUL',
    label: 'Utile',
    Icon: ThumbsUp,
    on: 'border-brand-600/50 bg-brand-50 text-brand-800 dark:border-brand-100/30 dark:bg-brand-800/30 dark:text-brand-100',
  },
];

const pill =
  'inline-flex items-center gap-1.5 rounded-full border px-3 font-medium tabular-nums transition';
const idle =
  'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-white';

function ReactionPill({
  postId,
  type,
  count,
  active,
  label,
  Icon,
  onClass,
  size,
  disabledReason,
  labelClass,
}: {
  postId: string;
  type: ReactionType;
  count: number;
  active: boolean | undefined;
  label: string;
  Icon: typeof Heart;
  onClass: string;
  size: 'sm' | 'md';
  disabledReason?: string;
  labelClass: string;
}) {
  const fetcher = useFetcher<{ ok: boolean }>();
  // État local : il reste juste après la réponse du serveur, sans recharger la page ni le fil.
  const [state, setState] = useState({ active: Boolean(active), count });
  useEffect(() => setState({ active: Boolean(active), count }), [active, count]);

  // Une requête à la fois : des clics rapides ne doivent pas arriver au serveur dans le désordre.
  // Pendant l'envoi, seul le dernier état voulu est retenu, puis envoyé à la fin.
  const sent = useRef<boolean | null>(null);
  const wanted = useRef<boolean | null>(null);

  function send(on: boolean) {
    sent.current = on;
    fetcher.submit({ postId, type, on: on ? '1' : '0' }, { method: 'post', action: '/api/react' });
  }

  useEffect(() => {
    if (fetcher.state !== 'idle') return;
    if (fetcher.data && !fetcher.data.ok) {
      // Refus du serveur : on revient à l'état d'origine.
      wanted.current = null;
      setState({ active: Boolean(active), count });
      return;
    }
    if (wanted.current !== null && wanted.current !== sent.current) send(wanted.current);
    wanted.current = null;
  }, [fetcher.state, fetcher.data]);

  function toggle() {
    const next = !state.active;
    setState((s) => ({ active: next, count: Math.max(0, s.count + (next ? 1 : -1)) }));
    if (fetcher.state === 'idle') send(next);
    else wanted.current = next;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={Boolean(disabledReason) || active === undefined}
      aria-pressed={state.active}
      title={disabledReason ?? label}
      aria-label={`${label} (${state.count})`}
      className={cn(
        pill,
        size === 'sm' ? 'h-8 text-[13px]' : 'h-9 text-sm',
        state.active ? onClass : idle,
        'disabled:cursor-default disabled:opacity-70',
      )}
    >
      <Icon
        size={size === 'sm' ? 14 : 15}
        className={state.active ? 'fill-current' : ''}
        aria-hidden
      />
      <span className={labelClass}>{label}</span>
      <span>{state.count}</span>
    </button>
  );
}

/**
 * Boutons J'aime / Utile, sur les cartes du fil comme sur la page d'une publication.
 * `viewerReactions` : null = visiteur non connecté, undefined = pas encore chargé.
 */
export function PostReactions({
  postId,
  likeCount,
  usefulCount,
  viewerReactions,
  isOwn = false,
  size = 'sm',
  labels = true,
}: {
  postId: string;
  likeCount: number;
  usefulCount: number;
  viewerReactions: ReactionType[] | null | undefined;
  isOwn?: boolean;
  size?: 'sm' | 'md';
  /** false : icônes et nombres seulement (aperçu étroit). */
  labels?: boolean;
}) {
  const labelClass = !labels ? 'hidden' : size === 'sm' ? 'hidden sm:inline' : '';
  const location = useLocation();
  const counts = { LIKE: likeCount, USEFUL: usefulCount };

  if (viewerReactions === null) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return (
      <div className="flex items-center gap-2">
        {BUTTONS.map(({ type, label, Icon }) => (
          <Link
            key={type}
            to={`/auth/login?returnTo=${returnTo}`}
            title="Connecte-toi pour réagir"
            className={cn(pill, idle, size === 'sm' ? 'h-8 text-[13px]' : 'h-9 text-sm')}
          >
            <Icon size={size === 'sm' ? 14 : 15} aria-hidden />
            <span className={labelClass}>{label}</span>
            <span>{counts[type]}</span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {BUTTONS.map(({ type, label, Icon, on }) => (
        <ReactionPill
          key={type}
          postId={postId}
          type={type}
          count={counts[type]}
          active={isOwn ? false : viewerReactions?.includes(type)}
          label={label}
          Icon={Icon}
          onClass={on}
          size={size}
          disabledReason={isOwn ? 'C’est ta publication' : undefined}
          labelClass={labelClass}
        />
      ))}
    </div>
  );
}
