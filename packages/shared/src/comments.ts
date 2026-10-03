import { z } from 'zod';
import type { AuthorDto } from './posts.js';

export const createCommentSchema = z.object({
  body: z.string().trim().min(2).max(20_000),
  parentId: z.uuid().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = createCommentSchema.pick({ body: true });

export interface CommentDto {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  isAccepted: boolean;
  usefulCount: number;
  author: AuthorDto;
  createdAt: string;
  editedAt: string | null;
  viewer?: { votedUseful: boolean; isAuthor: boolean; canModerate: boolean };
}
