// Client généré propre à ce service (schéma « identity »).
import { PrismaClient as BasePrismaClient } from '../../generated/prisma/index.js';

export type { Prisma } from '../../generated/prisma/index.js';

/** Erreurs de connexion passagères (base en veille, connexion fermée par le pooler…). */
const TRANSIENT =
  /Server has closed the connection|Can't reach database server|Connection terminated|P1001|P1017/;

function isTransient(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: string }).code ?? '';
  return TRANSIENT.test(`${code} ${error.message}`);
}

/** Rejoue une fois une requête qui a échoué sur une erreur de connexion passagère. */
export function createPrismaClient() {
  return new BasePrismaClient().$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error) {
          if (!isTransient(error)) throw error;
          await new Promise((resolve) => setTimeout(resolve, 300));
          return query(args);
        }
      },
    },
  });
}

export type PrismaClient = ReturnType<typeof createPrismaClient>;

export const prisma = createPrismaClient();
