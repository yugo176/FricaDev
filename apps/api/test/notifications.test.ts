import { describe, expect, it } from 'vitest';
import {
  bulkNotificationsSchema,
  listNotificationsQuerySchema,
  NOTIFICATION_KINDS,
  reasonOf,
} from '@fricadev/shared';
import { actionData, filtersToWhere } from '../src/modules/notifications/notifications.service.js';

const USER = '01a0fc2b-0000-7000-8000-000000000001';

describe('filtres des notifications', () => {
  it('applique les valeurs par défaut : boîte de réception, toutes, 20 par page', () => {
    const query = listNotificationsQuerySchema.parse({});
    expect(query).toMatchObject({ view: 'inbox', unread: false, limit: 20 });
    expect(filtersToWhere(USER, query)).toEqual({ userId: USER, archivedAt: null });
  });

  it('traduit vue, non lues, motif et publication', () => {
    const postId = '01a0fc2b-0000-7000-8000-0000000000aa';
    const query = listNotificationsQuerySchema.parse({
      view: 'pinned',
      unread: '1',
      reason: 'team',
      postId,
    });
    expect(filtersToWhere(USER, query)).toEqual({
      userId: USER,
      pinnedAt: { not: null },
      readAt: null,
      kind: { in: ['application', 'application_accepted', 'application_declined'] },
      postId,
    });
  });

  it('refuse une vue ou un motif inconnus', () => {
    expect(() => listNotificationsQuerySchema.parse({ view: 'all' })).toThrow();
    expect(() => listNotificationsQuerySchema.parse({ reason: 'spam' })).toThrow();
  });

  it('rattache chaque type de notification à un motif', () => {
    for (const kind of NOTIFICATION_KINDS) expect(reasonOf(kind)).not.toBeNull();
    expect(reasonOf('accepted')).toBe('answers');
  });
});

describe('actions groupées', () => {
  it('limite le nombre de notifications et valide les identifiants', () => {
    expect(() => bulkNotificationsSchema.parse({ ids: [], action: 'read' })).toThrow();
    expect(() => bulkNotificationsSchema.parse({ ids: ['x'], action: 'read' })).toThrow();
    expect(() =>
      bulkNotificationsSchema.parse({ ids: Array(101).fill(USER), action: 'read' }),
    ).toThrow();
  });

  it('archiver une notification la marque aussi comme lue', () => {
    const now = new Date('2026-10-02T12:00:00Z');
    expect(actionData('archive', now)).toEqual({ archivedAt: now, readAt: now });
    expect(actionData('unarchive', now)).toEqual({ archivedAt: null });
    expect(actionData('unread', now)).toEqual({ readAt: null });
  });
});
