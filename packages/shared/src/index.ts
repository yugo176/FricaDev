import { z } from 'zod';

// Messages de validation en français pour toute la plateforme (API, site, identité).
z.config(z.locales.fr());

export * from './pagination.js';
export * from './posts.js';
export * from './comments.js';
export * from './users.js';
export * from './reputation.js';
export * from './communities.js';
export * from './text.js';
export * from './moderation.js';
export * from './team.js';
export * from './notifications.js';
export * from './activity.js';
