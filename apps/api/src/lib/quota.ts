import { HttpError } from './errors.js';

/** Limites anti-spam par utilisateur (sur une fenêtre glissante). */
export const QUOTAS = {
  posts: { max: 10, windowMs: 60 * 60_000, label: 'publications par heure' },
  comments: { max: 30, windowMs: 60 * 60_000, label: 'réponses par heure' },
  reports: { max: 20, windowMs: 24 * 60 * 60_000, label: 'signalements par jour' },
} as const;

export type QuotaName = keyof typeof QUOTAS;

/**
 * Vérifie qu'un utilisateur n'a pas dépassé son quota. `countSince` compte ses créations
 * depuis la date donnée : la limite est exacte même avec plusieurs instances de l'API.
 */
export async function enforceQuota(name: QuotaName, countSince: (since: Date) => Promise<number>) {
  const quota = QUOTAS[name];
  const count = await countSince(new Date(Date.now() - quota.windowMs));
  if (count >= quota.max) {
    throw new HttpError(
      429,
      'quota_exceeded',
      `Limite atteinte : ${quota.max} ${quota.label}. Réessaie un peu plus tard.`,
    );
  }
}

export interface Viewer {
  id: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
}

export const canModerate = (viewer?: Viewer | null) =>
  viewer?.role === 'MODERATOR' || viewer?.role === 'ADMIN';
