import { describe, expect, it } from 'vitest';
import { activityQuerySchema, decodeActivityCursor, encodeActivityCursor } from '@fricadev/shared';
import { branchesFor } from '../src/modules/activity/activity.service.js';

describe('« Mon activité »', () => {
  it('valide la requête : onglets connus, 20 lignes par défaut', () => {
    expect(activityQuerySchema.parse({})).toMatchObject({ limit: 20 });
    expect(activityQuerySchema.parse({ type: 'likes', q: ' zemi ' })).toMatchObject({
      type: 'likes',
      q: 'zemi',
    });
    expect(() => activityQuerySchema.parse({ type: 'tout' })).toThrow();
    expect(() => activityQuerySchema.parse({ limit: 500 })).toThrow();
  });

  it('code et relit le curseur ; refuse un curseur abîmé', () => {
    const at = '2026-10-03T12:00:00.000Z';
    const cursor = encodeActivityCursor(at, '01a0fc72-cce9-746b-9f02-dc1a1e8f750d:LIKE');
    expect(decodeActivityCursor(cursor)).toEqual({
      at: new Date(at),
      id: '01a0fc72-cce9-746b-9f02-dc1a1e8f750d:LIKE',
    });
    expect(decodeActivityCursor('pas-un-curseur')).toBeNull();
  });

  it('un onglet ne garde que sa partie de la requête', () => {
    expect(branchesFor()).toEqual({
      likes: true,
      useful: true,
      comments: true,
      applications: true,
      posts: true,
    });
    expect(branchesFor('comments')).toEqual({
      likes: false,
      useful: false,
      comments: true,
      applications: false,
      posts: false,
    });
  });
});
