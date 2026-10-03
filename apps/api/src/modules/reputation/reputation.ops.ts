import { REPUTATION_POINTS, type ReputationReason } from '@fricadev/shared';
import type { PrismaClient } from '../../lib/prisma.js';
import { newId } from '../../lib/ids.js';

/**
 * Opérations Prisma à placer dans la même transaction que l'action qui fait gagner
 * (ou perdre) des points : le journal et le total restent toujours cohérents.
 */
export function reputationOps(
  db: PrismaClient,
  userId: string,
  reason: ReputationReason,
  sourceId: string,
  direction: 1 | -1 = 1,
) {
  const points = REPUTATION_POINTS[reason] * direction;
  return [
    db.reputationEvent.create({
      data: {
        id: newId(),
        userId,
        points,
        reason: direction === 1 ? reason : `${reason}_REVOKED`,
        sourceId,
      },
    }),
    db.user.update({ where: { id: userId }, data: { reputation: { increment: points } } }),
  ] as const;
}
