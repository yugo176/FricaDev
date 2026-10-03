import {
  AUTO_HIDE_THRESHOLD,
  excerpt,
  type CreateReportInput,
  type ReportQueueItemDto,
} from '@fricadev/shared';
import type { PrismaClient } from '../../lib/prisma.js';
import { HttpError, notFound } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';
import { enforceQuota } from '../../lib/quota.js';
import type { CommentsRepository } from '../comments/comments.repository.js';

type Target = { type: 'POST' | 'COMMENT'; id: string };

/**
 * Signalements et modération.
 * - Chaque membre signale un contenu une seule fois.
 * - À partir de AUTO_HIDE_THRESHOLD signalements distincts, le contenu est masqué en attendant
 *   la décision d'un modérateur (protection contre le spam la nuit et le week-end).
 * - Le modérateur masque définitivement ou rejette les signalements (le contenu réapparaît).
 */
export function createModerationService(db: PrismaClient, comments: CommentsRepository) {
  async function loadTarget({ type, id }: Target) {
    if (type === 'POST') {
      const post = await db.post.findUnique({
        where: { id },
        select: { id: true, status: true, authorId: true },
      });
      if (!post) throw notFound('Publication');
      return { authorId: post.authorId, visible: post.status === 'PUBLISHED' };
    }
    const comment = await db.comment.findUnique({
      where: { id },
      select: { id: true, hidden: true, authorId: true },
    });
    if (!comment) throw notFound('Réponse');
    return { authorId: comment.authorId, visible: !comment.hidden };
  }

  async function setVisibility({ type, id }: Target, visible: boolean) {
    if (type === 'POST') {
      await db.post.update({
        where: { id },
        data: { status: visible ? 'PUBLISHED' : 'HIDDEN' },
      });
      return;
    }
    const comment = await db.comment.findUniqueOrThrow({
      where: { id },
      select: { id: true, postId: true, hidden: true },
    });
    await comments.setHidden(comment, !visible);
  }

  return {
    async report(reporterId: string, input: CreateReportInput) {
      const target: Target = { type: input.targetType, id: input.targetId };
      const { authorId, visible } = await loadTarget(target);
      if (!visible) throw notFound('Contenu');
      if (authorId === reporterId) {
        throw new HttpError(400, 'own_content', 'Tu ne peux pas signaler ton propre contenu');
      }
      await enforceQuota('reports', (since) =>
        db.report.count({ where: { reporterId, createdAt: { gte: since } } }),
      );
      const existing = await db.report.findUnique({
        where: {
          reporterId_targetType_targetId: {
            reporterId,
            targetType: target.type,
            targetId: target.id,
          },
        },
      });
      if (existing) throw new HttpError(409, 'already_reported', 'Tu as déjà signalé ce contenu');

      await db.report.create({
        data: {
          id: newId(),
          reporterId,
          targetType: target.type,
          targetId: target.id,
          reason: input.reason,
          details: input.details,
        },
      });
      const open = await db.report.count({
        where: { targetType: target.type, targetId: target.id, status: 'OPEN' },
      });
      if (open >= AUTO_HIDE_THRESHOLD) await setVisibility(target, false);
    },

    /** File de modération : un élément par contenu signalé, le plus signalé d'abord. */
    async queue(): Promise<ReportQueueItemDto[]> {
      const reports = await db.report.findMany({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'asc' },
        take: 500,
      });
      const groups = new Map<string, typeof reports>();
      for (const report of reports) {
        const key = `${report.targetType}:${report.targetId}`;
        groups.set(key, [...(groups.get(key) ?? []), report]);
      }

      const items = await Promise.all(
        [...groups.values()].map(async (group): Promise<ReportQueueItemDto> => {
          const first = group[0]!;
          const base = {
            targetType: first.targetType,
            targetId: first.targetId,
            reportCount: group.length,
            reasons: [...new Set(group.map((r) => r.reason))],
            details: group.flatMap((r) => (r.details ? [r.details] : [])),
            firstReportedAt: first.createdAt.toISOString(),
          };
          const author = { select: { handle: true, displayName: true } } as const;
          if (first.targetType === 'POST') {
            const post = await db.post.findUnique({
              where: { id: first.targetId },
              select: { id: true, title: true, excerpt: true, status: true, author },
            });
            return {
              ...base,
              hidden: post?.status !== 'PUBLISHED',
              preview: post
                ? { title: post.title, excerpt: post.excerpt, author: post.author, postId: post.id }
                : null,
            };
          }
          const comment = await db.comment.findUnique({
            where: { id: first.targetId },
            select: { postId: true, body: true, hidden: true, author },
          });
          return {
            ...base,
            hidden: comment?.hidden ?? true,
            preview: comment
              ? {
                  title: null,
                  excerpt: excerpt(comment.body),
                  author: comment.author,
                  postId: comment.postId,
                }
              : null,
          };
        }),
      );
      return items.sort((a, b) => b.reportCount - a.reportCount);
    },

    async resolve(target: Target, moderatorId: string, action: 'hide' | 'dismiss') {
      await loadTarget(target);
      await setVisibility(target, action === 'dismiss');
      await db.report.updateMany({
        where: { targetType: target.type, targetId: target.id, status: 'OPEN' },
        data: {
          status: action === 'hide' ? 'RESOLVED' : 'REJECTED',
          resolution: action === 'hide' ? 'hidden' : 'dismissed',
          resolvedAt: new Date(),
          resolvedById: moderatorId,
        },
      });
    },
  };
}

export type ModerationService = ReturnType<typeof createModerationService>;
