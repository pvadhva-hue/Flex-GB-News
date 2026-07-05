import Parser from "rss-parser";
import { ALL_FEEDS } from "./config";
import { fetchOfgemStories } from "./ofgemScraper";
import type { FeedSource, Story } from "./types";

const parser = new Parser();

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

// Some feeds (e.g. RNS announcement feeds) contain raw "&" characters in
// titles that were never escaped as "&amp;", which trips up strict XML
// parsing with "Invalid character in entity name". Escape any "&" that isn't
// already part of a valid entity before handing the XML to the parser.
function sanitizeXmlEntities(xml: string): string {
  return xml.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, "&amp;");
}

async function fetchFeed(feed: FeedSource): Promise<Story[]> {
  try {
    const response = await fetch(feed.url, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const sanitized = sanitizeXmlEntities(await response.text());
    const parsed = await parser.parseString(sanitized);

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
  const [feedResults, ofgemStories] = await Promise.all([
    Promise.all(ALL_FEEDS.map(fetchFeed)),
    fetchOfgemStories(),
  ]);
  const currentYear = new Date().getFullYear();
  return [...feedResults.flat(), ...ofgemStories].filter(
    (story) => new Date(story.pubDate).getFullYear() === currentYear
  );
}
