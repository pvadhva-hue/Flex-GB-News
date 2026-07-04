export type FeedWeight = 2 | 3;

export interface FeedSource {
  url: string;
  label: string;
  weight: FeedWeight;
}

export interface Story {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  sourceWeight: FeedWeight;
  contentSnippet: string;
}

export type StoryCategory =
  | "transaction"
  | "offtake"
  | "policy"
  | "market"
  | "technology"
  | "other";

export type StoryRegion = "europe" | "row";

export interface AnalysedStory extends Story {
  hash: string;
  score: number;
  category: StoryCategory;
  region: StoryRegion;
  summary: string;
  players: string[];
  auroraRelevance?: string;
}

export interface RevenueDataPoint {
  date: string;
  value: number;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface SendEmailResult {
  sent: boolean;
  storiesSent: number;
}

export interface RunBriefResult {
  fetched: number;
  newStories: number;
  analysedStories: AnalysedStory[];
  emailResult?: SendEmailResult;
  emailError?: string;
  skipped?: true;
}
