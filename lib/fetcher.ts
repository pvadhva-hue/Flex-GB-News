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

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  let content = match[1].trim();
  const cdataMatch = content.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdataMatch) content = cdataMatch[1].trim();
  return decodeEntities(content.replace(/<[^>]+>/g, "")).trim();
}

// Fallback for feeds whose XML is well-formed enough to reach us but fails
// rss-parser's strict SAX parsing (e.g. unescaped raw HTML inside a
// <description> field, common on RNS announcement feeds - stray attributes
// like `nowrap` or unquoted values are valid HTML but invalid XML). We only
// need title/link/pubDate/description, so extract those directly with regex
// instead of trying to parse the whole document as a tree.
function extractItemsWithRegex(
  xml: string
): { title: string; link: string; pubDate: string; contentSnippet: string }[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return blocks
    .map((block) => ({
      title: extractTag(block, "title") || "Untitled",
      link: extractTag(block, "link") || extractTag(block, "guid"),
      pubDate: extractTag(block, "pubDate") || extractTag(block, "dc:date"),
      contentSnippet: extractTag(block, "description"),
    }))
    .filter((item) => Boolean(item.link));
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

    let items: { title?: string; link?: string; pubDate?: string; isoDate?: string; contentSnippet?: string; content?: string }[];
    try {
      const parsed = await parser.parseString(sanitized);
      items = parsed.items ?? [];
    } catch (parseError) {
      console.warn(
        `[fetcher] Strict XML parse failed for "${feed.label}", falling back to regex extraction:`,
        parseError
      );
      items = extractItemsWithRegex(sanitized);
    }

    return items
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
