import { z } from 'zod';

export const NOTIFICATION_KINDS = [
  'answer',
  'accepted',
  'follow',
  'useful',
  'application',
  'application_accepted',
  'application_declined',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Motifs proposés comme filtres (barre latérale), chacun regroupant plusieurs types. */
export const NOTIFICATION_REASONS = {
  answers: ['answer', 'accepted'],
  team: ['application', 'application_accepted', 'application_declined'],
  follows: ['follow'],
  reactions: ['useful'],
} as const satisfies Record<string, readonly NotificationKind[]>;
export type NotificationReason = keyof typeof NOTIFICATION_REASONS;
export const NOTIFICATION_REASON_KEYS = Object.keys(NOTIFICATION_REASONS) as NotificationReason[];

export function reasonOf(kind: NotificationKind): NotificationReason | null {
  for (const reason of NOTIFICATION_REASON_KEYS) {
    if ((NOTIFICATION_REASONS[reason] as readonly string[]).includes(kind)) return reason;
  }
  return null;
}

export const NOTIFICATION_VIEWS = ['inbox', 'pinned', 'archived'] as const;
export type NotificationView = (typeof NOTIFICATION_VIEWS)[number];

/** Filtres communs à la liste et à « Tout marquer comme lu ». */
export const notificationFiltersSchema = z.object({
  view: z.enum(NOTIFICATION_VIEWS).default('inbox'),
  unread: z
    .enum(['1', '0', 'true', 'false'])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  reason: z
    .enum(NOTIFICATION_REASON_KEYS as [NotificationReason, ...NotificationReason[]])
    .optional(),
  postId: z.uuid().optional(),
  q: z.string().trim().max(80).optional(),
});
export type NotificationFilters = z.infer<typeof notificationFiltersSchema>;

export const listNotificationsQuerySchema = notificationFiltersSchema.extend({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

export const NOTIFICATION_ACTIONS = [
  'read',
  'unread',
  'pin',
  'unpin',
  'archive',
  'unarchive',
] as const;
export type NotificationAction = (typeof NOTIFICATION_ACTIONS)[number];

export const bulkNotificationsSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(100),
  action: z.enum(NOTIFICATION_ACTIONS),
});
export type BulkNotificationsInput = z.infer<typeof bulkNotificationsSchema>;

export interface NotificationDto {
  id: string;
  kind: NotificationKind;
  payload: {
    actor?: { handle: string; displayName: string; avatarUrl?: string | null };
    postId?: string;
    postTitle?: string;
    role?: string;
  };
  readAt: string | null;
  pinnedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface NotificationsSummaryDto {
  /** Non lues dans la boîte de réception (pastille de la cloche). */
  unread: number;
  pinned: number;
  /** Non lues de la boîte, par motif. */
  reasons: Record<NotificationReason, number>;
  /** Publications qui génèrent le plus de notifications dans la boîte. */
  posts: { postId: string; postTitle: string; count: number; unread: number }[];
}
