import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Users, X } from 'lucide-react';
import type { CommunityDto } from '@fricadev/shared';
import { matchesCommunity, sortCommunities } from '~/lib/community-ui';
import { CommunityIcon } from './community-card';
import { cn } from './ui';

const SHORTCUTS = 3;

type Option = { id: string; community: CommunityDto | null };

function NoneIcon({ size = 24 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center text-stone-400"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Users size={Math.round(size * 0.55)} />
    </span>
  );
}

/**
 * Choix de la communauté d'une publication : recherche, groupes (les miennes, technos, pays),
 * clavier (↑ ↓ Entrée Échap). La valeur part dans un champ caché : l'action du formulaire ne change pas.
 */
export function CommunityPicker({
  id,
  name,
  communities,
  defaultValue = '',
  onChange,
}: {
  id: string;
  name: string;
  communities: CommunityDto[];
  defaultValue?: string;
  /** Prévenu à chaque choix (brouillon, aperçu). */
  onChange?: (communityId: string) => void;
}) {
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(() => sortCommunities(communities), [communities]);
  const selected = sorted.find((c) => c.id === value) ?? null;
  const mine = sorted.filter((c) => c.viewer?.isMember);

  const groups = useMemo(() => {
    const visible = sorted.filter((c) => matchesCommunity(c, query));
    return [
      { label: 'Mes communautés', items: visible.filter((c) => c.viewer?.isMember) },
      {
        label: 'Technologies',
        items: visible.filter((c) => !c.viewer?.isMember && c.type === 'TECH'),
      },
      {
        label: 'Pays',
        items: visible
          .filter((c) => !c.viewer?.isMember && c.type === 'COUNTRY')
          .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      },
    ].filter((g) => g.items.length > 0);
  }, [sorted, query]);

  // Liste à plat dans l'ordre d'affichage, pour la navigation au clavier.
  const options: Option[] = useMemo(
    () => [
      ...(query ? [] : [{ id: '', community: null }]),
      ...groups.flatMap((g) => g.items.map((c) => ({ id: c.id, community: c }))),
    ],
    [groups, query],
  );
  const optionId = (index: number) => `${listId}-opt-${index}`;

  function openList() {
    setQuery('');
    setOpen(true);
  }
  function close(focusTrigger = true) {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }
  function choose(next: string) {
    setValue(next);
    onChange?.(next);
    close();
  }

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    // À l'ouverture, on part de la communauté déjà choisie.
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.id === value),
      ),
    );
    searchRef.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter') {
      // Entrée choisit l'option : elle ne doit pas envoyer le formulaire.
      event.preventDefault();
      const option = options[active];
      if (option) choose(option.id);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      close(false);
    }
  }

  let index = query ? 0 : 1;
  const renderOption = (option: Option, i: number) => {
    const isSelected = option.id === value;
    const c = option.community;
    return (
      <li
        key={option.id || 'none'}
        id={optionId(i)}
        role="option"
        aria-selected={isSelected}
        onPointerEnter={() => setActive(i)}
        onClick={() => choose(option.id)}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm',
          i === active && 'bg-stone-100 dark:bg-stone-800',
        )}
      >
        {c ? <CommunityIcon community={c} size={28} /> : <NoneIcon size={28} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{c ? c.name : 'Aucune communauté'}</span>
          <span className="block truncate text-xs text-stone-500">
            {c
              ? `${c.memberCount} membre${c.memberCount > 1 ? 's' : ''}`
              : 'Visible seulement dans le fil général'}
          </span>
        </span>
        {isSelected && <Check size={16} className="shrink-0 text-brand-600" aria-hidden />}
      </li>
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            openList();
          }
        }}
        className="input flex items-center gap-3 py-2 text-left"
      >
        {selected ? <CommunityIcon community={selected} size={28} /> : <NoneIcon size={28} />}
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-stone-400')}>
          {selected ? selected.name : 'Aucune communauté'}
        </span>
        <ChevronDown
          size={18}
          className={cn('shrink-0 text-stone-400 transition', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {mine.length > 0 && !open && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-stone-500">Les tiennes :</span>
          {mine.slice(0, SHORTCUTS).map((c) => {
            const isSelected = c.id === value;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setValue(isSelected ? '' : c.id);
                  onChange?.(isSelected ? '' : c.id);
                }}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-full border pl-1 pr-2.5 text-xs font-medium transition',
                  isSelected
                    ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-800/30 dark:text-brand-100'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300',
                )}
              >
                <CommunityIcon community={c} size={20} />
                {c.name}
                {isSelected && <X size={12} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lift dark:border-stone-700 dark:bg-stone-900">
          <div className="flex items-center gap-2 border-b border-stone-200 px-3.5 dark:border-stone-800">
            <Search size={16} className="shrink-0 text-stone-400" aria-hidden />
            <input
              ref={searchRef}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={options[active] ? optionId(active) : undefined}
              aria-label="Chercher une communauté"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Chercher (ex. Sénégal, React)…"
              className="h-11 w-full bg-transparent text-sm outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-stone-400"
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            aria-label="Communautés"
            className="max-h-80 overflow-y-auto overscroll-contain p-1.5"
          >
            {!query && renderOption({ id: '', community: null }, 0)}
            {groups.map((group) => (
              <li key={group.label} role="presentation">
                <p className="px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  {group.label}
                </p>
                <ul role="group" aria-label={group.label}>
                  {group.items.map((c) => renderOption({ id: c.id, community: c }, index++))}
                </ul>
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-stone-500">
                Aucune communauté pour « {query} »
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
