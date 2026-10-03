import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { createLogger } from '@fricadev/logger';
import { loadEnv } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { createProvider } from './oidc/provider.js';
import { createInteractionRouter } from './interactions/routes.js';
import { createGitHubRouter } from './interactions/github.js';

const env = loadEnv();
const logger = createLogger('auth');
const provider = createProvider(env, prisma);
provider.on('server_error', (_ctx, err) => logger.error({ err }, 'Erreur du fournisseur OIDC'));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(
  helmet({ contentSecurityPolicy: { directives: { 'form-action': ["'self'", env.WEB_URL] } } }),
);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth' }));
// Script des pages de connexion (la politique de sécurité interdit les scripts dans le HTML).
app.use(
  '/assets',
  express.static(fileURLToPath(new URL('../public', import.meta.url)), { maxAge: '1d' }),
);
app.use('/interaction', createGitHubRouter(provider, prisma, env));
app.use(
  '/interaction',
  createInteractionRouter(provider, prisma, new Set([env.WEB_CLIENT_ID]), {
    github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
  }),
);
// Tout le reste (/.well-known, /auth, /token, /jwks, /me…) est géré par oidc-provider.
app.use(provider.callback());

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'Erreur dans le service d’identité');
    res.status(500).type('html').send('Une erreur est survenue. Réessaie dans un instant.');
  },
);

app.listen(env.AUTH_PORT, () => {
  logger.info(`Identité FricaDev sur ${env.AUTH_ISSUER}/.well-known/openid-configuration`);
});
