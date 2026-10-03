import { useEffect, useId, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { Hash, X } from 'lucide-react';
import { cn } from './ui';

const MAX_TAGS = 5;
const TAG_PATTERN = /^[a-z0-9][a-z0-9.+#-]{0,31}$/;

function normalizeTag(raw: string) {
  return raw.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-');
}

/**
 * Tags en pastilles : Entrée ou virgule pour ajouter, Retour arrière pour retirer le dernier,
 * suggestions des tags existants les plus utilisés. La valeur part dans un champ caché.
 */
export function TagInput({
  id,
  name,
  value,
  onChange,
  error,
}: {
  id: string;
  name: string;
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
}) {
  const listId = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const fetcher = useFetcher<{ name: string; count: number }[]>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const full = value.length >= MAX_TAGS;

  // Suggestions 200 ms après la frappe (ou les plus utilisés quand le champ est vide).
  useEffect(() => {
    if (!open || full) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => fetcher.load(`/api/tags?q=${encodeURIComponent(normalizeTag(text))}`),
      200,
    );
    return () => clearTimeout(timer.current);
  }, [text, open, full]);

  const suggestions = (fetcher.data ?? []).filter((s) => !value.includes(s.name)).slice(0, 6);
  useEffect(() => setActive(0), [fetcher.data]);

  function add(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag) return;
    if (!TAG_PATTERN.test(tag)) {
      setHint('Lettres, chiffres et . + # - seulement (ex. node, c#, react-native).');
      return;
    }
    if (value.includes(tag) || full) return;
    onChange([...value, tag]);
    setText('');
    setHint(null);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
      const choice =
        open && suggestions[active] && !text.includes(',') ? suggestions[active] : null;
      if (event.key === 'Tab' && !text && !choice) return;
      if (text || choice) {
        event.preventDefault();
        add(choice && (event.key !== ',' || !text) ? choice.name : text);
      } else if (event.key === 'Enter') {
        event.preventDefault();
      }
    } else if (event.key === 'Backspace' && !text && value.length > 0) {
      onChange(value.slice(0, -1));
    } else if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      setActive((i) => Math.min(suggestions.length - 1, i + 1));
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value.join(',')} />
      <div
        className={cn(
          'input flex min-h-[44px] flex-wrap items-center gap-1.5 py-1.5',
          'focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/10',
          error && 'border-red-500',
        )}
        onClick={() => document.getElementById(id)?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 pl-2 pr-1 text-[13px] font-medium text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
          >
            <Hash size={12} className="text-stone-400" aria-hidden />
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Retirer le tag ${tag}`}
              className="rounded p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-700 dark:hover:text-white"
            >
              <X size={12} aria-hidden />
            </button>
          </span>
        ))}
        {!full && (
          <input
            id={id}
            value={text}
            onChange={(e) => {
              const next = e.target.value;
              // Coller « node, postgres » ajoute plusieurs tags d'un coup.
              if (next.includes(',')) {
                next.split(',').slice(0, -1).forEach(add);
                setText(next.split(',').at(-1) ?? '');
              } else setText(next);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              setTimeout(() => setOpen(false), 150);
              if (text) add(text);
            }}
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            placeholder={value.length ? 'Ajouter un tag' : 'postgres, flutter, paiement-mobile…'}
            className="min-w-[8rem] flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-stone-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        )}
      </div>

      {open && !full && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-lift dark:border-stone-700 dark:bg-stone-900"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.name}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                add(s.name);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-sm',
                i === active && 'bg-stone-100 dark:bg-stone-800',
              )}
            >
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Hash size={13} className="text-stone-400" aria-hidden />
                {s.name}
              </span>
              <span className="text-xs tabular-nums text-stone-400">
                {s.count} publication{s.count > 1 ? 's' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className={cn('mt-1.5 text-xs', error ? 'field-error mt-1.5' : 'text-stone-500')}>
        {error ??
          hint ??
          (full
            ? '5 tags maximum.'
            : `Entrée ou virgule pour ajouter · ${MAX_TAGS - value.length} restant${MAX_TAGS - value.length > 1 ? 's' : ''}`)}
      </p>
    </div>
  );
}
