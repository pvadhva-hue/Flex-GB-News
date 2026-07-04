import { redis } from "./redis";
import type { AnalysedStory, RevenueDataPoint } from "./types";

const STORIES_KEY = "bess:stories:latest";
const REVENUE_KEY = "bess:revenue:series";
const MAX_STORIES = 100;

export async function getStories(): Promise<AnalysedStory[]> {
  try {
    const stories = await redis.get<AnalysedStory[]>(STORIES_KEY);
    return stories ?? [];
  } catch (error) {
    console.error("[store] Failed to read stories from Redis:", error);
    return [];
  }
}

export async function addStories(newStories: AnalysedStory[]): Promise<AnalysedStory[]> {
  const existing = await getStories();
  if (newStories.length === 0) return existing;

  const existingHashes = new Set(existing.map((story) => story.hash));
  const merged = [...newStories.filter((story) => !existingHashes.has(story.hash)), ...existing];
  const trimmed = merged
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, MAX_STORIES);

  try {
    await redis.set(STORIES_KEY, trimmed);
  } catch (error) {
    console.error("[store] Failed to write stories to Redis:", error);
  }
  return trimmed;
}

export async function getRevenueSeries(): Promise<RevenueDataPoint[]> {
  try {
    const series = await redis.get<RevenueDataPoint[]>(REVENUE_KEY);
    return series ?? [];
  } catch (error) {
    console.error("[store] Failed to read revenue series from Redis:", error);
    return [];
  }
}
