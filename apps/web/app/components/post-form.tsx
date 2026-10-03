import { useCallback, useEffect, useState } from 'react';
import { Form, Link, useFetcher, useNavigation } from 'react-router';
import { Check, CircleCheck, ListChecks, MessageCircle, PenLine, Sparkles, X } from 'lucide-react';
import {
  CODE_LANGUAGES,
  POST_TYPES,
  parseCodeBody,
  parseQuestionBody,
  type CommunityDto,
  type PostDetails,
  type PostType,
} from '@fricadev/shared';
import type { FieldErrors } from '~/lib/forms.server';
import { readDraft, savedLabel, useDraft } from '~/lib/draft';
import { POST_TYPE_UI } from '~/lib/post-types';
import { CommunityPicker } from './community-picker';
import { ComposerTips, ComposerTipsMobile } from './composer-tips';
import { MarkdownEditor } from './markdown-editor';
import { ArticleFields, CodeFields, ProjectFields, QuestionFields } from './post-form-fields';
import {
  composedBody,
  emptyComposer,
  isComposerEmpty,
  isGuided,
  type ComposerState,
} from './post-form-model';
import { TagInput } from './tag-input';
import { Button, ButtonLink, Card, Field, FormError, Input, cn } from './ui';

const LOSE_EDITS =
  'Ton texte ne suit plus la structure des champs guidés : les modifications faites en Markdown ne seront pas reprises. Revenir quand même aux champs guidés ?';

/** Clé du brouillon de création (partagée avec la publication rapide du fil). */
export const NEW_POST_DRAFT = 'new';

interface PostFormProps {
  mode: 'create' | 'edit';
  initial?: {
    type?: PostType;
    title?: string;
    body?: string;
    tags?: string[];
    communityId?: string;
    details?: PostDetails | null;
  };
  communities?: CommunityDto[];
  errors?: FieldErrors;
  formError?: string | null;
  cancelHref?: string;
}

function TypePicker({ value, onChange }: { value: PostType; onChange: (type: PostType) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-stone-800 dark:text-stone-200">
        Que veux-tu partager ?
      </legend>
      <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {POST_TYPES.map((type) => {
          const option = POST_TYPE_UI[type];
          const active = type === value;
          return (
            <label
              key={type}
              className={cn(
                'relative flex cursor-pointer flex-col gap-1.5 rounded-2xl border bg-white p-3.5 shadow-card transition dark:bg-stone-900',
                active
                  ? 'border-brand-600 ring-4 ring-brand-600/10'
                  : 'border-stone-200 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700',
              )}
            >
              <input
                type="radio"
                name="type"
                value={type}
                checked={active}
                onChange={() => onChange(type)}
                className="sr-only"
              />
              <option.Icon size={22} strokeWidth={1.75} className={option.iconClass} aria-hidden />
              <span className="mt-1 text-sm font-semibold">{option.label}</span>
              <span className="text-xs leading-snug text-stone-500">{option.hint}</span>
              {active && (
                <Check size={16} className="absolute right-3 top-3 text-brand-600" aria-hidden />
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** « Ces questions existent peut-être déjà » : recherche 400 ms après la frappe du titre. */
function SimilarPosts({ title, type }: { title: string; type: PostType }) {
  const fetcher = useFetcher<{ id: string; title: string; commentCount: number }[]>();
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (title.trim().length < 12) return;
    const timer = setTimeout(
      () => fetcher.load(`/api/similar?type=${type}&q=${encodeURIComponent(title.trim())}`),
      400,
    );
    return () => clearTimeout(timer);
  }, [title, type]);

  const posts = title.trim().length >= 12 ? (fetcher.data ?? []) : [];
  if (dismissed || posts.length === 0) return null;
  const plural = POST_TYPE_UI[type].plural.toLowerCase();
  return (
    <div className="mt-2.5 rounded-xl border border-ocre-400/30 bg-ocre-50/50 px-3.5 py-3 dark:border-ocre-200/20 dark:bg-ocre-800/10">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-ocre-800 dark:text-ocre-50">
          Ces {plural} existent peut-être déjà
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Masquer les suggestions"
          className="rounded p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-white"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
      <ul className="mt-1.5 space-y-1">
        {posts.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
            <Link
              to={`/p/${p.id}`}
              target="_blank"
              className="truncate font-medium text-stone-700 hover:text-brand-600 hover:underline dark:text-stone-200"
            >
              {p.title}
            </Link>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-stone-500">
              <MessageCircle size={12} aria-hidden /> {p.commentCount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function initialState(props: PostFormProps): ComposerState {
  const { initial = {} } = props;
  const details = initial.details ?? {};
  return {
    ...emptyComposer(initial.type ?? 'QUESTION', initial.communityId ?? ''),
    title: initial.title ?? '',
    body: initial.body ?? '',
    tags: initial.tags ?? [],
    pitch: details.pitch ?? '',
    stage: details.stage ?? '',
    repoUrl: details.repoUrl ?? '',
    demoUrl: details.demoUrl ?? '',
    language: details.language ?? '',
    subtitle: details.subtitle ?? '',
  };
}

/** Formulaire de publication, partagé par la création et la modification. */
export function PostForm(props: PostFormProps) {
  const { mode, communities = [], errors = {}, formError, cancelHref } = props;
  const [state, setState] = useState<ComposerState>(() => initialState(props));
  const [restored, setRestored] = useState(false);
  const [restoreKey, setRestoreKey] = useState(0);
  const busy = useNavigation().state === 'submitting';
  const ui = POST_TYPE_UI[state.type];
  const guided = isGuided(state, mode);
  const hasFieldErrors = Object.values(errors).some(Boolean);
  const draftKey = mode === 'create' ? NEW_POST_DRAFT : null;

  const set = useCallback(
    <K extends keyof ComposerState>(key: K, value: ComposerState[K]) =>
      setState((s) => ({ ...s, [key]: value })),
    [],
  );

  const draft = useDraft(draftKey, state, isComposerEmpty);
  // Erreur renvoyée par le serveur : le brouillon reprend (rien n'est perdu).
  useEffect(() => {
    if (formError || hasFieldErrors) draft.resume();
  }, [formError, hasFieldErrors]);
  // Brouillon : retrouvé au chargement (navigateur seulement), puis enregistré en continu.
  useEffect(() => {
    if (!draftKey) return;
    const saved = readDraft<{ value: ComposerState }>(draftKey);
    if (saved?.value && !isComposerEmpty(saved.value)) {
      draft.skip();
      setState({ ...emptyComposer(saved.value.type), ...saved.value });
      setRestored(true);
      setRestoreKey((k) => k + 1);
    }
  }, [draftKey]);

  function discardDraft() {
    draft.clear();
    setState(initialState(props));
    setRestored(false);
    setRestoreKey((k) => k + 1);
  }

  /** Passer des champs guidés à l'éditeur libre, en gardant ce qui a été écrit. */
  function goFreeform() {
    setState((s) => ({ ...s, body: composedBody(s, mode) || s.body, freeform: true }));
  }

  /**
   * Revenir aux champs guidés : le Markdown est relu pour reprendre les modifications.
   * S'il ne suit plus la structure, on prévient avant de revenir aux champs tels qu'ils étaient.
   */
  function goGuided() {
    if (state.type === 'QUESTION') {
      const parsed = parseQuestionBody(state.body);
      if (!parsed && !confirm(LOSE_EDITS)) return;
      setState((s) => ({ ...s, ...(parsed ?? {}), freeform: false }));
    } else {
      const parsed = parseCodeBody(state.body);
      if (!parsed && !confirm(LOSE_EDITS)) return;
      const language = (CODE_LANGUAGES as readonly string[]).includes(parsed?.language ?? '')
        ? (parsed!.language as ComposerState['language'])
        : undefined;
      setState((s) => ({
        ...s,
        ...(parsed ? { explanation: parsed.explanation, code: parsed.code } : {}),
        ...(language ? { language } : {}),
        freeform: false,
      }));
    }
  }
  const canGoGuided =
    mode === 'create' && state.freeform && (state.type === 'QUESTION' || state.type === 'CODE');

  const submitLabel =
    mode === 'edit'
      ? 'Enregistrer les modifications'
      : state.type === 'QUESTION'
        ? 'Publier la question'
        : state.type === 'PROJECT'
          ? 'Publier le projet'
          : state.type === 'ARTICLE'
            ? 'Publier l’article'
            : 'Publier le code';

  return (
    <Form
      method="post"
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
      onSubmit={() => draft.stop()}
    >
      <div className="min-w-0 space-y-6">
        {mode === 'create' && (
          <TypePicker value={state.type} onChange={(type) => set('type', type)} />
        )}
        {mode === 'edit' && <input type="hidden" name="type" value={state.type} />}

        {(restored || draft.savedAt) && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <CircleCheck size={15} className="text-brand-600 dark:text-brand-400" aria-hidden />
              {draft.savedAt
                ? `Brouillon enregistré ${savedLabel(draft.savedAt)}`
                : 'Brouillon restauré'}
            </span>
            <button
              type="button"
              onClick={discardDraft}
              className="font-medium text-stone-500 underline-offset-2 hover:text-terre-800 hover:underline"
            >
              Effacer le brouillon
            </button>
          </div>
        )}

        <Card padding="lg" className="space-y-5">
          <Field label="Titre" htmlFor="title" error={errors.title?.[0]}>
            <Input
              id="title"
              name="title"
              required
              minLength={5}
              maxLength={180}
              value={state.title}
              onChange={(e) => set('title', e.target.value)}
              className="text-base font-medium"
              placeholder={
                state.type === 'QUESTION'
                  ? 'Comment éviter le double crédit sur un webhook de paiement ?'
                  : state.type === 'PROJECT'
                    ? 'Zemi : livraison de repas pour les étudiants de Cotonou'
                    : state.type === 'CODE'
                      ? 'Formater un montant en FCFA en TypeScript'
                      : 'Déployer une app Node.js sur un VPS africain en 20 minutes'
              }
            />
            {mode === 'create' && <SimilarPosts title={state.title} type={state.type} />}
          </Field>

          <ComposerTipsMobile state={state} mode={mode} />

          {state.type === 'PROJECT' && (
            <ProjectFields state={state} set={set} mode={mode} error={errors.details?.[0]} />
          )}
          {state.type === 'ARTICLE' && <ArticleFields state={state} set={set} />}
          {state.type === 'CODE' && <CodeFields state={state} set={set} guided={guided} />}
          {state.type === 'QUESTION' && guided && <QuestionFields state={state} set={set} />}

          {guided ? (
            <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-stone-500">
              <Sparkles size={14} className="text-ocre-600 dark:text-ocre-200" aria-hidden />
              Ces champs deviennent une publication bien structurée.
              <button
                type="button"
                onClick={goFreeform}
                className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
              >
                <PenLine size={13} aria-hidden /> Écrire librement en Markdown
              </button>
            </p>
          ) : (
            <MarkdownEditor
              key={restoreKey}
              name="body"
              label={
                state.type === 'PROJECT'
                  ? 'Présentation du projet'
                  : state.type === 'ARTICLE'
                    ? 'L’article'
                    : 'Contenu'
              }
              required
              rows={14}
              value={state.body}
              onChange={(value) => set('body', value)}
              placeholder={ui.placeholder}
              error={errors.body?.[0]}
              allowSplit
            />
          )}
          {guided && errors.body?.[0] && <p className="field-error">{errors.body[0]}</p>}
          {canGoGuided && (
            <p className="-mt-2 flex flex-wrap items-center gap-x-2 text-[13px] text-stone-500">
              <ListChecks size={14} className="text-ocre-600 dark:text-ocre-200" aria-hidden />
              Tu préfères être guidé ?
              <button
                type="button"
                onClick={goGuided}
                className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
              >
                Revenir aux champs guidés
              </button>
            </p>
          )}

          <Field
            label={state.type === 'PROJECT' ? 'Stack (tags)' : 'Tags'}
            htmlFor="tags-input"
            error={undefined}
          >
            <TagInput
              id="tags-input"
              name="tags"
              value={state.tags}
              onChange={(tags) => set('tags', tags)}
              error={errors.tags?.[0]}
            />
          </Field>

          {mode === 'create' && (
            <Field label="Communauté" htmlFor="communityId" optional>
              <CommunityPicker
                key={restoreKey}
                id="communityId"
                name="communityId"
                communities={communities}
                defaultValue={state.communityId}
                onChange={(id) => set('communityId', id)}
              />
            </Field>
          )}
        </Card>

        {!hasFieldErrors && <FormError>{formError}</FormError>}

        <div className="flex items-center justify-end gap-2">
          {cancelHref && (
            <ButtonLink to={cancelHref} variant="ghost">
              Annuler
            </ButtonLink>
          )}
          <Button size="lg" loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </div>

      <aside className="hidden lg:block" aria-label="Conseils et aperçu">
        <div className="sticky top-20">
          <ComposerTips state={state} mode={mode} />
        </div>
      </aside>
    </Form>
  );
}
