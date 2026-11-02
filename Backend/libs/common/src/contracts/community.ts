import type { UserCard } from './identity.js';

export const COMMUNITY_SERVICE = 'COMMUNITY_SERVICE';

export const CommunityPatterns = {
  health: 'community.health',
  getFeed: 'feed.get',
  trendingTags: 'tags.trending',
  createPost: 'posts.create',
  updatePost: 'posts.update',
  deletePost: 'posts.delete',
  setReaction: 'posts.set-reaction',
  removeReaction: 'posts.remove-reaction',
  savePost: 'posts.save',
  unsavePost: 'posts.unsave',
} as const;

export const FEED_TABS = ['for_you', 'latest', 'unsolved', 'trending'] as const;
export const REACTION_TYPES = ['like', 'love', 'support', 'wow'] as const;
export const POST_STATUSES = ['open', 'solved'] as const;

export const POST_TEXT_MAX_LENGTH = 5000;
export const POST_MAX_TAGS = 5;
export const POST_MAX_IMAGES = 4;

export type FeedTab = (typeof FEED_TABS)[number];
export type ReactionType = (typeof REACTION_TYPES)[number];
export type PostStatus = (typeof POST_STATUSES)[number];
export type ReactionCounts = Record<ReactionType, number>;

export interface PostImage {
  url: string;
  alt: string;
}

export interface PostView {
  id: string;
  // Missing once the author has deleted their account.
  author: UserCard | null;
  text: string;
  images: PostImage[];
  tags: string[];
  communityId?: string;
  status: PostStatus;
  reactionCounts: ReactionCounts;
  commentCount: number;
  saveCount: number;
  myReaction: ReactionType | null;
  isSaved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedPage {
  items: PostView[];
  nextCursor: string | null;
}

export interface TrendingTag {
  tag: string;
  count: number;
}

export interface ReactionResult {
  reactionCounts: ReactionCounts;
  myReaction: ReactionType | null;
}

export interface SaveResult {
  isSaved: boolean;
  saveCount: number;
}

export interface GetFeedInput {
  userId: string;
  tab: FeedTab;
  cursor?: string;
  limit: number;
}

export interface PostContentInput {
  text: string;
  tags: string[];
}

export interface PostActionInput {
  userId: string;
  postId: string;
}

// The socket event only says something new exists, because every viewer sees a post differently.
export const FEED_ROOM = 'feed';
export const POST_NEW_EVENT = 'post:new';

export interface PostNewEvent {
  id: string;
  authorId: string;
}
