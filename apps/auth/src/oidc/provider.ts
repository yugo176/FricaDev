import Provider, { type Configuration, type JWKS } from 'oidc-provider';
import type { PrismaClient } from '../lib/prisma.js';
import type { Env } from '../config/env.js';
import { createPrismaAdapterFactory } from './adapter.js';
import { errorPage, logoutPage } from '../interactions/views.js';

/**
 * Fournisseur OpenID Connect de FricaDev.
 * Le site FricaDev en est le premier client : « Se connecter avec FricaDev » pour des
 * applications tierces consistera à enregistrer d'autres clients (table OidcClient)
 * et à afficher l'écran de consentement qui est déjà prévu dans le flux.
 */
export function createProvider(env: Env, db: PrismaClient) {
  const configuration: Configuration = {
    adapter: createPrismaAdapterFactory(db),
    clients: [
      {
        client_id: env.WEB_CLIENT_ID,
        client_secret: env.WEB_CLIENT_SECRET,
        client_name: 'FricaDev',
        redirect_uris: [`${env.WEB_URL}/auth/callback`],
        post_logout_redirect_uris: [env.WEB_URL],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'client_secret_basic',
      },
    ],
    cookies: { keys: env.AUTH_COOKIE_KEYS.split(',') },
    jwks: env.AUTH_JWKS ? (JSON.parse(env.AUTH_JWKS) as JWKS) : undefined,
    pkce: { required: () => true },
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    claims: {
      openid: ['sub'],
      profile: ['name'],
      email: ['email', 'email_verified'],
    },
    async findAccount(_ctx, sub) {
      const account = await db.account.findUnique({ where: { id: sub } });
      if (!account) return undefined;
      return {
        accountId: account.id,
        async claims() {
          return {
            sub: account.id,
            name: account.name,
            email: account.email,
            email_verified: account.emailVerified,
          };
        },
      };
    },
    features: {
      devInteractions: { enabled: false },
      revocation: { enabled: true },
      rpInitiatedLogout: {
        enabled: true,
        // Page FricaDev (et non la page anglaise par défaut), validée automatiquement par auth.js.
        logoutSource(ctx, form) {
          ctx.type = 'html';
          ctx.body = logoutPage(form);
        },
      },
      // Access tokens au format JWT pour l'API : vérifiables localement via /jwks.
      resourceIndicators: {
        enabled: true,
        defaultResource: () => env.API_AUDIENCE,
        useGrantedResource: () => true,
        getResourceServerInfo: (_ctx, resourceIndicator) => {
          if (resourceIndicator !== env.API_AUDIENCE) throw new Error('Ressource inconnue');
          return {
            scope: 'openid profile email',
            audience: env.API_AUDIENCE,
            accessTokenFormat: 'jwt',
            accessTokenTTL: 15 * 60,
            jwt: { sign: { alg: 'RS256' } },
          };
        },
      },
    },
    ttl: {
      AccessToken: 15 * 60,
      AuthorizationCode: 60,
      IdToken: 60 * 60,
      RefreshToken: 30 * 24 * 60 * 60,
      Interaction: 60 * 60,
      Session: 30 * 24 * 60 * 60,
      Grant: 365 * 24 * 60 * 60,
    },
    async renderError(ctx, out) {
      ctx.type = 'html';
      ctx.body = errorPage(out.error_description ?? out.error);
    },
    // Le consentement des clients internes est accordé d'office dans les interactions.
    interactions: {
      url: (_ctx, interaction) => `/interaction/${interaction.uid}`,
    },
  };

  const provider = new Provider(env.AUTH_ISSUER, configuration);
  provider.proxy = true;
  return provider;
}
