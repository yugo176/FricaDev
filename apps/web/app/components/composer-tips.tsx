import { useRouteLoaderData } from 'react-router';
import { Check, ChevronDown, Lightbulb } from 'lucide-react';
import type { PostSummaryDto } from '@fricadev/shared';
import { POST_TYPE_UI } from '~/lib/post-types';
import { PostCard } from './post-card';
import { composedBody, previewSummary, type ComposerState } from './post-form-model';
import { cn } from './ui';

interface Tip {
  label: string;
  done: boolean;
}

/** Ce qui rend une publication utile, selon son type : la liste se coche pendant la saisie. */
export function tipsFor(state: ComposerState, mode: 'create' | 'edit'): Tip[] {
  const title = state.title.trim();
  const body = composedBody(state, mode);
  const words = body.split(/\s+/).filter(Boolean).length;
  const hasTag = state.tags.length > 0;
  switch (state.type) {
    case 'PROJECT':
      return [
        { label: 'Un nom et un titre clairs', done: title.length >= 10 },
        { label: 'Le pitch en une phrase', done: state.pitch.trim().length >= 10 },
        { label: 'L’avancement du projet', done: Boolean(state.stage) },
        { label: 'Un lien vers le code ou la démo', done: Boolean(state.repoUrl || state.demoUrl) },
        { label: 'La stack en tags', done: hasTag },
      ];
    case 'QUESTION':
      return [
        { label: 'Un titre précis, formulé comme une question', done: title.length >= 15 },
        {
          label: 'Le contexte : ce que tu essaies de faire',
          done: (mode === 'create' && !state.freeform ? state.goal : body).trim().length >= 30,
        },
        {
          label: 'Ce que tu as déjà essayé',
          done: mode === 'create' && !state.freeform ? Boolean(state.tried.trim()) : words >= 60,
        },
        { label: 'Le message d’erreur ou le code', done: /```/.test(body) },
        { label: 'Au moins un tag', done: hasTag },
      ];
    case 'CODE':
      return [
        { label: 'Un titre qui dit ce que fait le code', done: title.length >= 10 },
        { label: 'Le langage', done: Boolean(state.language) },
        { label: 'Le code (quelques lignes au moins)', done: /```[\s\S]*\n[\s\S]*\n/.test(body) },
        {
          label: 'Une explication',
          done:
            (state.freeform || mode === 'edit'
              ? body.replace(/```[\s\S]*?```/g, '')
              : state.explanation
            ).trim().length >= 20,
        },
        { label: 'Au moins un tag', done: hasTag },
      ];
    case 'ARTICLE':
      return [
        { label: 'Un titre accrocheur', done: title.length >= 15 },
        { label: 'Un sous-titre', done: Boolean(state.subtitle.trim()) },
        { label: 'Des intertitres pour structurer', done: /^#{2,3}\s/m.test(body) },
        { label: 'Assez de contenu (150 mots ou plus)', done: words >= 150 },
        { label: 'Au moins un tag', done: hasTag },
      ];
  }
}

const LEVELS = ['À compléter', 'Bien parti', 'Presque prêt', 'Prêt à publier'];

function Quality({ tips }: { tips: Tip[] }) {
  const done = tips.filter((t) => t.done).length;
  const level = done === tips.length ? 3 : Math.min(2, Math.floor((done / tips.length) * 3));
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 w-5 rounded-full transition-colors',
              i <= level ? 'bg-brand-400' : 'bg-stone-200 dark:bg-stone-700',
            )}
          />
        ))}
      </span>
      <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
        {LEVELS[level]}
      </span>
    </div>
  );
}

function TipList({ tips }: { tips: Tip[] }) {
  return (
    <ul className="space-y-2">
      {tips.map((tip) => (
        <li key={tip.label} className="flex items-start gap-2.5 text-sm">
          <span
            className={cn(
              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
              tip.done
                ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-stone-900'
                : 'border-stone-300 dark:border-stone-600',
            )}
            aria-hidden
          >
            {tip.done && <Check size={11} strokeWidth={3} />}
          </span>
          <span className={tip.done ? 'text-stone-500 line-through decoration-stone-300' : ''}>
            {tip.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CardPreview({ state, mode }: { state: ComposerState; mode: 'create' | 'edit' }) {
  const root = useRouteLoaderData<{
    profile: {
      handle: string;
      displayName: string;
      avatarUrl?: string | null;
      countryCode?: string | null;
    } | null;
  }>('root');
  const profile = root?.profile;
  if (!profile) return null;
  const summary = previewSummary(state, mode);
  const post: PostSummaryDto = {
    id: 'apercu',
    type: state.type,
    title: state.title.trim() || 'Ton titre apparaîtra ici',
    excerpt: summary.excerpt,
    codePreview: summary.codePreview,
    details: Object.keys(summary.details).length ? summary.details : null,
    tags: state.tags,
    author: {
      id: 'moi',
      handle: profile.handle,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl ?? null,
      countryCode: profile.countryCode ?? null,
    },
    reactionCount: 0,
    likeCount: 0,
    usefulCount: 0,
    commentCount: 0,
    createdAt: new Date().toISOString(),
    community: null,
  };
  return (
    <div className="pointer-events-none origin-top select-none" aria-hidden>
      <PostCard post={post} linkable={false} compact />
    </div>
  );
}

/** Colonne de droite du formulaire : conseils qui se cochent, qualité, aperçu de la carte. */
export function ComposerTips({ state, mode }: { state: ComposerState; mode: 'create' | 'edit' }) {
  const tips = tipsFor(state, mode);
  const ui = POST_TYPE_UI[state.type];
  return (
    <div className="space-y-4">
      <section className="card p-4" aria-label="Conseils">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
          <Lightbulb size={14} className="text-ocre-600 dark:text-ocre-200" aria-hidden /> Conseils
          · {ui.label}
        </p>
        <TipList tips={tips} />
        <div className="mt-4 border-t border-stone-100 pt-3 dark:border-stone-800">
          <Quality tips={tips} />
        </div>
      </section>
      <section aria-label="Aperçu dans le fil">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
          À quoi ça ressemblera
        </p>
        <CardPreview state={state} mode={mode} />
      </section>
    </div>
  );
}

/** Version mobile : un bloc repliable « Conseils (2/5) ». */
export function ComposerTipsMobile({
  state,
  mode,
}: {
  state: ComposerState;
  mode: 'create' | 'edit';
}) {
  const tips = tipsFor(state, mode);
  const done = tips.filter((t) => t.done).length;
  return (
    <details className="group card lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Lightbulb size={15} className="text-ocre-600 dark:text-ocre-200" aria-hidden />
          Conseils ({done}/{tips.length})
        </span>
        <ChevronDown
          size={16}
          className="text-stone-400 transition group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-3 border-t border-stone-100 px-4 py-3 dark:border-stone-800">
        <TipList tips={tips} />
        <Quality tips={tips} />
      </div>
    </details>
  );
}
