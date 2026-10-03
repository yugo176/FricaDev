import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { Columns2, Eye, PenLine } from 'lucide-react';
import { Markdown } from './markdown';
import { Spinner, cn } from './ui';

interface Props {
  name: string;
  id?: string;
  defaultValue?: string;
  /** Mode contrôlé (brouillon, conseils) : la valeur vient du parent. */
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  minLength?: number;
  label?: React.ReactNode;
  error?: string;
  /** Propose le mode « Côte à côte » sur grand écran. */
  allowSplit?: boolean;
}

type Mode = 'write' | 'preview' | 'split';

/** Zone de saisie Markdown avec aperçu rendu par le même moteur que les pages publiées. */
export function MarkdownEditor({
  name,
  id = name,
  defaultValue = '',
  value: controlled,
  onChange,
  placeholder,
  rows = 12,
  required,
  minLength,
  label,
  error,
  allowSplit = false,
}: Props) {
  const [own, setOwn] = useState(defaultValue);
  const value = controlled ?? own;
  const [mode, setMode] = useState<Mode>('write');
  const preview = useFetcher<{ html: string }>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function render(body: string) {
    preview.submit({ body }, { method: 'post', action: '/api/preview' });
  }

  // Côte à côte : rendu 600 ms après la dernière frappe.
  useEffect(() => {
    if (mode !== 'split') return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => render(value), 600);
    return () => clearTimeout(timer.current);
  }, [value, mode]);

  function change(next: string) {
    if (controlled === undefined) setOwn(next);
    onChange?.(next);
  }

  function select(next: Mode) {
    setMode(next);
    if (next !== 'write') render(value);
  }

  const tabClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
      active
        ? 'bg-white text-stone-900 shadow-card dark:bg-stone-700 dark:text-white'
        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200',
    );

  const rendered = (
    <div
      className="min-w-0 overflow-auto rounded-xl border border-stone-200 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-950/40"
      style={{ minHeight: `${rows * 1.4}rem` }}
    >
      {preview.state !== 'idle' && !preview.data ? (
        <p className="flex items-center gap-2 text-sm text-stone-500">
          <Spinner /> Préparation de l’aperçu…
        </p>
      ) : value.trim() && preview.data ? (
        <Markdown html={preview.data.html} />
      ) : (
        <p className="text-sm text-stone-500">Rien à afficher pour l’instant.</p>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        {label ? (
          <label htmlFor={id} className="text-sm font-medium text-stone-800 dark:text-stone-200">
            {label}
          </label>
        ) : (
          <span />
        )}
        <div
          className="flex gap-0.5 rounded-xl bg-stone-100 p-0.5 dark:bg-stone-800"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'write'}
            onClick={() => select('write')}
            className={tabClass(mode === 'write')}
          >
            <PenLine size={13} aria-hidden /> Écrire
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'preview'}
            onClick={() => select('preview')}
            className={tabClass(mode === 'preview')}
          >
            <Eye size={13} aria-hidden /> Aperçu
          </button>
          {allowSplit && (
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'split'}
              onClick={() => select('split')}
              className={cn(tabClass(mode === 'split'), 'hidden lg:inline-flex')}
            >
              <Columns2 size={13} aria-hidden /> Côte à côte
            </button>
          )}
        </div>
      </div>
      <div className={cn(mode === 'split' && 'grid gap-3 lg:grid-cols-2')}>
        <textarea
          id={id}
          name={name}
          required={required}
          minLength={minLength}
          rows={rows}
          value={value}
          onChange={(e) => change(e.target.value)}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          className={cn(
            'input font-mono text-[13.5px] leading-relaxed',
            mode === 'preview' && 'hidden',
          )}
        />
        {mode !== 'write' && rendered}
      </div>
      {error ? (
        <p className="field-error">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-stone-500">
          Markdown : **gras**, `code`, listes, liens et blocs de code colorés (```js).
        </p>
      )}
    </div>
  );
}
