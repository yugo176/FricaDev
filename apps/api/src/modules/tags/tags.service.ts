import type { PrismaClient } from '../../lib/prisma.js';

export interface TagSuggestionDto {
  name: string;
  count: number;
}

/** Suggestions de tags pendant la saisie : début du nom, les plus utilisés d'abord. */
export function createTagsService(db: PrismaClient) {
  return {
    async suggest(prefix: string, limit = 8): Promise<TagSuggestionDto[]> {
      const rows = await db.tag.findMany({
        where: prefix ? { name: { startsWith: prefix } } : {},
        select: { name: true, _count: { select: { posts: true } } },
        orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
        take: limit,
      });
      return rows.map((row) => ({ name: row.name, count: row._count.posts }));
    },
  };
}

export type TagsService = ReturnType<typeof createTagsService>;
