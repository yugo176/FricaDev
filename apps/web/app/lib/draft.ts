import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIX = 'fricadev:draft:';

/** Lecture prudente : le stockage peut être indisponible (navigation privée, quota plein…). */
export function readDraft<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: unknown) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Rien à faire : il n'y avait peut-être pas de brouillon.
  }
}

/**
 * Brouillon enregistré dans le navigateur, 800 ms après la dernière modification.
 * Rien n'est perdu si la connexion coupe ou si l'onglet se ferme.
 * `restored` : un brouillon a été retrouvé au chargement (pour afficher le bandeau).
 */
export function useDraft<T>(key: string | null, value: T, isEmpty: (value: T) => boolean) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const skipNext = useRef(true);
  const stopped = useRef(false);

  useEffect(() => {
    if (!key || stopped.current) return;
    // Le premier rendu correspond au contenu initial (ou restauré) : rien à enregistrer.
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (isEmpty(value)) {
        clearDraft(key);
        setSavedAt(null);
      } else if (writeDraft(key, { value, savedAt: Date.now() })) {
        setSavedAt(Date.now());
      }
    }, 800);
    return () => clearTimeout(timer.current);
  }, [key, value]);

  const clear = useCallback(() => {
    clearTimeout(timer.current);
    if (key) clearDraft(key);
    setSavedAt(null);
  }, [key]);

  /** Publication envoyée : plus aucun enregistrement, même différé. */
  const stop = useCallback(() => {
    stopped.current = true;
    clearTimeout(timer.current);
    if (key) clearDraft(key);
  }, [key]);

  /** Erreur du serveur : on reprend l'enregistrement du brouillon. */
  const resume = useCallback(() => {
    stopped.current = false;
  }, []);

  /** La prochaine valeur (brouillon restauré) n'est pas réenregistrée. */
  const skip = useCallback(() => {
    skipNext.current = true;
  }, []);

  return { savedAt, clear, skip, stop, resume };
}

/** « à l'instant », « il y a 3 min » : pour l'indication discrète du brouillon. */
export function savedLabel(savedAt: number, now = Date.now()) {
  const minutes = Math.floor((now - savedAt) / 60_000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  return `à ${new Date(savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}
