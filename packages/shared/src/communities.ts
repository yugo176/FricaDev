export const COMMUNITY_TYPES = ['COUNTRY', 'TECH', 'SCHOOL'] as const;
export type CommunityType = (typeof COMMUNITY_TYPES)[number];

export interface CommunityDto {
  id: string;
  slug: string;
  name: string;
  type: CommunityType;
  description: string | null;
  countryCode: string | null;
  memberCount: number;
  viewer?: { isMember: boolean };
}

export interface SearchResultsDto {
  posts: import('./posts.js').PostSummaryDto[];
  users: {
    handle: string;
    displayName: string;
    avatarUrl: string | null;
    countryCode: string | null;
    reputation: number;
  }[];
  tags: string[];
}
