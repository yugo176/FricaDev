import { useState } from 'react';
import { Form, useNavigate, useNavigation } from 'react-router';
import { PenLine, SlidersHorizontal, X } from 'lucide-react';
import { POST_TYPES, type PostType } from '@fricadev/shared';
import { writeDraft } from '~/lib/draft';
import { POST_TYPE_UI } from '~/lib/post-types';
import { NEW_POST_DRAFT } from './post-form';
import { emptyComposer } from './post-form-model';
import { Button, cn } from './ui';

/**
 * Publication rapide depuis le fil : type, titre et quelques lignes, sans quitter la page.
 * « Plus d'options » ouvre le formulaire complet avec ce qui a déjà été écrit.
 */
export function QuickComposer({ firstName }: { firstName: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PostType>('QUESTION');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const navigate = useNavigate();
  const navigation = useNavigation();
  const busy = navigation.state === 'submitting' && navigation.formAction === '/new';

  function moreOptions() {
    // Saisie libre : le texte déjà écrit est gardé tel quel dans le formulaire complet.
    writeDraft(NEW_POST_DRAFT, {
      value: { ...emptyComposer(type), title, body, freeform: true },
      savedAt: Date.now(),
    });
    navigate(`/new?type=${type}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="card flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] text-stone-500 transition hover:border-stone-300 hover:shadow-lift"
      >
        <PenLine size={19} className="shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
        Qu’est-ce que tu construis aujourd’hui, {firstName} ?
      </button>
    );
  }

  return (
    <Form method="post" action="/new" className="card animate-fade-up space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type de publication">
          {POST_TYPES.map((t) => {
            const ui = POST_TYPE_UI[t];
            const active = t === type;
            return (
              <label
                key={t}
                className={cn(
                  'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition',
                  active
                    ? 'border-stone-900 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-stone-900'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:text-stone-300',
                )}
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={active}
                  onChange={() => setType(t)}
                  className="sr-only"
                />
                <ui.Icon size={14} className={active ? '' : ui.iconClass} aria-hidden />
                {ui.label}
              </label>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer"
          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-white"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <input
        name="title"
        required
        minLength={5}
        maxLength={180}
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Un titre clair et précis"
        aria-label="Titre"
        className="input text-base font-medium"
      />
      <textarea
        name="body"
        required
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          type === 'QUESTION'
            ? 'Ton problème en quelques lignes (le Markdown fonctionne)…'
            : 'Quelques lignes pour présenter (le Markdown fonctionne)…'
        }
        aria-label="Contenu"
        className="input leading-relaxed"
      />
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={moreOptions}
          icon={<SlidersHorizontal size={14} aria-hidden />}
        >
          Plus d’options
        </Button>
        <Button size="sm" loading={busy}>
          Publier
        </Button>
      </div>
    </Form>
  );
}
