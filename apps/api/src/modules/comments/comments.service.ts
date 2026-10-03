import type { CommentDto, CreateCommentInput } from '@fricadev/shared';
import { HttpError, notFound } from '../../lib/errors.js';
import { canModerate, enforceQuota, type Viewer } from '../../lib/quota.js';
import type { PostsService } from '../posts/posts.service.js';
import type { CommentRecord, CommentsRepository } from './comments.repository.js';

function toDto(comment: CommentRecord): CommentDto {
  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    body: comment.body,
    isAccepted: comment.isAccepted,
    usefulCount: comment.usefulCount,
    author: comment.author,
    createdAt: comment.createdAt.toISOString(),
    editedAt: comment.editedAt?.toISOString() ?? null,
  };
}

export function createCommentsService(repo: CommentsRepository, posts: PostsService) {
  async function getComment(id: string) {
    const comment = await repo.findById(id);
    if (!comment || comment.hidden) throw notFound('Réponse');
    return comment;
  }

  return {
    async list(postId: string, viewer?: Viewer | null): Promise<CommentDto[]> {
      await posts.getPublished(postId);
      const rows = await repo.listForPost(postId);
      const votes = viewer
        ? await repo.viewerVotes(
            rows.map((r) => r.id),
            viewer.id,
          )
        : null;
      return rows.map((row) => ({
        ...toDto(row),
        ...(votes && viewer
          ? {
              viewer: {
                votedUseful: votes.has(row.id),
                isAuthor: row.authorId === viewer.id,
                canModerate: canModerate(viewer),
              },
            }
          : {}),
      }));
    },

    async create(postId: string, authorId: string, input: CreateCommentInput) {
      await posts.getPublished(postId);
      await enforceQuota('comments', (since) => repo.countByAuthorSince(authorId, since));
      if (input.parentId) {
        const parent = await getComment(input.parentId);
        if (parent.postId !== postId) {
          throw new HttpError(400, 'bad_parent', 'Réponse parente invalide');
        }
      }
      return toDto(await repo.create(postId, authorId, input));
    },

    async update(commentId: string, viewer: Viewer, body: string) {
      const comment = await getComment(commentId);
      if (comment.authorId !== viewer.id) {
        throw new HttpError(403, 'not_author', 'Seul l’auteur peut modifier cette réponse');
      }
      return toDto(await repo.update(commentId, body));
    },

    async remove(commentId: string, viewer: Viewer) {
      const comment = await getComment(commentId);
      if (comment.authorId !== viewer.id && !canModerate(viewer)) {
        throw new HttpError(403, 'not_author', 'Tu ne peux pas supprimer cette réponse');
      }
      await repo.setHidden(comment, true);
    },

    async accept(commentId: string, userId: string) {
      const comment = await getComment(commentId);
      const post = await posts.getPublished(comment.postId);
      if (post.type !== 'QUESTION') {
        throw new HttpError(400, 'not_a_question', 'Seules les questions ont une réponse acceptée');
      }
      if (post.authorId !== userId) {
        throw new HttpError(
          403,
          'not_post_author',
          'Seul l’auteur de la question peut accepter une réponse',
        );
      }
      await repo.accept(post.id, comment);
    },

    async vote(commentId: string, userId: string, on: boolean) {
      const comment = await getComment(commentId);
      if (comment.authorId === userId) {
        throw new HttpError(403, 'own_comment', 'Tu ne peux pas voter pour ta propre réponse');
      }
      await repo.setVote(comment, userId, on);
    },
  };
}

export type CommentsService = ReturnType<typeof createCommentsService>;
