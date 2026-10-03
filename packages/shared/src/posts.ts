import { z } from 'zod';
import { cursorQuerySchema } from './pagination.js';

export const POST_TYPES = ['PROJECT', 'QUESTION', 'CODE', 'ARTICLE'] as const;
export const postTypeSchema = z.enum(POST_TYPES);
export type PostType = z.infer<typeof postTypeSchema>;

export const REACTION_TYPES = ['LIKE', 'USEFUL'] as const;
export const reactionTypeSchema = z.enum(REACTION_TYPES);
export type ReactionType = z.infer<typeof reactionTypeSchema>;

export const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9.+#-]{0,31}$/, 'Tag invalide');

/** Avancement d'un projet, de l'idée à la mise en ligne. */
export const PROJECT_STAGES = ['IDEA', 'PROTOTYPE', 'BETA', 'LIVE'] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];
export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  IDEA: 'Idée',
  PROTOTYPE: 'Prototype',
  BETA: 'Bêta',
  LIVE: 'En ligne',
};

/** Langages proposés pour un extrait de code (identifiants compris par la coloration Shiki). */
export const CODE_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'php',
  'dart',
  'kotlin',
  'java',
  'go',
  'rust',
  'csharp',
  'sql',
  'bash',
  'html',
  'css',
] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

const httpsUrl = z
  .string()
  .trim()
  .max(300)
  .pipe(z.url({ protocol: /^https$/, error: 'Le lien doit commencer par https://' }));

/**
 * Champs propres à chaque type de publication (colonne JSON `details`).
 * `coverUrl` et `media` sont réservés aux images, prévues plus tard.
 */
export const postDetailsSchema = z
  .object({
    pitch: z.string().trim().min(10).max(140),
    stage: z.enum(PROJECT_STAGES),
    repoUrl: httpsUrl,
    demoUrl: httpsUrl,
    language: z.enum(CODE_LANGUAGES),
    subtitle: z.string().trim().min(5).max(200),
    coverUrl: httpsUrl,
    media: z.array(z.object({ url: httpsUrl, alt: z.string().max(200) })).max(8),
  })
  .partial();
export type PostDetails = z.infer<typeof postDetailsSchema> & {
  /** Calculé par le serveur (articles) */
  readingMinutes?: number;
};

const DETAIL_KEYS: Record<PostType, (keyof PostDetails)[]> = {
  PROJECT: ['pitch', 'stage', 'repoUrl', 'demoUrl', 'coverUrl', 'media'],
  QUESTION: [],
  CODE: ['language'],
  ARTICLE: ['subtitle', 'coverUrl', 'media'],
};

/** Ne garde que les champs autorisés pour ce type (un projet n'a pas de langage…). */
export function pickDetails(
  type: PostType,
  details: PostDetails | undefined | null,
): PostDetails | null {
  if (!details) return null;
  const picked: Record<string, unknown> = {};
  for (const key of DETAIL_KEYS[type]) {
    if (details[key] !== undefined && details[key] !== '') picked[key] = details[key];
  }
  return Object.keys(picked).length > 0 ? (picked as PostDetails) : null;
}

/** Temps de lecture estimé (200 mots par minute, blocs de code compris). */
export function readingMinutes(markdown: string): number {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const FENCE = '```';

/** Intertitres d'une question guidée : partagés par l'assemblage et la relecture. */
const QUESTION_SECTIONS = {
  goal: 'Ce que j’essaie de faire',
  tried: 'Ce que j’ai déjà essayé',
  error: 'Message d’erreur ou code',
} as const;

/** Question guidée → Markdown : intertitres et bloc de code pour l'erreur. */
export function composeQuestionBody(parts: { goal: string; tried?: string; error?: string }) {
  const sections = [`## ${QUESTION_SECTIONS.goal}\n\n${parts.goal.trim()}`];
  if (parts.tried?.trim()) sections.push(`## ${QUESTION_SECTIONS.tried}\n\n${parts.tried.trim()}`);
  if (parts.error?.trim()) {
    const error = parts.error.replace(/\s+$/, '');
    sections.push(`## ${QUESTION_SECTIONS.error}\n\n${FENCE}\n${error}\n${FENCE}`);
  }
  return sections.join('\n\n');
}

/** Extrait de code → Markdown : l'explication, puis le code dans un bloc du bon langage. */
export function composeCodeBody(parts: { explanation?: string; code: string; language?: string }) {
  const block = `${FENCE}${parts.language ?? ''}\n${parts.code.replace(/\s+$/, '')}\n${FENCE}`;
  return parts.explanation?.trim() ? `${parts.explanation.trim()}\n\n${block}` : block;
}

/** Retire un bloc de code ``` qui entoure tout le texte (section « Message d'erreur »). */
function unfence(text: string) {
  const match = /^```[^\n]*\n([\s\S]*?)\n?```$/.exec(text.trim());
  return match ? match[1]! : text.trim();
}

/**
 * Markdown → champs guidés d'une question (retour depuis l'éditeur libre).
 * Renvoie null si le texte ne suit plus la structure (intertitres modifiés, texte ajouté avant…).
 */
export function parseQuestionBody(
  body: string,
): { goal: string; tried: string; error: string } | null {
  const result = { goal: '', tried: '', error: '' };
  if (!body.trim()) return result;
  const parts = body.split(/^## (.+)$/m);
  if (parts[0]!.trim()) return null;
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i]!.trim();
    const content = (parts[i + 1] ?? '').trim();
    const key = (Object.keys(QUESTION_SECTIONS) as (keyof typeof QUESTION_SECTIONS)[]).find(
      (k) => QUESTION_SECTIONS[k] === title,
    );
    if (!key) return null;
    result[key] = key === 'error' ? unfence(content) : content;
  }
  return result;
}

/** Markdown → champs d'un extrait de code : l'explication, puis un seul bloc de code. */
export function parseCodeBody(
  body: string,
): { explanation: string; code: string; language: string } | null {
  if (!body.trim()) return { explanation: '', code: '', language: '' };
  const match = /^([\s\S]*?)```([\w#+-]*)\n([\s\S]*?)\n?```\s*$/.exec(body.trim());
  if (!match || match[1]!.includes('```')) return null;
  return { explanation: match[1]!.trim(), language: match[2] ?? '', code: match[3]! };
}

export const createPostSchema = z.object({
  type: postTypeSchema,
  title: z.string().trim().min(5).max(180),
  body: z.string().trim().min(1).max(50_000),
  tags: z.array(tagSchema).max(5).default([]),
  communityId: z.uuid().optional(),
  details: postDetailsSchema.optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

/** Le type d'une publication ne change pas après coup. */
export const updatePostSchema = createPostSchema.omit({ type: true, communityId: true });
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const listPostsQuerySchema = cursorQuerySchema.extend({
  type: postTypeSchema.optional(),
  author: z.string().trim().toLowerCase().optional(),
  tag: tagSchema.optional(),
  community: z.string().trim().toLowerCase().optional(),
});
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;

/** Réactions du visiteur sur une page du fil : `?ids=a,b,c` (30 au maximum). */
export const viewerReactionsQuerySchema = z.object({
  ids: z
    .string()
    .transform((v) => [...new Set(v.split(',').filter(Boolean))])
    .pipe(z.array(z.uuid()).min(1).max(30)),
});

export interface AuthorDto {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  reputation?: number;
}

export interface PostDto {
  id: string;
  type: PostType;
  title: string;
  body: string;
  tags: string[];
  author: AuthorDto;
  /** Total des réactions (likeCount + usefulCount) */
  reactionCount: number;
  likeCount: number;
  usefulCount: number;
  commentCount: number;
  createdAt: string;
  editedAt?: string | null;
  community?: { slug: string; name: string } | null;
  /** Champs propres au type (avancement d'un projet, langage d'un extrait…) */
  details: PostDetails | null;
  /** Présent quand la requête est authentifiée */
  viewer?: { reactions: ReactionType[]; isAuthor: boolean; canModerate: boolean };
  /** Présent pour une question : une réponse a été acceptée */
  hasAcceptedAnswer?: boolean;
}

/**
 * Version légère pour les listes (fil, profil, recherche) : un extrait au lieu du contenu complet,
 * pour que chaque page du fil ne pèse que quelques Ko, même sur une connexion 3G.
 */
export type PostSummaryDto = Omit<PostDto, 'body' | 'viewer' | 'hasAcceptedAnswer'> & {
  excerpt: string;
  codePreview: string | null;
};

/** Taille d'une page du fil : un écran bien rempli, sans charger ce qui ne sera pas lu. */
export const FEED_PAGE_SIZE = 10;
