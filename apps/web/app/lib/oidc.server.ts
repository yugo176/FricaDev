import { createHash, randomBytes } from 'node:crypto';
import { env } from './env.server';

const base64url = (buffer: Buffer) => buffer.toString('base64url');

export function createPkce() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge, state: base64url(randomBytes(16)) };
}

export function authorizationUrl(params: { state: string; challenge: string }) {
  const url = new URL('/auth', env.authIssuer);
  url.search = new URLSearchParams({
    client_id: env.clientId,
    response_type: 'code',
    redirect_uri: `${env.webUrl}/auth/callback`,
    scope: 'openid profile email offline_access',
    resource: env.apiAudience,
    prompt: 'consent',
    state: params.state,
    code_challenge: params.challenge,
    code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
}

/** Le service d'identité a refusé la demande (jeton révoqué ou expiré) : il faut se reconnecter. */
export class TokenRejectedError extends Error {}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(new URL('/token', env.authInternalUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${env.clientId}:${env.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ ...params, resource: env.apiAudience }),
    signal: AbortSignal.timeout(15_000),
  });
  // 400 / 401 : refus définitif (invalid_grant). Les autres erreurs (réseau, délai, 5xx) sont passagères.
  if (response.status === 400 || response.status === 401) {
    throw new TokenRejectedError(`Demande de token refusée (${response.status})`);
  }
  if (!response.ok) throw new Error(`Service d'identité indisponible (${response.status})`);
  return (await response.json()) as TokenResponse;
}

export function exchangeCode(code: string, verifier: string): Promise<TokenResponse> {
  return tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${env.webUrl}/auth/callback`,
    code_verifier: verifier,
  });
}

/** Nouveau access token sans redemander le mot de passe (le refresh token tourne à chaque appel). */
export function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  return tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });
}

/** Lit les claims de l'id_token reçu directement du fournisseur via un canal serveur TLS. */
export function decodeIdToken(idToken: string): { sub: string; name?: string; email?: string } {
  const payload = idToken.split('.')[1];
  if (!payload) throw new Error('id_token invalide');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

export function logoutUrl(idToken: string) {
  const url = new URL('/session/end', env.authIssuer);
  url.search = new URLSearchParams({
    id_token_hint: idToken,
    post_logout_redirect_uri: env.webUrl,
  }).toString();
  return url.toString();
}
