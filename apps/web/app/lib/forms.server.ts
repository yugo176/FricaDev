import { data } from 'react-router';
import { composeCodeBody, composeQuestionBody } from '@fricadev/shared';
import { ApiError } from './api.server';

export type FieldErrors = Record<string, string[] | undefined>;

/** Transforme une erreur de l'API en données d'action affichables dans le formulaire. */
export function apiErrorToActionData(error: unknown, headers?: HeadersInit, intent?: string) {
  if (error instanceof ApiError) {
    const fieldErrors: FieldErrors =
      error.code === 'validation_error'
        ? ((error.details as { fieldErrors?: FieldErrors })?.fieldErrors ?? {})
        : {};
    return data(
      {
        ok: false as boolean,
        intent: intent ?? null,
        error: error.message as string | null,
        fieldErrors,
      },
      { status: error.status, headers },
    );
  }
  throw error;
}

export const splitList = (value: FormDataEntryValue | null) =>
  String(value ?? '')
    .split(/[,\s]+/)
    .map((item) => item.trim().toLowerCase().replace(/^#/, ''))
    .filter(Boolean);

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

/**
 * Champs du formulaire de publication → corps de requête de l'API.
 * Les champs guidés (question, extrait de code) sont assemblés ici, côté serveur :
 * le formulaire fonctionne donc aussi sans JavaScript.
 */
export function postFieldsFromForm(form: FormData) {
  const type = text(form, 'type');
  const guided = text(form, 'guided');
  const language = text(form, 'language');
  let body = String(form.get('body') ?? '');
  if (guided === 'question' && text(form, 'goal')) {
    body = composeQuestionBody({
      goal: text(form, 'goal'),
      tried: text(form, 'tried'),
      error: String(form.get('error') ?? ''),
    });
  } else if (guided === 'code' && text(form, 'code')) {
    body = composeCodeBody({
      explanation: text(form, 'explanation'),
      code: String(form.get('code') ?? ''),
      language: language || undefined,
    });
  }
  const details: Record<string, string> = {};
  for (const key of ['pitch', 'stage', 'repoUrl', 'demoUrl', 'language', 'subtitle']) {
    const value = text(form, key);
    if (value) details[key] = value;
  }
  return {
    type,
    title: text(form, 'title'),
    body,
    tags: splitList(form.get('tags')),
    details,
  };
}
