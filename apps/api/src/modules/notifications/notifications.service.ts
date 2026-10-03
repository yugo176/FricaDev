import {
  NOTIFICATION_REASON_KEYS,
  NOTIFICATION_REASONS,
  type BulkNotificationsInput,
  type ListNotificationsQuery,
  type NotificationDto,
  type NotificationFilters,
  type NotificationsSummaryDto,
  type Page,
} from '@fricadev/shared';
import type { Prisma, PrismaClient } from '../../lib/prisma.js';

type Row = Prisma.NotificationGetPayload<object>;

function toDto(row: Row): NotificationDto {
  return {
    id: row.id,
    kind: row.kind as NotificationDto['kind'],
    payload: row.payload as NotificationDto['payload'],
    readAt: row.readAt?.toISOString() ?? null,
    pinnedAt: row.pinnedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Filtres de la boîte de réception traduits en conditions Prisma (hors recherche texte). */
export function filtersToWhere(
  userId: string,
  filters: NotificationFilters,
): Prisma.NotificationWhereInput {
  return {
    userId,
    ...(filters.view === 'inbox' ? { archivedAt: null } : {}),
    ...(filters.view === 'pinned' ? { pinnedAt: { not: null } } : {}),
    ...(filters.view === 'archived' ? { archivedAt: { not: null } } : {}),
    ...(filters.unread ? { readAt: null } : {}),
    ...(filters.reason ? { kind: { in: [...NOTIFICATION_REASONS[filters.reason]] } } : {}),
    ...(filters.postId ? { postId: filters.postId } : {}),
  };
}

export function actionData(
  action: BulkNotificationsInput['action'],
  now = new Date(),
): Prisma.NotificationUpdateManyMutationInput {
  switch (action) {
    case 'read':
      return { readAt: now };
    case 'unread':
      return { readAt: null };
    case 'pin':
      return { pinnedAt: now };
    case 'unpin':
      return { pinnedAt: null };
    case 'archive':
      // Archiver une notification la marque aussi comme lue.
      return { archivedAt: now, readAt: now };
    case 'unarchive':
      return { archivedAt: null };
  }
}

const count = (c: unknown) => (c as { _all?: number } | undefined)?._all ?? 0;

/** Lecture et rangement des notifications ; leur création est faite par le worker (outbox). */
export function createNotificationsService(db: PrismaClient) {
  /** Recherche insensible à la casse dans le payload JSON (nom de la personne, titre). */
  async function searchIds(userId: string, q: string): Promise<string[]> {
    const pattern = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM app."Notification"
      WHERE "userId" = ${userId}::uuid AND payload::text ILIKE ${pattern}
      ORDER BY id DESC LIMIT 500`;
    return rows.map((r) => r.id);
  }

  async function where(userId: string, filters: NotificationFilters) {
    const base = filtersToWhere(userId, filters);
    if (!filters.q) return base;
    return { ...base, id: { in: await searchIds(userId, filters.q) } };
  }

  return {
    async list(userId: string, query: ListNotificationsQuery): Promise<Page<NotificationDto>> {
      const filter = await where(userId, query);
      const rows = await db.notification.findMany({
        where: query.cursor ? { AND: [filter, { id: { lt: query.cursor } }] } : filter,
        // UUIDv7 : l'ordre des id suit l'ordre de création, d'où un curseur stable.
        orderBy: { id: 'desc' },
        take: query.limit + 1,
      });
      const items = rows.slice(0, query.limit).map(toDto);
      return { items, nextCursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null };
    },

    async summary(userId: string): Promise<NotificationsSummaryDto> {
      const inbox = { userId, archivedAt: null };
      const [unread, pinned, byKind, byPost] = await db.$transaction([
        db.notification.count({ where: { ...inbox, readAt: null } }),
        db.notification.count({ where: { userId, pinnedAt: { not: null } } }),
        db.notification.groupBy({
          by: ['kind'],
          where: { ...inbox, readAt: null },
          orderBy: { kind: 'asc' },
          _count: { _all: true },
        }),
        db.notification.groupBy({
          by: ['postId'],
          where: { ...inbox, postId: { not: null } },
          orderBy: { _count: { postId: 'desc' } },
          take: 8,
          _count: { _all: true },
        }),
      ]);

      const reasons = Object.fromEntries(
        NOTIFICATION_REASON_KEYS.map((reason) => [
          reason,
          byKind
            .filter((k) => (NOTIFICATION_REASONS[reason] as readonly string[]).includes(k.kind))
            .reduce((n, k) => n + count(k._count), 0),
        ]),
      ) as NotificationsSummaryDto['reasons'];

      const postIds = byPost.flatMap((p) => (p.postId ? [p.postId] : []));
      if (postIds.length === 0) return { unread, pinned, reasons, posts: [] };

      const [titles, unreadByPost] = await db.$transaction([
        db.notification.findMany({
          where: { userId, postId: { in: postIds } },
          distinct: ['postId'],
          orderBy: { postId: 'asc' },
          select: { postId: true, payload: true },
        }),
        db.notification.groupBy({
          by: ['postId'],
          where: { ...inbox, readAt: null, postId: { in: postIds } },
          orderBy: { postId: 'asc' },
          _count: { _all: true },
        }),
      ]);
      const titleOf = new Map(
        titles.map((t) => [t.postId, (t.payload as { postTitle?: string }).postTitle ?? '']),
      );
      const unreadOf = new Map(unreadByPost.map((u) => [u.postId, count(u._count)]));

      return {
        unread,
        pinned,
        reasons,
        posts: byPost.flatMap((p) =>
          p.postId
            ? [
                {
                  postId: p.postId,
                  postTitle: titleOf.get(p.postId) || 'Publication',
                  count: count(p._count),
                  unread: unreadOf.get(p.postId) ?? 0,
                },
              ]
            : [],
        ),
      };
    },

    unreadCount(userId: string): Promise<number> {
      return db.notification.count({ where: { userId, archivedAt: null, readAt: null } });
    },

    async bulk(userId: string, input: BulkNotificationsInput): Promise<number> {
      const { count: updated } = await db.notification.updateMany({
        where: { userId, id: { in: input.ids } },
        data: actionData(input.action),
      });
      return updated;
    },

    async markAllRead(userId: string, filters: NotificationFilters): Promise<void> {
      await db.notification.updateMany({
        where: { ...(await where(userId, filters)), readAt: null },
        data: { readAt: new Date() },
      });
    },

    /** Notification à ouvrir : marquée comme lue au passage, renvoyée pour connaître sa cible. */
    async open(userId: string, id: string): Promise<NotificationDto | null> {
      const row = await db.notification.findFirst({ where: { id, userId } });
      if (!row) return null;
      if (!row.readAt) {
        await db.notification.update({ where: { id }, data: { readAt: new Date() } });
      }
      return toDto(row);
    },
  };
}

export type NotificationsService = ReturnType<typeof createNotificationsService>;
