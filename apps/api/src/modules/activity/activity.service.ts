import {
  decodeActivityCursor,
  encodeActivityCursor,
  excerpt,
  type ActivityDto,
  type ActivityFilter,
  type ActivityKind,
  type ActivityQuery,
  type ActivitySummaryDto,
  type ApplicationStatus,
  type Page,
} from '@fricadev/shared';
import { Prisma, type PrismaClient } from '../../lib/prisma.js';

interface ActivityRow {
  kind: ActivityKind;
  at: Date;
  rid: string;
  post_id: string;
  comment_id: string | null;
  comment_body: string | null;
  app_role: string | null;
  app_status: ApplicationStatus | null;
}

const authorSelect = {
  id: true,
  handle: true,
  displayName: true,
  avatarUrl: true,
  countryCode: true,
} as const;

/** Branches de l'union utiles pour un onglet (toutes pour « Tout »). */
export function branchesFor(filter?: ActivityFilter) {
  return {
    likes: !filter || filter === 'likes',
    useful: !filter || filter === 'useful',
    comments: !filter || filter === 'comments',
    applications: !filter || filter === 'applications',
    posts: !filter || filter === 'posts',
  };
}

/**
 * Historique privé de la personne connectée : réactions, réponses, candidatures et publications,
 * fusionnés en une seule requête triée par date (pagination par curseur `date|identifiant`).
 */
export function createActivityService(db: PrismaClient) {
  return {
    async list(userId: string, query: ActivityQuery): Promise<Page<ActivityDto>> {
      const b = branchesFor(query.type);
      // SQL brut : Prisma ne préfixe pas le schéma « app » ; unaccent comme la recherche globale.
      const titleFilter = query.q
        ? Prisma.sql`AND public.unaccent(p.title) ILIKE public.unaccent(${`%${query.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`})`
        : Prisma.empty;
      const branches: Prisma.Sql[] = [];
      if (b.likes || b.useful) {
        const typeFilter =
          b.likes && b.useful
            ? Prisma.empty
            : Prisma.sql`AND r.type = ${b.likes ? 'LIKE' : 'USEFUL'}::app."ReactionType"`;
        branches.push(Prisma.sql`
          SELECT CASE WHEN r.type = 'LIKE' THEN 'like' ELSE 'useful' END AS kind,
                 r."createdAt" AS at, r."postId"::text || ':' || r.type::text AS rid,
                 r."postId" AS post_id, NULL::uuid AS comment_id, NULL::text AS comment_body,
                 NULL::text AS app_role, NULL::text AS app_status
          FROM app."Reaction" r JOIN app."Post" p ON p.id = r."postId"
          WHERE r."userId" = ${userId}::uuid AND p.status = 'PUBLISHED' ${typeFilter} ${titleFilter}`);
      }
      if (b.comments) {
        branches.push(Prisma.sql`
          SELECT 'comment' AS kind, c."createdAt" AS at, c.id::text AS rid, c."postId" AS post_id,
                 c.id AS comment_id, c.body AS comment_body, NULL::text AS app_role, NULL::text AS app_status
          FROM app."Comment" c JOIN app."Post" p ON p.id = c."postId"
          WHERE c."authorId" = ${userId}::uuid AND c.hidden = false AND p.status = 'PUBLISHED' ${titleFilter}`);
      }
      if (b.applications) {
        branches.push(Prisma.sql`
          SELECT 'application' AS kind, a."createdAt" AS at, a.id::text AS rid, o."postId" AS post_id,
                 NULL::uuid AS comment_id, NULL::text AS comment_body, o.role AS app_role, a.status::text AS app_status
          FROM app."TeamApplication" a
            JOIN app."TeamOpening" o ON o.id = a."openingId"
            JOIN app."Post" p ON p.id = o."postId"
          WHERE a."applicantId" = ${userId}::uuid AND a.status <> 'WITHDRAWN' AND p.status = 'PUBLISHED' ${titleFilter}`);
      }
      if (b.posts) {
        branches.push(Prisma.sql`
          SELECT 'post' AS kind, p."createdAt" AS at, p.id::text AS rid, p.id AS post_id,
                 NULL::uuid AS comment_id, NULL::text AS comment_body, NULL::text AS app_role, NULL::text AS app_status
          FROM app."Post" p
          WHERE p."authorId" = ${userId}::uuid AND p.status = 'PUBLISHED' ${titleFilter}`);
      }

      const cursor = query.cursor ? decodeActivityCursor(query.cursor) : null;
      const after = cursor
        ? Prisma.sql`WHERE (t.at, t.rid) < (${cursor.at}, ${cursor.id})`
        : Prisma.empty;
      const rows = await db.$queryRaw<ActivityRow[]>`
        SELECT * FROM (${Prisma.join(branches, ' UNION ALL ')}) AS t
        ${after}
        ORDER BY t.at DESC, t.rid DESC
        LIMIT ${query.limit + 1}`;

      const page = rows.slice(0, query.limit);
      const posts = await db.post.findMany({
        where: { id: { in: [...new Set(page.map((r) => r.post_id))] } },
        select: {
          id: true,
          type: true,
          title: true,
          likeCount: true,
          usefulCount: true,
          commentCount: true,
          author: { select: authorSelect },
        },
      });
      const byId = new Map(posts.map((p) => [p.id, p]));

      const items = page.flatMap((row): ActivityDto[] => {
        const post = byId.get(row.post_id);
        if (!post) return [];
        return [
          {
            id: row.rid,
            kind: row.kind,
            at: row.at.toISOString(),
            post,
            ...(row.comment_id
              ? { comment: { id: row.comment_id, excerpt: excerpt(row.comment_body ?? '', 140) } }
              : {}),
            ...(row.app_role && row.app_status
              ? { application: { role: row.app_role, status: row.app_status } }
              : {}),
          },
        ];
      });
      const last = page.at(-1);
      return {
        items,
        nextCursor:
          rows.length > query.limit && last
            ? encodeActivityCursor(last.at.toISOString(), last.rid)
            : null,
      };
    },

    async summary(userId: string): Promise<ActivitySummaryDto> {
      const [row] = await db.$queryRaw<Record<keyof ActivitySummaryDto, number>[]>`
        SELECT
          (SELECT count(*)::int FROM app."Reaction" r JOIN app."Post" p ON p.id = r."postId"
            WHERE r."userId" = ${userId}::uuid AND r.type = 'LIKE' AND p.status = 'PUBLISHED') AS likes,
          (SELECT count(*)::int FROM app."Reaction" r JOIN app."Post" p ON p.id = r."postId"
            WHERE r."userId" = ${userId}::uuid AND r.type = 'USEFUL' AND p.status = 'PUBLISHED') AS useful,
          (SELECT count(*)::int FROM app."Comment" c JOIN app."Post" p ON p.id = c."postId"
            WHERE c."authorId" = ${userId}::uuid AND c.hidden = false AND p.status = 'PUBLISHED') AS comments,
          (SELECT count(*)::int FROM app."TeamApplication" a
             JOIN app."TeamOpening" o ON o.id = a."openingId" JOIN app."Post" p ON p.id = o."postId"
            WHERE a."applicantId" = ${userId}::uuid AND a.status <> 'WITHDRAWN' AND p.status = 'PUBLISHED') AS applications,
          (SELECT count(*)::int FROM app."Post" p
            WHERE p."authorId" = ${userId}::uuid AND p.status = 'PUBLISHED') AS posts`;
      return row!;
    },
  };
}

export type ActivityService = ReturnType<typeof createActivityService>;
