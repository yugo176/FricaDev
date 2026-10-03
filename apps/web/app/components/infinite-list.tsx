import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import type { Page } from '@fricadev/shared';
import { PostCardSkeleton } from './ui';

interface InfiniteListProps<T extends { id: string }> {
  initial: Page<T>;
  /** Route ressource qui renvoie la page suivante (ex. /api/feed). */
  endpoint: string;
  /** Filtres de la liste : en changer réinitialise la liste. */
  params: Record<string, string | null | undefined>;
  renderItem?: (item: T) => React.ReactNode;
  /** Rendu de toute la liste d'un coup (regroupements, sélection multiple) au lieu de renderItem. */
  renderItems?: (items: T[]) => React.ReactNode;
  /**
   * Repartir de la première page quand le loader est rechargé (après une action).
   * À désactiver quand les actions sont affichées localement, pour garder les pages déjà chargées.
   */
  resetOnRevalidate?: boolean;
  empty: React.ReactNode;
  /** Silhouette affichée pendant le chargement de la page suivante. */
  skeleton?: React.ReactNode;
  endLabel?: string;
}

export function toQuery(params: Record<string, string | null | undefined>, cursor?: string) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  if (cursor) query.set('cursor', cursor);
  return query.toString();
}

/**
 * Liste à défilement infini, utilisée par le fil, les profils, les communautés et les postes :
 * - la première page est rendue côté serveur ;
 * - la suivante est demandée environ deux écrans avant la fin, pour qu'elle soit déjà là ;
 * - le navigateur ne dessine que les éléments visibles (content-visibility, voir app.css).
 */
export function InfiniteList<T extends { id: string }>({
  initial,
  endpoint,
  params,
  renderItem,
  renderItems,
  resetOnRevalidate = true,
  empty,
  skeleton = <PostCardSkeleton />,
  endLabel = 'Tu es à jour',
}: InfiniteListProps<T>) {
  const key = toQuery(params);
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const fetcher = useFetcher<Page<T>>();
  const sentinel = useRef<HTMLDivElement>(null);
  const requested = useRef<string | null>(null);

  // Nouveau filtre ou nouvelle navigation : on repart des données du serveur.
  useEffect(() => {
    setItems(initial.items);
    setCursor(initial.nextCursor);
    requested.current = null;
  }, [key, resetOnRevalidate ? initial : null]);

  // Ajout de la page reçue, sans doublon.
  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    const page = fetcher.data;
    setItems((current) => {
      const seen = new Set(current.map((item) => item.id));
      return [...current, ...page.items.filter((item) => !seen.has(item.id))];
    });
    setCursor(page.nextCursor);
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (fetcher.state !== 'idle' || requested.current === cursor) return;
        requested.current = cursor;
        fetcher.load(`${endpoint}?${toQuery(params, cursor)}`);
      },
      { rootMargin: '1500px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // `params` est représenté par `key` dans les dépendances.
  }, [cursor, key, endpoint, fetcher.state]);

  if (items.length === 0) return <>{empty}</>;

  return (
    <div className="space-y-3">
      {renderItems
        ? renderItems(items)
        : items.map((item) => (
            <div key={item.id} className="feed-item">
              {renderItem?.(item)}
            </div>
          ))}

      {cursor && (
        <div ref={sentinel}>
          {fetcher.state !== 'idle' && (
            <div className="space-y-3">
              {skeleton}
              {skeleton}
            </div>
          )}
          {/* Sans JavaScript (moteurs de recherche, très vieux navigateurs) : lien vers la suite. */}
          <noscript>
            <a href={`?${toQuery(params, cursor)}`}>Suite</a>
          </noscript>
        </div>
      )}

      {!cursor && items.length > 5 && (
        <p className="flex items-center justify-center gap-3 py-8 text-sm text-stone-400">
          <span className="h-px w-12 bg-stone-200 dark:bg-stone-800" />
          {endLabel}
          <span className="h-px w-12 bg-stone-200 dark:bg-stone-800" />
        </p>
      )}
    </div>
  );
}
