import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { v7 as uuidv7 } from 'uuid';
import type Provider from 'oidc-provider';
import type { PrismaClient } from '../lib/prisma.js';
import type { Env } from '../config/env.js';

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
}
interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

const STATE_COOKIE = 'fd_gh_state';

/**
 * Connexion avec GitHub (fournisseur amont). GitHub prouve l'identité, puis FricaDev émet ses
 * propres tokens : les applications clientes ne voient jamais GitHub.
 * Callback à déclarer dans l'OAuth App GitHub : {AUTH_ISSUER}/interaction
 * (GitHub accepte les sous-chemins, ce qui permet de garder le cookie d'interaction).
 */
export function createGitHubRouter(provider: Provider, db: PrismaClient, env: Env) {
  const router = Router();
  const key = env.AUTH_COOKIE_KEYS.split(',')[0]!;
  const sign = (value: string) => createHmac('sha256', key).update(value).digest('base64url');

  router.get('/:uid/github', async (req, res) => {
    if (!env.GITHUB_CLIENT_ID) return res.status(404).send('Connexion GitHub non configurée');
    const details = await provider.interactionDetails(req, res);
    const state = randomBytes(16).toString('base64url');
    res.cookie(STATE_COOKIE, `${state}.${sign(`${details.uid}.${state}`)}`, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 10 * 60_000,
      path: `/interaction/${details.uid}`,
    });
    const url = new URL('https://github.com/login/oauth/authorize');
    url.search = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: `${env.AUTH_ISSUER}/interaction/${details.uid}/github/callback`,
      scope: 'read:user user:email',
      state,
      allow_signup: 'true',
    }).toString();
    res.redirect(url.toString());
  });

  router.get('/:uid/github/callback', async (req, res) => {
    const details = await provider.interactionDetails(req, res);
    const [cookieState, signature] = String(
      parseCookie(req.headers.cookie, STATE_COOKIE) ?? '',
    ).split('.');
    const state = String(req.query.state ?? '');
    const expected = sign(`${details.uid}.${state}`);
    const valid =
      cookieState === state &&
      signature !== undefined &&
      signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    res.clearCookie(STATE_COOKIE, { path: `/interaction/${details.uid}` });
    if (!valid || typeof req.query.code !== 'string') {
      return res.redirect(`/interaction/${details.uid}?error=github`);
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: req.query.code,
        redirect_uri: `${env.AUTH_ISSUER}/interaction/${details.uid}/github/callback`,
      }),
    });
    const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string };
    if (!accessToken) return res.redirect(`/interaction/${details.uid}?error=github`);

    const headers = { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'FricaDev' };
    const [user, emails] = await Promise.all([
      fetch('https://api.github.com/user', { headers }).then(
        (r) => r.json() as Promise<GitHubUser>,
      ),
      fetch('https://api.github.com/user/emails', { headers }).then(
        (r) => r.json() as Promise<GitHubEmail[]>,
      ),
    ]);
    const email = emails.find((e) => e.primary && e.verified)?.email?.toLowerCase();
    if (!email) return res.redirect(`/interaction/${details.uid}?error=github_email`);

    const accountId = await findOrCreateAccount(
      db,
      String(user.id),
      email,
      user.name ?? user.login,
    );
    await provider.interactionFinished(
      req,
      res,
      { login: { accountId } },
      { mergeWithLastSubmission: false },
    );
  });

  return router;
}

/** Compte existant par identité GitHub, sinon rattachement par e-mail vérifié, sinon création. */
async function findOrCreateAccount(
  db: PrismaClient,
  githubId: string,
  email: string,
  name: string,
) {
  const identity = await db.externalIdentity.findUnique({
    where: { provider_providerId: { provider: 'github', providerId: githubId } },
  });
  if (identity) return identity.accountId;

  const existing = await db.account.findUnique({ where: { email } });
  const accountId = existing?.id ?? uuidv7();
  await db.$transaction([
    ...(existing
      ? [db.account.update({ where: { id: existing.id }, data: { emailVerified: true } })]
      : [db.account.create({ data: { id: accountId, email, name, emailVerified: true } })]),
    db.externalIdentity.create({
      data: { id: uuidv7(), accountId, provider: 'github', providerId: githubId },
    }),
  ]);
  return accountId;
}

function parseCookie(header: string | undefined, name: string): string | undefined {
  return header
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([k]) => k === name)?.[1];
}
