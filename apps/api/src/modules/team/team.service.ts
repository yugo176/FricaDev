import type {
  ApplicationDto,
  CreateOpeningInput,
  ListOpeningsQuery,
  OpeningDto,
  Page,
  ProjectMemberDto,
} from '@fricadev/shared';
import type { Prisma, PrismaClient } from '../../lib/prisma.js';
import { HttpError, notFound } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';
import { enforceQuota, type Viewer } from '../../lib/quota.js';

const miniUser = {
  select: { handle: true, displayName: true, avatarUrl: true, countryCode: true },
} as const;

const openingInclude = {
  post: { select: { id: true, title: true, authorId: true, author: miniUser } },
} satisfies Prisma.TeamOpeningInclude;

type OpeningRecord = Prisma.TeamOpeningGetPayload<{ include: typeof openingInclude }>;

function toOpeningDto(opening: OpeningRecord): OpeningDto {
  return {
    id: opening.id,
    role: opening.role,
    description: opening.description,
    skills: opening.skills,
    commitment: opening.commitment,
    remote: opening.remote,
    status: opening.status,
    applicationCount: opening.applicationCount,
    createdAt: opening.createdAt.toISOString(),
    project: { id: opening.post.id, title: opening.post.title, owner: opening.post.author },
  };
}

/**
 * Recherche de coéquipiers : postes ouverts sur les projets, candidatures, équipe.
 * Chaque étape publie un événement outbox ; le worker en fait des notifications.
 */
export function createTeamService(db: PrismaClient) {
  async function getOpening(id: string) {
    const opening = await db.teamOpening.findUnique({ where: { id }, include: openingInclude });
    if (!opening) throw notFound('Poste');
    return opening;
  }

  async function withViewer(openings: OpeningRecord[], viewer?: Viewer | null) {
    if (!viewer) return openings.map(toOpeningDto);
    const applications = await db.teamApplication.findMany({
      where: { applicantId: viewer.id, openingId: { in: openings.map((o) => o.id) } },
      select: { id: true, openingId: true, status: true },
    });
    const byOpening = new Map(applications.map((a) => [a.openingId, a]));
    return openings.map((o) => {
      const application = byOpening.get(o.id);
      return {
        ...toOpeningDto(o),
        viewer: {
          isOwner: o.post.authorId === viewer.id,
          application: application ? { id: application.id, status: application.status } : null,
        },
      };
    });
  }

  return {
    /** Postes ouverts, tous projets confondus (page « Coéquipiers »). */
    async listOpen(query: ListOpeningsQuery, viewer?: Viewer | null): Promise<Page<OpeningDto>> {
      const rows = await db.teamOpening.findMany({
        where: {
          status: 'OPEN',
          post: { status: 'PUBLISHED' },
          ...(query.cursor ? { id: { lt: query.cursor } } : {}),
          ...(query.skill ? { skills: { has: query.skill } } : {}),
          ...(query.commitment ? { commitment: query.commitment } : {}),
        },
        orderBy: { id: 'desc' },
        take: query.limit + 1,
        include: openingInclude,
      });
      const hasMore = rows.length > query.limit;
      const items = await withViewer(rows.slice(0, query.limit), viewer);
      return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
    },

    async listForProject(postId: string, viewer?: Viewer | null): Promise<OpeningDto[]> {
      const rows = await db.teamOpening.findMany({
        where: { postId },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        include: openingInclude,
      });
      return withViewer(rows, viewer);
    },

    async create(postId: string, owner: Viewer, input: CreateOpeningInput): Promise<OpeningDto> {
      const post = await db.post.findUnique({ where: { id: postId } });
      if (!post || post.status !== 'PUBLISHED') throw notFound('Projet');
      if (post.type !== 'PROJECT') {
        throw new HttpError(400, 'not_a_project', 'Les postes se publient sur un projet');
      }
      if (post.authorId !== owner.id) {
        throw new HttpError(403, 'not_owner', 'Seul l’auteur du projet peut ouvrir un poste');
      }
      const openCount = await db.teamOpening.count({ where: { postId, status: 'OPEN' } });
      if (openCount >= 5) {
        throw new HttpError(400, 'too_many_openings', 'Cinq postes ouverts au maximum par projet');
      }
      const opening = await db.teamOpening.create({
        data: { id: newId(), postId, ...input },
        include: openingInclude,
      });
      return toOpeningDto(opening);
    },

    async setStatus(openingId: string, owner: Viewer, status: 'OPEN' | 'CLOSED') {
      const opening = await getOpening(openingId);
      if (opening.post.authorId !== owner.id) {
        throw new HttpError(403, 'not_owner', 'Seul l’auteur du projet peut modifier ce poste');
      }
      await db.teamOpening.update({ where: { id: openingId }, data: { status } });
    },

    async apply(openingId: string, applicant: Viewer, message: string) {
      const opening = await getOpening(openingId);
      if (opening.status !== 'OPEN') throw new HttpError(400, 'closed', 'Ce poste est pourvu');
      if (opening.post.authorId === applicant.id) {
        throw new HttpError(400, 'own_project', 'Tu ne peux pas candidater à ton propre projet');
      }
      const existing = await db.teamApplication.findUnique({
        where: { openingId_applicantId: { openingId, applicantId: applicant.id } },
      });
      if (existing && existing.status !== 'WITHDRAWN') {
        throw new HttpError(409, 'already_applied', 'Tu as déjà candidaté à ce poste');
      }
      // Même quota que les réponses : protège les auteurs de projets du spam.
      await enforceQuota('comments', (since) =>
        db.teamApplication.count({
          where: { applicantId: applicant.id, createdAt: { gte: since } },
        }),
      );
      const id = existing?.id ?? newId();
      await db.$transaction([
        existing
          ? db.teamApplication.update({
              where: { id },
              data: { message, status: 'PENDING', createdAt: new Date(), decidedAt: null },
            })
          : db.teamApplication.create({
              data: { id, openingId, applicantId: applicant.id, message },
            }),
        db.teamOpening.update({
          where: { id: openingId },
          data: { applicationCount: { increment: 1 } },
        }),
        db.outboxEvent.create({
          data: {
            id: newId(),
            type: 'team.application.created',
            payload: {
              applicationId: id,
              postId: opening.post.id,
              applicantId: applicant.id,
              role: opening.role,
            },
          },
        }),
      ]);
      return { id, status: 'PENDING' as const };
    },

    async withdraw(applicationId: string, applicant: Viewer) {
      const application = await db.teamApplication.findUnique({ where: { id: applicationId } });
      if (!application || application.applicantId !== applicant.id) throw notFound('Candidature');
      if (application.status !== 'PENDING') {
        throw new HttpError(400, 'already_decided', 'Cette candidature a déjà reçu une réponse');
      }
      await db.$transaction([
        db.teamApplication.update({ where: { id: applicationId }, data: { status: 'WITHDRAWN' } }),
        db.teamOpening.update({
          where: { id: application.openingId },
          data: { applicationCount: { decrement: 1 } },
        }),
      ]);
    },

    /** Candidatures reçues sur un poste : réservé à l'auteur du projet. */
    async listApplications(openingId: string, owner: Viewer): Promise<ApplicationDto[]> {
      const opening = await getOpening(openingId);
      if (opening.post.authorId !== owner.id) {
        throw new HttpError(403, 'not_owner', 'Réservé à l’auteur du projet');
      }
      const rows = await db.teamApplication.findMany({
        where: { openingId, status: { not: 'WITHDRAWN' } },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        include: {
          applicant: {
            select: {
              handle: true,
              displayName: true,
              avatarUrl: true,
              countryCode: true,
              reputation: true,
              skills: true,
            },
          },
        },
      });
      return rows.map((r) => ({
        id: r.id,
        message: r.message,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        applicant: r.applicant,
      }));
    },

    async decide(applicationId: string, owner: Viewer, decision: 'accept' | 'decline') {
      const application = await db.teamApplication.findUnique({
        where: { id: applicationId },
        include: { opening: { include: { post: { select: { id: true, authorId: true } } } } },
      });
      if (!application) throw notFound('Candidature');
      const { opening } = application;
      if (opening.post.authorId !== owner.id) {
        throw new HttpError(403, 'not_owner', 'Réservé à l’auteur du projet');
      }
      if (application.status !== 'PENDING') {
        throw new HttpError(400, 'already_decided', 'Cette candidature a déjà reçu une réponse');
      }
      await db.$transaction([
        db.teamApplication.update({
          where: { id: applicationId },
          data: { status: decision === 'accept' ? 'ACCEPTED' : 'DECLINED', decidedAt: new Date() },
        }),
        ...(decision === 'accept'
          ? [
              db.projectMember.upsert({
                where: {
                  postId_userId: { postId: opening.post.id, userId: application.applicantId },
                },
                create: {
                  postId: opening.post.id,
                  userId: application.applicantId,
                  role: opening.role,
                },
                update: { role: opening.role },
              }),
            ]
          : []),
        db.outboxEvent.create({
          data: {
            id: newId(),
            type: 'team.application.decided',
            payload: {
              applicationId,
              postId: opening.post.id,
              applicantId: application.applicantId,
              decision,
              role: opening.role,
            },
          },
        }),
      ]);
    },

    async members(postId: string): Promise<ProjectMemberDto[]> {
      const rows = await db.projectMember.findMany({
        where: { postId },
        orderBy: { createdAt: 'asc' },
        include: { user: miniUser },
      });
      return rows.map((r) => ({ role: r.role, user: r.user }));
    },
  };
}

export type TeamService = ReturnType<typeof createTeamService>;
