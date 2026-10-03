import type { Prisma, PrismaClient } from '../lib/prisma.js';
import type { Adapter, AdapterPayload } from 'oidc-provider';

/**
 * Persiste l'état de oidc-provider (sessions, codes, tokens…) dans PostgreSQL :
 * plusieurs instances du service peuvent ainsi tourner derrière un répartiteur.
 */
export function createPrismaAdapterFactory(db: PrismaClient) {
  return class PrismaAdapter implements Adapter {
    constructor(private readonly type: string) {}

    private key(id: string) {
      return { id_type: { id, type: this.type } };
    }

    private static alive(
      row: { payload: Prisma.JsonValue; expiresAt: Date | null; consumedAt: Date | null } | null,
    ) {
      if (!row) return undefined;
      if (row.expiresAt && row.expiresAt < new Date()) return undefined;
      const payload = row.payload as AdapterPayload;
      return row.consumedAt ? { ...payload, consumed: true } : payload;
    }

    async upsert(id: string, payload: AdapterPayload, expiresIn: number) {
      const data = {
        payload: payload as Prisma.InputJsonValue,
        grantId: payload.grantId ?? null,
        userCode: payload.userCode ?? null,
        uid: payload.uid ?? null,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      };
      await db.oidcPayload.upsert({
        where: this.key(id),
        create: { id, type: this.type, ...data },
        update: data,
      });
    }

    async find(id: string) {
      return PrismaAdapter.alive(await db.oidcPayload.findUnique({ where: this.key(id) }));
    }

    async findByUserCode(userCode: string) {
      return PrismaAdapter.alive(
        await db.oidcPayload.findFirst({ where: { type: this.type, userCode } }),
      );
    }

    async findByUid(uid: string) {
      return PrismaAdapter.alive(
        await db.oidcPayload.findFirst({ where: { type: this.type, uid } }),
      );
    }

    async consume(id: string) {
      await db.oidcPayload.update({ where: this.key(id), data: { consumedAt: new Date() } });
    }

    async destroy(id: string) {
      await db.oidcPayload.deleteMany({ where: { id, type: this.type } });
    }

    async revokeByGrantId(grantId: string) {
      await db.oidcPayload.deleteMany({ where: { grantId } });
    }
  };
}
