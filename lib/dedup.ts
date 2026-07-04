import { createHash } from "crypto";
import { redis } from "./redis";
import type { Story } from "./types";

const SEEN_SET_KEY = "bess:seen-story-hashes";

export function hashStoryUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

export async function isSeen(hash: string): Promise<boolean> {
  const result = await redis.sismember(SEEN_SET_KEY, hash);
  return result === 1;
}

export async function markSeen(hashes: string[]): Promise<void> {
  if (hashes.length === 0) return;
  const [first, ...rest] = hashes;
  await redis.sadd(SEEN_SET_KEY, first, ...rest);
}

export async function filterUnseenStories(stories: Story[]): Promise<Story[]> {
  if (stories.length === 0) return [];

  try {
    const pipeline = redis.pipeline();
    for (const story of stories) {
      pipeline.sismember(SEEN_SET_KEY, hashStoryUrl(story.link));
    }
    const results = await pipeline.exec<(0 | 1)[]>();

    return stories.filter((_, index) => results[index] !== 1);
  } catch (error) {
    console.error("[dedup] Failed to check seen-story hashes, treating all as unseen:", error);
    return stories;
  }
}
