import * as cheerio from "cheerio";
import type { Story } from "./types";

const OFGEM_NEWS_URL = "https://www.ofgem.gov.uk/news-and-insight";
const OFGEM_BASE_URL = "https://www.ofgem.gov.uk";
const OFGEM_CONTENT_PATH_PATTERN = /\/(press-release|news-and-insight|guidance|publications)\//;
const MAX_STORIES = 30;

// Ofgem has no RSS/Atom feed, so we scrape the news listing page's links instead
// of parsing structured feed items. The page doesn't expose a machine-readable
// publish date per item, so pubDate is set to fetch time as a placeholder -
// this means Ofgem stories will always sort as "most recent" until a real
// date field is identified and wired in.
export async function fetchOfgemStories(): Promise<Story[]> {
  try {
    const response = await fetch(OFGEM_NEWS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      },
    });
    if (!response.ok) {
      throw new Error(`Ofgem returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const now = new Date().toISOString();

    const seenLinks = new Set<string>();
    const stories: Story[] = [];

    $("a[href]").each((_, el) => {
      if (stories.length >= MAX_STORIES) return;

      const href = $(el).attr("href");
      if (!href || !OFGEM_CONTENT_PATH_PATTERN.test(href)) return;

      const title = $(el).text().trim().replace(/\s+/g, " ");
      if (title.length < 15) return;

      const link = href.startsWith("http") ? href : new URL(href, OFGEM_BASE_URL).toString();
      if (seenLinks.has(link)) return;
      seenLinks.add(link);

      stories.push({
        title,
        link,
        pubDate: now,
        source: "Ofgem",
        sourceWeight: 3,
        contentSnippet: "",
      });
    });

    return stories;
  } catch (error) {
    console.error("[ofgemScraper] Failed to fetch Ofgem news:", error);
    return [];
  }
}
