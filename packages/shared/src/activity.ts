import { z } from 'zod';
import type { PostSummaryDto } from './posts.js';
import type { ApplicationStatus } from './team.js';

/** Onglets de « Mon activité » (le type d'une ligne est plus précis : like, useful…). */
export const ACTIVITY_FILTERS = ['likes', 'useful', 'comments', 'applications', 'posts'] as const;
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

export type ActivityKind = 'like' | 'useful' | 'comment' | 'application' | 'post';

export const activityQuerySchema = z.object({
  type: z.enum(ACTIVITY_FILTERS).optional(),
  q: z.string().trim().max(80).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ActivityQuery = z.infer<typeof activityQuerySchema>;

/** Une action de la personne connectée, avec la publication concernée. */
export interface ActivityDto {
  /** Identifiant stable de la ligne (sert aussi au curseur). */
  id: string;
  kind: ActivityKind;
  at: string;
  post: Pick<
    PostSummaryDto,
    'id' | 'type' | 'title' | 'author' | 'likeCount' | 'usefulCount' | 'commentCount'
  >;
  comment?: { id: string; excerpt: string };
  application?: { role: string; status: ApplicationStatus };
}

export type ActivitySummaryDto = Record<ActivityFilter, number>;

/** Curseur de pagination : date et identifiant de la dernière ligne reçue. */
export function encodeActivityCursor(at: string, id: string) {
  return Buffer.from(`${at}|${id}`, 'utf8').toString('base64url');
}

export function decodeActivityCursor(cursor: string): { at: Date; id: string } | null {
  try {
    const [at, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    const date = new Date(at ?? '');
    if (!id || Number.isNaN(date.getTime())) return null;
    return { at: date, id };
  } catch {
    return null;
  }
}
