import type { SearchResultsDto } from '@fricadev/shared';
import type { PrismaClient } from '../../lib/prisma.js';
import type { PostsRepository } from '../posts/posts.repository.js';
import { toPostSummaryDto } from '../posts/posts.service.js';

/**
 * Recherche plein texte PostgreSQL (configuration « simple » : pas de racinisation, adaptée à un
 * contenu mêlant français, anglais et code). Derrière cette interface, on pourra brancher un
 * moteur dédié (Meilisearch…) le jour où le volume l'exigera.
 * À ajouter quand le volume grandira : index GIN sur to_tsvector('simple', title || ' ' || body).
 */
export function createSearchService(db: PrismaClient, posts: PostsRepository) {
  return {
    async search(q: string): Promise<SearchResultsDto> {
      const term = q.trim();
      const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

      const [ranked, users, tags] = await Promise.all([
        // SQL brut : Prisma ne préfixe pas le schéma (« app ») comme dans ses requêtes générées.
        // unaccent (extension PostgreSQL) : la recherche ignore les accents.
        db.$queryRaw<{ id: string }[]>`
          SELECT id FROM app."Post"
          WHERE status = 'PUBLISHED'
            AND (
              to_tsvector('simple', public.unaccent(title || ' ' || body))
                @@ websearch_to_tsquery('simple', public.unaccent(${term}))
              OR public.unaccent(title) ILIKE public.unaccent(${like})
            )
          ORDER BY
            ts_rank(
              to_tsvector('simple', public.unaccent(title || ' ' || body)),
              websearch_to_tsquery('simple', public.unaccent(${term}))
            ) DESC,
            id DESC
          LIMIT 20`,
        db.user.findMany({
          where: {
            OR: [
              { handle: { contains: term.toLowerCase() } },
              { displayName: { contains: term, mode: 'insensitive' } },
            ],
          },
          orderBy: { reputation: 'desc' },
          take: 8,
          select: {
            handle: true,
            displayName: true,
            avatarUrl: true,
            countryCode: true,
            reputation: true,
          },
        }),
        db.tag.findMany({
          where: { name: { startsWith: term.toLowerCase().replace(/^#/, '') } },
          take: 10,
          select: { name: true },
        }),
      ]);

      const records = await posts.findManyByIds(ranked.map((r) => r.id));
      const byId = new Map(records.map((r) => [r.id, r]));
      return {
        posts: ranked.flatMap((r) => {
          const record = byId.get(r.id);
          return record ? [toPostSummaryDto(record)] : [];
        }),
        users,
        tags: tags.map((t) => t.name),
      };
    },
  };
}

export type SearchService = ReturnType<typeof createSearchService>;
