import {
  codePreview,
  composeCodeBody,
  composeQuestionBody,
  excerpt,
  type CodeLanguage,
  type PostDetails,
  type PostType,
  type ProjectStage,
} from '@fricadev/shared';

/** Tout le contenu du formulaire de publication (sert aussi au brouillon et à l'aperçu). */
export interface ComposerState {
  type: PostType;
  title: string;
  body: string;
  tags: string[];
  communityId: string;
  /** Question / code : saisie libre en Markdown plutôt que les champs guidés. */
  freeform: boolean;
  // Projet
  pitch: string;
  stage: ProjectStage | '';
  repoUrl: string;
  demoUrl: string;
  lookingForTeam: boolean;
  // Question guidée
  goal: string;
  tried: string;
  error: string;
  // Extrait de code
  language: CodeLanguage | '';
  code: string;
  explanation: string;
  // Article
  subtitle: string;
}

export function emptyComposer(type: PostType, communityId = ''): ComposerState {
  return {
    type,
    title: '',
    body: '',
    tags: [],
    communityId,
    freeform: false,
    pitch: '',
    stage: '',
    repoUrl: '',
    demoUrl: '',
    lookingForTeam: false,
    goal: '',
    tried: '',
    error: '',
    language: '',
    code: '',
    explanation: '',
    subtitle: '',
  };
}

/** Champs guidés utilisés (création d'une question ou d'un extrait, hors saisie libre). */
export function isGuided(state: ComposerState, mode: 'create' | 'edit') {
  return (
    mode === 'create' && !state.freeform && (state.type === 'QUESTION' || state.type === 'CODE')
  );
}

/** Contenu Markdown tel qu'il sera publié. */
export function composedBody(state: ComposerState, mode: 'create' | 'edit') {
  if (!isGuided(state, mode)) return state.body;
  if (state.type === 'QUESTION') {
    return state.goal.trim()
      ? composeQuestionBody({ goal: state.goal, tried: state.tried, error: state.error })
      : '';
  }
  return state.code.trim()
    ? composeCodeBody({
        explanation: state.explanation,
        code: state.code,
        language: state.language || undefined,
      })
    : '';
}

export function composerDetails(state: ComposerState): PostDetails {
  const details: PostDetails = {};
  if (state.type === 'PROJECT') {
    if (state.pitch.trim()) details.pitch = state.pitch.trim();
    if (state.stage) details.stage = state.stage;
    if (state.repoUrl.trim()) details.repoUrl = state.repoUrl.trim();
    if (state.demoUrl.trim()) details.demoUrl = state.demoUrl.trim();
  }
  if (state.type === 'CODE' && state.language) details.language = state.language;
  if (state.type === 'ARTICLE' && state.subtitle.trim()) details.subtitle = state.subtitle.trim();
  return details;
}

/** Brouillon vide : rien d'écrit (le type et la communauté ne comptent pas). */
export function isComposerEmpty(state: ComposerState) {
  return (
    ![
      state.title,
      state.body,
      state.pitch,
      state.repoUrl,
      state.demoUrl,
      state.goal,
      state.tried,
      state.error,
      state.code,
      state.explanation,
      state.subtitle,
    ].some((v) => v.trim()) && state.tags.length === 0
  );
}

/** Données de la carte d'aperçu (« À quoi ça ressemblera »). */
export function previewSummary(state: ComposerState, mode: 'create' | 'edit') {
  const body = composedBody(state, mode);
  return {
    excerpt: excerpt(body),
    codePreview: codePreview(body),
    details: composerDetails(state),
    body,
  };
}
