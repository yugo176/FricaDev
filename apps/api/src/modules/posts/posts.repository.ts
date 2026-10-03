import {
  codePreview,
  excerpt,
  type CreatePostInput,
  type ListPostsQuery,
  type PostDetails,
  type ReactionType,
  type UpdatePostInput,
} from '@fricadev/shared';
import { Prisma, type PrismaClient } from '../../lib/prisma.js';
import { newId } from '../../lib/ids.js';
import { reputationOps } from '../reputation/reputation.ops.js';

const postInclude = {
  author: {
    select: {
      id: true,
      handle: true,
      displayName: true,
      avatarUrl: true,
      countryCode: true,
      reputation: true,
    },
  },
  tags: { select: { tag: { select: { name: true } } } },
  community: { select: { slug: true, name: true } },
} satisfies Prisma.PostInclude;

export type PostRecord = Prisma.PostGetPayload<{ include: typeof postInclude }>;

/** Sélection des listes : tout sauf `body`, que les listes n'ont jamais besoin de lire. */
const summarySelect = {
  id: true,
  type: true,
  title: true,
  excerpt: true,
  codePreview: true,
  details: true,
  reactionCount: true,
  likeCount: true,
  usefulCount: true,
  commentCount: true,
  createdAt: true,
  author: postInclude.author,
  tags: postInclude.tags,
  community: postInclude.community,
} satisfies Prisma.PostSelect;

/** Champs propres au type, déjà filtrés et complétés par le service. */
type WithDetails = { details: PostDetails | null };

export type PostSummaryRecord = Prisma.PostGetPayload<{ select: typeof summarySelect }>;

/** Seule couche qui parle à la base pour ce module : le jour où « posts » devient un
 *  microservice, on ne déplace que ce module. */
export function createPostsRepository(db: PrismaClient) {
  /** Les tags existent indépendamment des publications : création idempotente, puis lecture. */
  async function ensureTags(names: string[]) {
    const tagNames = [...new Set(names)];
    if (tagNames.length === 0) return [];
    await db.tag.createMany({
      data: tagNames.map((name) => ({ id: newId(), name })),
      skipDuplicates: true,
    });
    return db.tag.findMany({ where: { name: { in: tagNames } }, select: { id: true } });
  }

  return {
    async list({
      cursor,
      limit,
      type,
      author,
      tag,
      community,
    }: ListPostsQuery): Promise<PostSummaryRecord[]> {
      return db.post.findMany({
        where: {
          status: 'PUBLISHED',
          ...(cursor ? { id: { lt: cursor } } : {}),
          ...(type ? { type } : {}),
          ...(author ? { author: { handle: author } } : {}),
          ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
          ...(community ? { community: { slug: community } } : {}),
        },
        orderBy: { id: 'desc' },
        take: limit + 1,
        select: summarySelect,
      });
    },

    /** Fil « Abonnements » : devs suivis et communautés rejointes. */
    async listFollowing(
      userId: string,
      { cursor, limit }: ListPostsQuery,
    ): Promise<PostSummaryRecord[]> {
      return db.post.findMany({
        where: {
          status: 'PUBLISHED',
          ...(cursor ? { id: { lt: cursor } } : {}),
          OR: [
            { author: { followers: { some: { followerId: userId } } } },
            { community: { members: { some: { userId } } } },
          ],
        },
        orderBy: { id: 'desc' },
        take: limit + 1,
        select: summarySelect,
      });
    },

    findManyByIds(ids: string[]): Promise<PostSummaryRecord[]> {
      if (ids.length === 0) return Promise.resolve([]);
      return db.post.findMany({ where: { id: { in: ids } }, select: summarySelect });
    },

    async findById(id: string): Promise<PostRecord | null> {
      return db.post.findUnique({ where: { id }, include: postInclude });
    },

    async hasAcceptedAnswer(postId: string): Promise<boolean> {
      return (await db.comment.count({ where: { postId, isAccepted: true } })) > 0;
    },

    /** Réactions du visiteur sur plusieurs publications d'un coup (cartes du fil). */
    async viewerReactionsMany(
      postIds: string[],
      userId: string,
    ): Promise<Record<string, ReactionType[]>> {
      const rows = await db.reaction.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true, type: true },
      });
      const byPost: Record<string, ReactionType[]> = {};
      for (const row of rows) (byPost[row.postId] ??= []).push(row.type);
      return byPost;
    },

    async viewerReactions(postId: string, userId: string): Promise<ReactionType[]> {
      const rows = await db.reaction.findMany({
        where: { postId, userId },
        select: { type: true },
      });
      return rows.map((r) => r.type);
    },

    countByAuthorSince(authorId: string, since: Date): Promise<number> {
      return db.post.count({ where: { authorId, createdAt: { gte: since } } });
    },

    setStatus(postId: string, status: 'PUBLISHED' | 'HIDDEN') {
      return db.post.update({ where: { id: postId }, data: { status } });
    },

    async update(
      postId: string,
      input: Omit<UpdatePostInput, 'details'> & WithDetails,
    ): Promise<PostRecord> {
      const tags = await ensureTags(input.tags);
      const [, post] = await db.$transaction([
        db.postTag.deleteMany({ where: { postId } }),
        db.post.update({
          where: { id: postId },
          data: {
            title: input.title,
            body: input.body,
            excerpt: excerpt(input.body),
            codePreview: codePreview(input.body),
            details: input.details ?? Prisma.DbNull,
            editedAt: new Date(),
            tags: { create: tags.map((tag) => ({ tagId: tag.id })) },
          },
          include: postInclude,
        }),
      ]);
      return post;
    },

    async create(
      authorId: string,
      input: Omit<CreatePostInput, 'details'> & WithDetails,
    ): Promise<PostRecord> {
      const tags = await ensureTags(input.tags);

      // Publication + événement outbox dans une transaction en lot : un seul aller-retour,
      // sans transaction interactive qui expire quand la base est loin.
      const postId = newId();
      const [post] = await db.$transaction([
        db.post.create({
          data: {
            id: postId,
            type: input.type,
            title: input.title,
            body: input.body,
            excerpt: excerpt(input.body),
            codePreview: codePreview(input.body),
            details: input.details ?? Prisma.DbNull,
            authorId,
            communityId: input.communityId,
            tags: { create: tags.map((tag) => ({ tagId: tag.id })) },
          },
          include: postInclude,
        }),
        db.outboxEvent.create({
          data: { id: newId(), type: 'post.created', payload: { postId, authorId } },
        }),
      ]);
      return post;
    },

    /** Ajoute une réaction ; renvoie false si elle existait déjà. */
    async addReaction(post: PostRecord, userId: string, type: ReactionType): Promise<boolean> {
      const existing = await db.reaction.findUnique({
        where: { userId_postId_type: { userId, postId: post.id, type } },
      });
      if (existing) return false;
      await db.$transaction([
        db.reaction.create({ data: { userId, postId: post.id, type } }),
        db.post.update({
          where: { id: post.id },
          data: {
            reactionCount: { increment: 1 },
            [type === 'USEFUL' ? 'usefulCount' : 'likeCount']: { increment: 1 },
          },
        }),
        ...reputationOps(
          db,
          post.authorId,
          type === 'USEFUL' ? 'POST_USEFUL' : 'POST_LIKED',
          post.id,
        ),
      ]);
      return true;
    },

    async removeReaction(post: PostRecord, userId: string, type: ReactionType): Promise<boolean> {
      const existing = await db.reaction.findUnique({
        where: { userId_postId_type: { userId, postId: post.id, type } },
      });
      if (!existing) return false;
      await db.$transaction([
        db.reaction.delete({ where: { userId_postId_type: { userId, postId: post.id, type } } }),
        db.post.update({
          where: { id: post.id },
          data: {
            reactionCount: { decrement: 1 },
            [type === 'USEFUL' ? 'usefulCount' : 'likeCount']: { decrement: 1 },
          },
        }),
        ...reputationOps(
          db,
          post.authorId,
          type === 'USEFUL' ? 'POST_USEFUL' : 'POST_LIKED',
          post.id,
          -1,
        ),
      ]);
      return true;
    },
  };
}

export type PostsRepository = ReturnType<typeof createPostsRepository>;
