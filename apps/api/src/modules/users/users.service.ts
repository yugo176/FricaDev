import type { PrismaClient, User } from '../../lib/prisma.js';
import { handleSchema, updateProfileSchema, type PublicProfileDto } from '@fricadev/shared';
import { z } from 'zod';
import { HttpError } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';

export const createProfileSchema = updateProfileSchema.extend({
  handle: handleSchema,
  displayName: z.string().trim().min(2).max(60),
});

export function createUsersService(db: PrismaClient) {
  return {
    findByIdentity(identityId: string): Promise<User | null> {
      return db.user.findUnique({ where: { identityId } });
    },

    /** Le compte (identité) existe, mais le profil FricaDev doit être créé une fois. */
    async requireProfile(identityId: string): Promise<User> {
      const user = await db.user.findUnique({ where: { identityId } });
      if (!user) throw new HttpError(403, 'profile_required', 'Crée ton profil FricaDev d’abord');
      return user;
    },

    setAvatar(userId: string, avatarUrl: string | null) {
      return db.user.update({ where: { id: userId }, data: { avatarUrl } });
    },

    async upsertProfile(identityId: string, input: z.infer<typeof createProfileSchema>) {
      const taken = await db.user.findUnique({ where: { handle: input.handle } });
      if (taken && taken.identityId !== identityId) {
        throw new HttpError(409, 'handle_taken', 'Ce pseudo est déjà pris');
      }
      return db.user.upsert({
        where: { identityId },
        create: { id: newId(), identityId, ...input, skills: input.skills ?? [] },
        update: input,
      });
    },

    findByHandle(handle: string) {
      return db.user.findUnique({
        where: { handle },
        select: {
          id: true,
          handle: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          countryCode: true,
          skills: true,
          reputation: true,
          createdAt: true,
        },
      });
    },

    async publicProfile(handle: string, viewerId?: string): Promise<PublicProfileDto | null> {
      const user = await this.findByHandle(handle);
      if (!user) return null;
      const [posts, answers, acceptedAnswers, followers, following, isFollowing] =
        await Promise.all([
          db.post.count({ where: { authorId: user.id, status: 'PUBLISHED' } }),
          db.comment.count({ where: { authorId: user.id } }),
          db.comment.count({ where: { authorId: user.id, isAccepted: true } }),
          db.follow.count({ where: { followeeId: user.id } }),
          db.follow.count({ where: { followerId: user.id } }),
          viewerId
            ? db.follow.findUnique({
                where: { followerId_followeeId: { followerId: viewerId, followeeId: user.id } },
              })
            : Promise.resolve(null),
        ]);
      return {
        ...user,
        createdAt: user.createdAt.toISOString(),
        stats: { posts, answers, acceptedAnswers, followers, following },
        ...(viewerId
          ? { viewer: { isFollowing: Boolean(isFollowing), isMe: viewerId === user.id } }
          : {}),
      };
    },

    async setFollow(handle: string, followerId: string, on: boolean) {
      const target = await db.user.findUnique({ where: { handle }, select: { id: true } });
      if (!target) throw new HttpError(404, 'not_found', 'Utilisateur introuvable');
      if (target.id === followerId) {
        throw new HttpError(400, 'self_follow', 'Tu ne peux pas te suivre toi-même');
      }
      const key = { followerId_followeeId: { followerId, followeeId: target.id } };
      const existing = await db.follow.findUnique({ where: key });
      if (on && !existing) {
        await db.$transaction([
          db.follow.create({ data: { followerId, followeeId: target.id } }),
          db.outboxEvent.create({
            data: {
              id: newId(),
              type: 'user.followed',
              payload: { followerId, followeeId: target.id },
            },
          }),
        ]);
      } else if (!on && existing) {
        await db.follow.delete({ where: key });
      }
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
