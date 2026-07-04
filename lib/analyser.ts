import Anthropic from "@anthropic-ai/sdk";
import { ANALYSER_BATCH_SIZE, CLAUDE_MODEL, RELEVANCE_THRESHOLD, TRACKED_PLAYERS } from "./config";
import { hashStoryUrl } from "./dedup";
import type { AnalysedStory, Story, StoryCategory } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_CATEGORIES: StoryCategory[] = [
  "transaction",
  "offtake",
  "policy",
  "market",
  "technology",
  "other",
];

interface RawAnalysis {
  index: number;
  score: number;
  category: string;
  summary: string;
  players: string[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildPrompt(batch: Story[]): string {
  const articles = batch
    .map(
      (story, index) =>
        `[${index}] Source: ${story.source}\nTitle: ${story.title}\nSnippet: ${story.contentSnippet}`
    )
    .join("\n\n");

  return `You are analysing news articles for a GB/European battery energy storage (BESS) intelligence brief.
Track these key players: ${TRACKED_PLAYERS.join(", ")}.

For each article below, score its relevance to BESS transactions, offtake structures (tolls, floors, financial swaps), or market/policy/technology developments on a 0-10 scale, categorise it, write a one-sentence summary, and list any tracked players mentioned.

Articles:
${articles}

Respond with ONLY a JSON array (no markdown, no prose) where each element has this exact shape:
{"index": number, "score": number, "category": "transaction"|"offtake"|"policy"|"market"|"technology"|"other", "summary": string, "players": string[]}`;
}

async function analyseBatch(batch: Story[]): Promise<AnalysedStory[]> {
  let raw: RawAnalysis[];

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: buildPrompt(batch) }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content block in Claude response");
    }

    const parsed: unknown = JSON.parse(textBlock.text.trim());
    if (!Array.isArray(parsed)) {
      throw new Error("Expected a JSON array from Claude");
    }
    raw = parsed as RawAnalysis[];
  } catch (error) {
    console.error("[analyser] Failed to analyse batch, skipping:", error);
    return [];
  }

  const analysed: AnalysedStory[] = [];
  for (const item of raw) {
    const story = batch[item.index];
    if (!story || typeof item.score !== "number") continue;
    if (item.score < RELEVANCE_THRESHOLD) continue;

    const category: StoryCategory = VALID_CATEGORIES.includes(item.category as StoryCategory)
      ? (item.category as StoryCategory)
      : "other";

    analysed.push({
      ...story,
      hash: hashStoryUrl(story.link),
      score: item.score,
      category,
      summary: item.summary ?? "",
      players: Array.isArray(item.players) ? item.players : [],
    });
  }

  return analysed;
}

export async function analyseStories(stories: Story[]): Promise<AnalysedStory[]> {
  const batches = chunk(stories, ANALYSER_BATCH_SIZE);
  const results = await Promise.all(batches.map(analyseBatch));
  return results.flat();
}
