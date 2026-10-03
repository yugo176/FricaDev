import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import type { PrismaClient } from './lib/prisma.js';
import type { Logger } from '@fricadev/logger';
import type { Env } from './config/env.js';
import type { Storage } from './lib/storage.js';
import { createAuthMiddleware } from './middlewares/auth.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { createPostsRepository } from './modules/posts/posts.repository.js';
import { createPostsService } from './modules/posts/posts.service.js';
import { createPostsRouter } from './modules/posts/posts.routes.js';
import { createUsersService } from './modules/users/users.service.js';
import { createCommentsRepository } from './modules/comments/comments.repository.js';
import { createCommunitiesService } from './modules/communities/communities.service.js';
import { createCommunitiesRouter } from './modules/communities/communities.routes.js';
import { createSearchService } from './modules/search/search.service.js';
import { createTagsRouter } from './modules/tags/tags.routes.js';
import { createTagsService } from './modules/tags/tags.service.js';
import { createActivityRouter } from './modules/activity/activity.routes.js';
import { createActivityService } from './modules/activity/activity.service.js';
import { createSearchRouter } from './modules/search/search.routes.js';
import { createNotificationsService } from './modules/notifications/notifications.service.js';
import { createNotificationsRouter } from './modules/notifications/notifications.routes.js';
import { createCommentsService } from './modules/comments/comments.service.js';
import { createModerationService } from './modules/moderation/moderation.service.js';
import { createTeamService } from './modules/team/team.service.js';
import { createProjectTeamRouter, createTeamRouter } from './modules/team/team.routes.js';
import { createModerationRouter } from './modules/moderation/moderation.routes.js';
import {
  createCommentsRouter,
  createPostCommentsRouter,
} from './modules/comments/comments.routes.js';
import { createUsersRouter } from './modules/users/users.routes.js';

export function createApp(deps: { env: Env; db: PrismaClient; logger: Logger; storage: Storage }) {
  const { env, db, logger, storage } = deps;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(cors({ origin: env.API_CORS_ORIGINS.split(','), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  // Limite en mémoire pour l'instant ; passera sur Valkey quand l'API tournera en plusieurs instances.
  app.use(
    rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }),
  );

  const { optionalAuth, requireAuth } = createAuthMiddleware(env);
  app.use(optionalAuth);

  // Composition des modules : chaque module ne dépend que de ce qu'on lui injecte.
  const users = createUsersService(db);
  const postsRepository = createPostsRepository(db);
  const posts = createPostsService(postsRepository);
  const commentsRepository = createCommentsRepository(db);
  const comments = createCommentsService(commentsRepository, posts);
  const moderation = createModerationService(db, commentsRepository);
  const communities = createCommunitiesService(db);
  const search = createSearchService(db, postsRepository);
  const notifications = createNotificationsService(db);
  const team = createTeamService(db);
  const tags = createTagsService(db);
  const activity = createActivityService(db);

  const v1 = express.Router();
  v1.use('/health', healthRouter);
  // Avant /users/:handle : « me/activity » n'est pas un pseudo.
  v1.use('/users/me/activity', createActivityRouter({ activity, users, requireAuth }));
  v1.use('/users', createUsersRouter({ users, requireAuth, storage }));
  v1.use('/posts/:postId/comments', createPostCommentsRouter({ comments, users, requireAuth }));
  v1.use('/posts/:postId', createProjectTeamRouter({ team, users, requireAuth }));
  v1.use('/posts', createPostsRouter({ posts, users, requireAuth }));
  v1.use('/comments', createCommentsRouter({ comments, users, requireAuth }));
  v1.use('/communities', createCommunitiesRouter({ communities, users, requireAuth }));
  v1.use('/search', createSearchRouter({ search }));
  v1.use('/tags', createTagsRouter({ tags }));
  v1.use('/notifications', createNotificationsRouter({ notifications, users, requireAuth }));
  v1.use('/moderation', createModerationRouter({ moderation, users, requireAuth }));
  v1.use('/', createTeamRouter({ team, users, requireAuth }));
  app.use('/v1', v1);

  // Fichiers envoyés (stockage local) : noms aléatoires, donc cache permanent.
  if (storage.localDir) {
    app.use(
      '/uploads',
      express.static(storage.localDir, {
        immutable: true,
        maxAge: '1y',
        index: false,
        setHeaders: (res) => {
          // Les images sont affichées par le site, servi depuis une autre origine.
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('X-Content-Type-Options', 'nosniff');
        },
      }),
    );
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
