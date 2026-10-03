import type { PostType } from '@fricadev/shared';
import { Chip } from './ui';
import { POST_TYPE_UI } from '~/lib/post-types';

/** Type d'une publication : pastille sobre, l'icône seule porte la couleur du type. */
export function PostTypeBadge({ type }: { type: PostType }) {
  const ui = POST_TYPE_UI[type];
  return <Chip icon={<ui.Icon size={13} className={ui.iconClass} aria-hidden />}>{ui.label}</Chip>;
}
