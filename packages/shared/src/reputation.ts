/** Barème de réputation : on gagne des points quand son aide est reconnue par les autres. */
export const REPUTATION_POINTS = {
  POST_LIKED: 2,
  POST_USEFUL: 5,
  ANSWER_USEFUL: 5,
  ANSWER_ACCEPTED: 15,
} as const;
export type ReputationReason = keyof typeof REPUTATION_POINTS;

export interface PublicProfileDto {
  id: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  countryCode: string | null;
  skills: string[];
  reputation: number;
  createdAt: string;
  stats: {
    posts: number;
    answers: number;
    acceptedAnswers: number;
    followers: number;
    following: number;
  };
  viewer?: { isFollowing: boolean; isMe: boolean };
}
