import { redis } from "./redis";
import type { AnalysedStory, RevenueDataPoint } from "./types";

const STORIES_KEY = "bess:stories:latest";
const REVENUE_KEY = "bess:revenue:series";
const MAX_STORIES = 100;

export async function getStories(): Promise<AnalysedStory[]> {
  try {
    const stories = await redis.get<AnalysedStory[]>(STORIES_KEY);
    // Defend against stories persisted under an older schema (e.g. before the
    // "region"/"dataCentre" fields existed) that haven't been re-analysed since.
    return (stories ?? []).map((story) => ({
      ...story,
      region: story.region ?? "europe",
      dataCentre: story.dataCentre ?? false,
    }));
  } catch (error) {
    console.error("[store] Failed to read stories from Redis:", error);
    return [];
  }
}

export async function addStories(newStories: AnalysedStory[]): Promise<AnalysedStory[]> {
  const existing = await getStories();
  if (newStories.length === 0) return existing;

  // A freshly re-analysed story (matched by hash) always replaces the stored
  // version, so re-running the pipeline picks up schema/analysis changes.
  const freshHashes = new Set(newStories.map((story) => story.hash));
  const untouched = existing.filter((story) => !freshHashes.has(story.hash));
  const merged = [...newStories, ...untouched];
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
