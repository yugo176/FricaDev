import {
  CheckCircle2,
  Handshake,
  Heart,
  MessageCircle,
  PartyPopper,
  ThumbsUp,
  UserPlus,
  Users,
} from 'lucide-react';
import type { NotificationDto, NotificationKind, NotificationReason } from '@fricadev/shared';

/** Icône, phrase et couleur de chaque type de notification. */
export const KIND: Record<NotificationKind, { Icon: typeof Users; text: string; tone: string }> = {
  answer: {
    Icon: MessageCircle,
    text: 'a répondu à',
    tone: 'text-indigo-600 dark:text-indigo-400',
  },
  accepted: {
    Icon: CheckCircle2,
    text: 'a accepté ta réponse sur',
    tone: 'text-brand-600 dark:text-brand-400',
  },
  useful: {
    Icon: ThumbsUp,
    text: 'a trouvé utile',
    tone: 'text-ocre-600 dark:text-ocre-200',
  },
  follow: {
    Icon: UserPlus,
    text: 'te suit désormais',
    tone: 'text-terre-600 dark:text-terre-400',
  },
  application: {
    Icon: Handshake,
    text: 'veut rejoindre ton projet',
    tone: 'text-ocre-600 dark:text-ocre-200',
  },
  application_accepted: {
    Icon: PartyPopper,
    text: 'a accepté ta candidature sur',
    tone: 'text-brand-600 dark:text-brand-400',
  },
  application_declined: {
    Icon: Handshake,
    text: 'n’a pas retenu ta candidature sur',
    tone: 'text-stone-500 dark:text-stone-400',
  },
};

export const REASON_UI: Record<NotificationReason, { label: string; Icon: typeof Users }> = {
  answers: { label: 'Réponses', Icon: MessageCircle },
  team: { label: 'Équipe', Icon: Handshake },
  follows: { label: 'Abonnés', Icon: UserPlus },
  reactions: { label: 'Réactions', Icon: Heart },
};

/** Page ouverte par un clic sur la notification. */
export function notificationTarget(n: NotificationDto): string {
  if (n.payload.postId) {
    const anchor = n.kind.startsWith('application') ? '#equipe' : '';
    return `/p/${n.payload.postId}${anchor}`;
  }
  if (n.payload.actor) return `/u/${n.payload.actor.handle}`;
  return '/notifications';
}
