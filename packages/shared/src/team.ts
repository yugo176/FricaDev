import { z } from 'zod';
import { cursorQuerySchema } from './pagination.js';
import { tagSchema } from './posts.js';

export const COMMITMENTS = ['VOLUNTEER', 'PAID', 'PARTNER'] as const;
export type Commitment = (typeof COMMITMENTS)[number];
export const COMMITMENT_LABELS: Record<Commitment, string> = {
  VOLUNTEER: 'Bénévole',
  PAID: 'Rémunéré',
  PARTNER: 'Associé',
};

/** Rôles proposés dans les formulaires ; un rôle libre reste possible. */
export const SUGGESTED_ROLES = [
  'Dev backend',
  'Dev frontend',
  'Dev mobile',
  'Dev full-stack',
  'Designer UI/UX',
  'DevOps',
  'Data / IA',
  'Product / business',
] as const;

export const createOpeningSchema = z.object({
  role: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(2_000),
  skills: z.array(tagSchema).max(8).default([]),
  commitment: z.enum(COMMITMENTS).default('VOLUNTEER'),
  remote: z.boolean().default(true),
});
export type CreateOpeningInput = z.infer<typeof createOpeningSchema>;

export const applySchema = z.object({
  message: z.string().trim().min(20).max(2_000),
});

export const decideApplicationSchema = z.object({
  decision: z.enum(['accept', 'decline']),
});

export const listOpeningsQuerySchema = cursorQuerySchema.extend({
  skill: tagSchema.optional(),
  commitment: z.enum(COMMITMENTS).optional(),
});
export type ListOpeningsQuery = z.infer<typeof listOpeningsQuerySchema>;

export interface MiniUserDto {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
}

export interface OpeningDto {
  id: string;
  role: string;
  description: string;
  skills: string[];
  commitment: Commitment;
  remote: boolean;
  status: 'OPEN' | 'CLOSED';
  applicationCount: number;
  createdAt: string;
  project: { id: string; title: string; owner: MiniUserDto };
  /** Présent pour un visiteur connecté */
  viewer?: {
    isOwner: boolean;
    application: { id: string; status: ApplicationStatus } | null;
  };
}

export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';

export interface ApplicationDto {
  id: string;
  message: string;
  status: ApplicationStatus;
  createdAt: string;
  applicant: MiniUserDto & { reputation: number; skills: string[] };
}

export interface ProjectMemberDto {
  role: string;
  user: MiniUserDto;
}
