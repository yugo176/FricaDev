import type { CreateCommentInput } from '@fricadev/shared';
import type { Prisma, PrismaClient } from '../../lib/prisma.js';
import { newId } from '../../lib/ids.js';
import { reputationOps } from '../reputation/reputation.ops.js';

const commentInclude = {
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
} satisfies Prisma.CommentInclude;

export type CommentRecord = Prisma.CommentGetPayload<{ include: typeof commentInclude }>;

export function createCommentsRepository(db: PrismaClient) {
  return {
    /** Réponse acceptée d'abord, puis les plus utiles, puis par date. */
    listForPost(postId: string): Promise<CommentRecord[]> {
      return db.comment.findMany({
        where: { postId, hidden: false },
        orderBy: [{ isAccepted: 'desc' }, { usefulCount: 'desc' }, { createdAt: 'asc' }],
        include: commentInclude,
        take: 200,
      });
    },

    countByAuthorSince(authorId: string, since: Date): Promise<number> {
      return db.comment.count({ where: { authorId, createdAt: { gte: since } } });
    },

    update(id: string, body: string): Promise<CommentRecord> {
      return db.comment.update({
        where: { id },
        data: { body, editedAt: new Date() },
        include: commentInclude,
      });
    },

    /** Masque (ou rétablit) une réponse en gardant le compteur de la publication juste. */
    async setHidden(comment: { id: string; postId: string; hidden: boolean }, hidden: boolean) {
      if (comment.hidden === hidden) return;
      await db.$transaction([
        db.comment.update({ where: { id: comment.id }, data: { hidden } }),
        db.post.update({
          where: { id: comment.postId },
          data: { commentCount: hidden ? { decrement: 1 } : { increment: 1 } },
        }),
      ]);
    },

    findById(id: string): Promise<CommentRecord | null> {
      return db.comment.findUnique({ where: { id }, include: commentInclude });
    },

    async viewerVotes(commentIds: string[], userId: string): Promise<Set<string>> {
      const rows = await db.commentVote.findMany({
        where: { userId, commentId: { in: commentIds } },
        select: { commentId: true },
      });
      return new Set(rows.map((r) => r.commentId));
    },

    async create(postId: string, authorId: string, input: CreateCommentInput) {
      const id = newId();
      const [comment] = await db.$transaction([
        db.comment.create({
          data: { id, postId, authorId, body: input.body, parentId: input.parentId },
          include: commentInclude,
        }),
        db.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
        db.outboxEvent.create({
          data: {
            id: newId(),
            type: 'comment.created',
            payload: { commentId: id, postId, authorId },
          },
        }),
      ]);
      return comment;
    },

    /** Une seule réponse acceptée par question : l'ancienne perd son statut (et ses points). */
    async accept(postId: string, comment: CommentRecord) {
      const previous = await db.comment.findFirst({ where: { postId, isAccepted: true } });
      if (previous?.id === comment.id) return;
      const postAuthor = await db.post.findUniqueOrThrow({
        where: { id: postId },
        select: { authorId: true },
      });
      const earnsPoints = (authorId: string) => authorId !== postAuthor.authorId;
      await db.$transaction([
        ...(previous
          ? [
              db.comment.update({ where: { id: previous.id }, data: { isAccepted: false } }),
              ...(earnsPoints(previous.authorId)
                ? reputationOps(db, previous.authorId, 'ANSWER_ACCEPTED', previous.id, -1)
                : []),
            ]
          : []),
        db.comment.update({ where: { id: comment.id }, data: { isAccepted: true } }),
        db.outboxEvent.create({
          data: {
            id: newId(),
            type: 'comment.accepted',
            payload: { commentId: comment.id, postId, answerAuthorId: comment.authorId },
          },
        }),
        ...(earnsPoints(comment.authorId)
          ? reputationOps(db, comment.authorId, 'ANSWER_ACCEPTED', comment.id)
          : []),
      ]);
    },

    async setVote(comment: CommentRecord, userId: string, on: boolean) {
      const key = { userId_commentId: { userId, commentId: comment.id } };
      const existing = await db.commentVote.findUnique({ where: key });
      if (on === Boolean(existing)) return;
      await db.$transaction([
        on
          ? db.commentVote.create({ data: { userId, commentId: comment.id } })
          : db.commentVote.delete({ where: key }),
        db.comment.update({
          where: { id: comment.id },
          data: { usefulCount: on ? { increment: 1 } : { decrement: 1 } },
        }),
        ...reputationOps(db, comment.authorId, 'ANSWER_USEFUL', comment.id, on ? 1 : -1),
      ]);
    },
  };
}

export type CommentsRepository = ReturnType<typeof createCommentsRepository>;
