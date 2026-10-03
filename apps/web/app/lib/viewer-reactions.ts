import { useEffect, useRef, useState } from 'react';
import { useFetcher, useRouteLoaderData } from 'react-router';
import type { ReactionType } from '@fricadev/shared';

const BATCH = 30;

/** Profil du visiteur (chargé par root.tsx), pour savoir s'il peut réagir et si c'est sa publication. */
export function useViewerProfile() {
  return useRouteLoaderData<{ profile: { handle: string } | null }>('root')?.profile ?? null;
}

/**
 * Réactions du visiteur sur les publications affichées, chargées par lots de 30 après l'affichage.
 * Le fil reste ainsi identique pour tout le monde (et donc en cache). `undefined` = pas encore connu.
 */
export function useViewerReactions(postIds: string[]) {
  const profile = useViewerProfile();
  const fetcher = useFetcher<Record<string, ReactionType[]>>();
  const [known, setKnown] = useState<Record<string, ReactionType[]>>({});
  const requested = useRef(new Set<string>());
  const pending = useRef<string[]>([]);

  // Réponse reçue : les publications sans réaction sont marquées « aucune ».
  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    const answer = fetcher.data;
    setKnown((current) => {
      const next = { ...current };
      for (const id of pending.current) next[id] = answer[id] ?? [];
      return next;
    });
    pending.current = [];
  }, [fetcher.state, fetcher.data]);

  const key = postIds.join(',');
  useEffect(() => {
    if (!profile || fetcher.state !== 'idle') return;
    const missing = postIds.filter((id) => !requested.current.has(id)).slice(0, BATCH);
    if (missing.length === 0) return;
    for (const id of missing) requested.current.add(id);
    pending.current = missing;
    fetcher.load(`/api/viewer-reactions?ids=${missing.join(',')}`);
  }, [key, profile, fetcher.state]);

  return profile ? known : null;
}
