import { z } from 'zod';

export const REPORT_REASONS = ['SPAM', 'OFFENSIVE', 'PLAGIARISM', 'OFF_TOPIC', 'OTHER'] as const;
export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  SPAM: 'Spam ou publicité',
  OFFENSIVE: 'Propos insultants ou haineux',
  PLAGIARISM: 'Plagiat ou contenu volé',
  OFF_TOPIC: 'Hors sujet',
  OTHER: 'Autre',
};

export const createReportSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT']),
  targetId: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const resolveReportSchema = z.object({
  action: z.enum(['hide', 'dismiss']),
});

/** Nombre de signalements distincts qui masquent un contenu en attendant la modération. */
export const AUTO_HIDE_THRESHOLD = 3;

export interface ReportQueueItemDto {
  targetType: 'POST' | 'COMMENT';
  targetId: string;
  reportCount: number;
  reasons: string[];
  details: string[];
  firstReportedAt: string;
  hidden: boolean;
  preview: {
    title: string | null;
    excerpt: string;
    author: { handle: string; displayName: string };
    postId: string;
  } | null;
}

export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN';
