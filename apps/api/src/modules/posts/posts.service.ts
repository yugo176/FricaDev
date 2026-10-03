import {
  pickDetails,
  readingMinutes,
  type CreatePostInput,
  type ListPostsQuery,
  type Page,
  type PostDetails,
  type PostDto,
  type PostSummaryDto,
  type PostType,
  type ReactionType,
  type UpdatePostInput,
} from '@fricadev/shared';
import { HttpError, notFound } from '../../lib/errors.js';
import { canModerate, enforceQuota, type Viewer } from '../../lib/quota.js';
import type { PostRecord, PostSummaryRecord, PostsRepository } from './posts.repository.js';

/** Champs propres au type, filtrés selon le type ; temps de lecture calculé pour les articles. */
export function buildDetails(
  type: PostType,
  input: { body: string; details?: PostDetails },
): PostDetails | null {
  const details = pickDetails(type, input.details);
  if (type !== 'ARTICLE') return details;
  return { ...details, readingMinutes: readingMinutes(input.body) };
}

export function toPostDto(post: PostRecord): PostDto {
  return {
    id: post.id,
    type: post.type,
    title: post.title,
    body: post.body,
    tags: post.tags.map((t) => t.tag.name),
    author: post.author,
    reactionCount: post.reactionCount,
    likeCount: post.likeCount,
    usefulCount: post.usefulCount,
    commentCount: post.commentCount,
    createdAt: post.createdAt.toISOString(),
    editedAt: post.editedAt?.toISOString() ?? null,
    community: post.community,
    details: (post.details as PostDetails | null) ?? null,
  };
}

export function toPostSummaryDto(post: PostSummaryRecord): PostSummaryDto {
  return {
    id: post.id,
    type: post.type,
    title: post.title,
    excerpt: post.excerpt,
    codePreview: post.codePreview,
    tags: post.tags.map((t) => t.tag.name),
    author: post.author,
    reactionCount: post.reactionCount,
    likeCount: post.likeCount,
    usefulCount: post.usefulCount,
    commentCount: post.commentCount,
    createdAt: post.createdAt.toISOString(),
    community: post.community,
    details: (post.details as PostDetails | null) ?? null,
  };
}

function toPage(rows: PostSummaryRecord[], limit: number): Page<PostSummaryDto> {
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(toPostSummaryDto);
  return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
}

export function createPostsService(repo: PostsRepository) {
  async function getPublished(id: string): Promise<PostRecord> {
    const post = await repo.findById(id);
    if (!post || post.status !== 'PUBLISHED') throw notFound('Publication');
    return post;
  }

  return {
    getPublished,

    async list(query: ListPostsQuery): Promise<Page<PostSummaryDto>> {
      return toPage(await repo.list(query), query.limit);
    },

    async following(userId: string, query: ListPostsQuery): Promise<Page<PostSummaryDto>> {
      return toPage(await repo.listFollowing(userId, query), query.limit);
    },

    async get(id: string, viewer?: Viewer | null): Promise<PostDto> {
      const post = await getPublished(id);
      const [reactions, hasAcceptedAnswer] = await Promise.all([
        viewer ? repo.viewerReactions(id, viewer.id) : Promise.resolve(undefined),
        post.type === 'QUESTION' ? repo.hasAcceptedAnswer(id) : Promise.resolve(undefined),
      ]);
      return {
        ...toPostDto(post),
        ...(reactions && viewer
          ? {
              viewer: {
                reactions,
                isAuthor: post.authorId === viewer.id,
                canModerate: canModerate(viewer),
              },
            }
          : {}),
        ...(hasAcceptedAnswer !== undefined ? { hasAcceptedAnswer } : {}),
      };
    },

    async create(authorId: string, input: CreatePostInput): Promise<PostDto> {
      await enforceQuota('posts', (since) => repo.countByAuthorSince(authorId, since));
      return toPostDto(
        await repo.create(authorId, { ...input, details: buildDetails(input.type, input) }),
      );
    },

    async update(postId: string, viewer: Viewer, input: UpdatePostInput): Promise<PostDto> {
      const post = await getPublished(postId);
      if (post.authorId !== viewer.id) {
        throw new HttpError(403, 'not_author', 'Seul l’auteur peut modifier cette publication');
      }
      return toPostDto(
        await repo.update(postId, { ...input, details: buildDetails(post.type, input) }),
      );
    },

    /** Suppression par l'auteur, ou masquage par la modération : la publication disparaît. */
    async remove(postId: string, viewer: Viewer): Promise<void> {
      const post = await getPublished(postId);
      if (post.authorId !== viewer.id && !canModerate(viewer)) {
        throw new HttpError(403, 'not_author', 'Tu ne peux pas supprimer cette publication');
      }
      await repo.setStatus(postId, 'HIDDEN');
    },

    viewerReactions(postIds: string[], viewerId: string) {
      return repo.viewerReactionsMany(postIds, viewerId);
    },

    async react(postId: string, viewer: Viewer, type: ReactionType, on: boolean) {
      const post = await getPublished(postId);
      if (post.authorId === viewer.id) {
        throw new HttpError(403, 'own_post', 'Tu ne peux pas réagir à ta propre publication');
      }
      if (on) await repo.addReaction(post, viewer.id, type);
      else await repo.removeReaction(post, viewer.id, type);
      return this.get(postId, viewer);
    },
  };
}

export type PostsService = ReturnType<typeof createPostsService>;
