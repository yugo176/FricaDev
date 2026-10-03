import { describe, expect, it } from 'vitest';
import {
  composeCodeBody,
  composeQuestionBody,
  parseCodeBody,
  parseQuestionBody,
  pickDetails,
  postDetailsSchema,
  viewerReactionsQuerySchema,
} from '@fricadev/shared';
import { buildDetails } from '../src/modules/posts/posts.service.js';

const ID = '01a0fc2b-0000-7000-8000-000000000001';

describe('réactions du visiteur (cartes du fil)', () => {
  it('découpe et dédoublonne la liste des publications', () => {
    expect(viewerReactionsQuerySchema.parse({ ids: `${ID},${ID},` }).ids).toEqual([ID]);
  });

  it('refuse une liste vide, des identifiants invalides ou plus de 30 publications', () => {
    expect(() => viewerReactionsQuerySchema.parse({ ids: '' })).toThrow();
    expect(() => viewerReactionsQuerySchema.parse({ ids: 'abc' })).toThrow();
    const many = Array.from({ length: 31 }, (_, i) => ID.slice(0, -2) + String(i).padStart(2, '0'));
    expect(() => viewerReactionsQuerySchema.parse({ ids: many.join(',') })).toThrow();
  });
});

describe('champs propres au type (details)', () => {
  it('ne garde que les champs autorisés pour le type', () => {
    expect(pickDetails('CODE', { language: 'python', pitch: 'Un pitch assez long' })).toEqual({
      language: 'python',
    });
    expect(pickDetails('QUESTION', { language: 'go' })).toBeNull();
  });

  it('n’accepte que des liens https', () => {
    expect(postDetailsSchema.safeParse({ repoUrl: 'https://github.com/a/b' }).success).toBe(true);
    expect(postDetailsSchema.safeParse({ repoUrl: 'http://exemple.com' }).success).toBe(false);
    expect(postDetailsSchema.safeParse({ demoUrl: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('calcule le temps de lecture des articles seulement', () => {
    const body = 'mot '.repeat(1000);
    expect(buildDetails('ARTICLE', { body })).toEqual({ readingMinutes: 5 });
    expect(buildDetails('PROJECT', { body, details: { stage: 'BETA' } })).toEqual({
      stage: 'BETA',
    });
  });
});

describe('assemblage du contenu guidé', () => {
  it('question : intertitres et bloc de code, sections vides omises', () => {
    const body = composeQuestionBody({ goal: 'Payer par Wave', tried: ' ', error: 'Error 401' });
    expect(body).toContain('## Ce que j’essaie de faire\n\nPayer par Wave');
    expect(body).not.toContain('déjà essayé');
    expect(body).toContain('```\nError 401\n```');
  });

  it('code : explication puis bloc dans le bon langage', () => {
    expect(
      composeCodeBody({ explanation: 'Formate', code: 'print(1)\n', language: 'python' }),
    ).toBe('Formate\n\n```python\nprint(1)\n```');
  });
});

describe('retour aux champs guidés (relecture du Markdown)', () => {
  it('question : relit les trois sections, même modifiées', () => {
    const body = composeQuestionBody({
      goal: 'Payer par Wave',
      tried: 'Un verrou',
      error: 'E 401',
    });
    expect(parseQuestionBody(body.replace('Un verrou', 'Un verrou en base'))).toEqual({
      goal: 'Payer par Wave',
      tried: 'Un verrou en base',
      error: 'E 401',
    });
  });

  it('question : refuse un texte qui ne suit plus la structure', () => {
    expect(parseQuestionBody('Texte libre\n\n## Ce que j’essaie de faire\n\nX')).toBeNull();
    expect(parseQuestionBody('## Autre intertitre\n\nX')).toBeNull();
  });

  it('code : explication et un seul bloc de code', () => {
    const body = composeCodeBody({ explanation: 'Formate', code: 'print(1)', language: 'python' });
    expect(parseCodeBody(body)).toEqual({
      explanation: 'Formate',
      code: 'print(1)',
      language: 'python',
    });
    expect(parseCodeBody('A\n\n```js\n1\n```\n\nB')).toBeNull();
  });
});
