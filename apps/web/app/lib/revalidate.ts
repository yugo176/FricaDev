import type { ShouldRevalidateFunctionArgs } from 'react-router';

/**
 * Une réaction (J'aime / Utile) est affichée localement par le bouton : inutile de recharger
 * la page, ce qui ramènerait en plus le fil à sa première page.
 */
export function keepPageOnReaction({
  formAction,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formAction === '/api/react') return false;
  return defaultShouldRevalidate;
}
