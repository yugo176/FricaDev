import { z } from 'zod';

/**
 * Pagination par curseur : jamais d'OFFSET, pour rester rapide quand les tables grossissent.
 * Le curseur est l'identifiant (UUIDv7, donc triable dans le temps) du dernier élément reçu.
 */
export const cursorQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});
export type CursorQuery = z.infer<typeof cursorQuerySchema>;

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
