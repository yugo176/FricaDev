import express, { Router } from 'express';
import { hash, verify } from '@node-rs/argon2';
import { rateLimit } from 'express-rate-limit';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';
import type { PrismaClient } from '../lib/prisma.js';
import type Provider from 'oidc-provider';
import { loginPage, registerPage, type ViewOptions } from './views.js';

const GITHUB_ERRORS: Record<string, string> = {
  github: 'La connexion avec GitHub a échoué. Réessaie.',
  github_email: 'Ton compte GitHub n’a pas d’e-mail vérifié.',
};

const loginSchema = z.object({ email: z.email().toLowerCase(), password: z.string().min(1) });
const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.email().toLowerCase(),
  password: z.string().min(10).max(200),
});

/** Pages de connexion et d'inscription appelées par oidc-provider pendant le flux OIDC. */
export function createInteractionRouter(
  provider: Provider,
  db: PrismaClient,
  firstPartyClients: Set<string>,
  options: ViewOptions,
) {
  const router = Router();
  const body = express.urlencoded({ extended: false });
  const limiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/:uid', async (req, res) => {
    const details = await provider.interactionDetails(req, res);
    if (details.prompt.name === 'login') {
      const error = GITHUB_ERRORS[String(req.query.error ?? '')];
      return res.type('html').send(loginPage(details.uid, options, error));
    }

    // Consentement : les clients internes (le site FricaDev) sont acceptés d'office.
    if (
      details.prompt.name === 'consent' &&
      firstPartyClients.has(details.params.client_id as string)
    ) {
      const grant = details.grantId
        ? await provider.Grant.find(details.grantId)
        : new provider.Grant({
            accountId: details.session!.accountId,
            clientId: details.params.client_id as string,
          });
      if (!grant) throw new Error('Grant introuvable');
      grant.addOIDCScope('openid profile email offline_access');
      for (const resource of Object.keys(details.prompt.details.missingResourceScopes ?? {})) {
        grant.addResourceScope(resource, 'openid profile email');
      }
      const grantId = await grant.save();
      return provider.interactionFinished(
        req,
        res,
        { consent: { grantId } },
        { mergeWithLastSubmission: true },
      );
    }

    // Écran de consentement pour les futurs clients tiers (« Se connecter avec FricaDev »).
    return res.status(501).type('html').send('Écran de consentement à venir');
  });

  router.get('/:uid/register', async (req, res) => {
    const details = await provider.interactionDetails(req, res);
    res.type('html').send(registerPage(details.uid, options));
  });

  router.post('/:uid/login', limiter, body, async (req, res) => {
    const details = await provider.interactionDetails(req, res);
    const parsed = loginSchema.safeParse(req.body);
    const account = parsed.success
      ? await db.account.findUnique({ where: { email: parsed.data.email } })
      : null;
    const ok =
      parsed.success &&
      account?.passwordHash &&
      (await verify(account.passwordHash, parsed.data.password));
    if (!ok || !account) {
      return res
        .status(401)
        .type('html')
        .send(
          loginPage(details.uid, options, 'E-mail ou mot de passe incorrect', {
            email: String(req.body?.email ?? ''),
          }),
        );
    }
    await provider.interactionFinished(
      req,
      res,
      { login: { accountId: account.id } },
      { mergeWithLastSubmission: false },
    );
  });

  router.post('/:uid/register', limiter, body, async (req, res) => {
    const details = await provider.interactionDetails(req, res);
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .type('html')
        .send(
          registerPage(details.uid, options, 'Vérifie les champs du formulaire', {
            name: String(req.body?.name ?? ''),
            email: String(req.body?.email ?? ''),
          }),
        );
    }
    const exists = await db.account.findUnique({ where: { email: parsed.data.email } });
    if (exists) {
      return res
        .status(409)
        .type('html')
        .send(
          registerPage(
            details.uid,
            options,
            'Un compte existe déjà avec cet e-mail : connecte-toi plutôt.',
            { name: parsed.data.name, email: parsed.data.email },
          ),
        );
    }
    const account = await db.account.create({
      data: {
        id: uuidv7(),
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash: await hash(parsed.data.password),
      },
    });
    await provider.interactionFinished(
      req,
      res,
      { login: { accountId: account.id } },
      { mergeWithLastSubmission: false },
    );
  });

  return router;
}
