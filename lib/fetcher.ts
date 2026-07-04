import Parser from "rss-parser";
import { ALL_FEEDS } from "./config";
import type { FeedSource, Story } from "./types";

const parser = new Parser();

async function fetchFeed(feed: FeedSource): Promise<Story[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items ?? [])
      .filter((item) => Boolean(item.link))
      .map((item) => ({
        title: item.title ?? "Untitled",
        link: item.link as string,
        pubDate: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
        source: feed.label,
        sourceWeight: feed.weight,
        contentSnippet: item.contentSnippet ?? item.content ?? "",
      }));
  } catch (error) {
    console.error(`[fetcher] Failed to fetch feed "${feed.label}" (${feed.url}):`, error);
    return [];
  }
}

export async function fetchAllStories(): Promise<Story[]> {
  const results = await Promise.all(ALL_FEEDS.map(fetchFeed));
  return results.flat();
}
