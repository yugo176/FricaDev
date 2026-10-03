import type { CommunityDto, CommunityType } from '@fricadev/shared';
import type { PrismaClient } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';

const select = {
  id: true,
  slug: true,
  name: true,
  type: true,
  description: true,
  countryCode: true,
  memberCount: true,
} as const;

export function createCommunitiesService(db: PrismaClient) {
  async function getBySlug(slug: string) {
    const community = await db.community.findUnique({ where: { slug }, select });
    if (!community) throw notFound('Communauté');
    return community;
  }

  async function memberships(userId: string | undefined, communityIds: string[]) {
    if (!userId || communityIds.length === 0) return null;
    const rows = await db.membership.findMany({
      where: { userId, communityId: { in: communityIds } },
      select: { communityId: true },
    });
    return new Set(rows.map((r) => r.communityId));
  }

  return {
    async list(type?: CommunityType, viewerId?: string): Promise<CommunityDto[]> {
      const rows = await db.community.findMany({
        where: type ? { type } : {},
        orderBy: [{ memberCount: 'desc' }, { name: 'asc' }],
        select,
      });
      const joined = await memberships(
        viewerId,
        rows.map((r) => r.id),
      );
      return rows.map((row) => ({
        ...row,
        ...(joined ? { viewer: { isMember: joined.has(row.id) } } : {}),
      }));
    },

    async get(slug: string, viewerId?: string): Promise<CommunityDto> {
      const community = await getBySlug(slug);
      const joined = await memberships(viewerId, [community.id]);
      return {
        ...community,
        ...(joined ? { viewer: { isMember: joined.has(community.id) } } : {}),
      };
    },

    async setMembership(slug: string, userId: string, join: boolean): Promise<CommunityDto> {
      const community = await getBySlug(slug);
      const key = { userId_communityId: { userId, communityId: community.id } };
      const existing = await db.membership.findUnique({ where: key });
      if (join !== Boolean(existing)) {
        await db.$transaction([
          join
            ? db.membership.create({ data: { userId, communityId: community.id } })
            : db.membership.delete({ where: key }),
          db.community.update({
            where: { id: community.id },
            data: { memberCount: join ? { increment: 1 } : { decrement: 1 } },
          }),
        ]);
      }
      return this.get(slug, userId);
    },

    /** Communautés rejointes par un utilisateur (pour le menu de l'éditeur). */
    async joinedBy(userId: string): Promise<CommunityDto[]> {
      const rows = await db.community.findMany({
        where: { members: { some: { userId } } },
        orderBy: { name: 'asc' },
        select,
      });
      return rows.map((row) => ({ ...row, viewer: { isMember: true } }));
    },
  };
}

export type CommunitiesService = ReturnType<typeof createCommunitiesService>;
