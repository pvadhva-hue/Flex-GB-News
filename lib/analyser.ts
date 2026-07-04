import Anthropic from "@anthropic-ai/sdk";
import {
  ANALYSER_BATCH_SIZE,
  CLAUDE_MODEL,
  HIGH_RELEVANCE_THRESHOLD,
  PRIORITY_TOPICS,
  RELEVANCE_THRESHOLD,
  TRACKED_PLAYERS,
} from "./config";
import { hashStoryUrl } from "./dedup";
import type { AnalysedStory, Story, StoryCategory, StoryRegion } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_CATEGORIES: StoryCategory[] = [
  "transaction",
  "offtake",
  "policy",
  "market",
  "technology",
  "other",
];

const VALID_REGIONS: StoryRegion[] = ["europe", "row"];

interface RawAnalysis {
  index: number;
  score: number;
  category: string;
  region: string;
  summary: string;
  players: string[];
  auroraRelevance?: string;
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

  return `You are analysing news articles for an energy storage advisor at Aurora Energy Research who tracks GB and European battery energy storage (BESS) transactions, offtake structures (tolls, floors, financial swaps), and market/policy/technology developments.
Track these key players: ${TRACKED_PLAYERS.join(", ")}.

Score these topics especially highly (8+) whenever they appear, even if from a general news roundup rather than a dedicated article:
${PRIORITY_TOPICS.map((topic) => `- ${topic}`).join("\n")}

For each article below:
1. Score its relevance to BESS on a 0-10 scale.
2. Categorise it as one of: transaction, offtake, policy, market, technology, other.
3. Classify its primary geography as "europe" (GB and continental Europe) or "row" (rest of world - Americas, Asia-Pacific, Australia, Middle East, Africa, or global/no specific geography).
4. Write a one-sentence summary of what happened.
5. List any tracked players mentioned.
6. ONLY if the relevance score is ${HIGH_RELEVANCE_THRESHOLD} or higher, also write a one-to-two sentence "auroraRelevance" explaining specifically why this matters to an Aurora Energy Research advisor tracking GB/European BESS transactions and offtake structures (e.g. precedent for deal structuring, pricing signal, regulatory read-across, competitor/client activity). Omit this field entirely for articles scoring below ${HIGH_RELEVANCE_THRESHOLD}.

Articles:
${articles}

Respond with ONLY a JSON array (no markdown, no prose) where each element has this exact shape:
{"index": number, "score": number, "category": "transaction"|"offtake"|"policy"|"market"|"technology"|"other", "region": "europe"|"row", "summary": string, "players": string[], "auroraRelevance"?: string}`;
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
    const region: StoryRegion = VALID_REGIONS.includes(item.region as StoryRegion)
      ? (item.region as StoryRegion)
      : "europe";

    analysed.push({
      ...story,
      hash: hashStoryUrl(story.link),
      score: item.score,
      category,
      region,
      summary: item.summary ?? "",
      players: Array.isArray(item.players) ? item.players : [],
      auroraRelevance:
        item.score >= HIGH_RELEVANCE_THRESHOLD && item.auroraRelevance
          ? item.auroraRelevance
          : undefined,
    });
  }

  return analysed;
}

export async function analyseStories(stories: Story[]): Promise<AnalysedStory[]> {
  const batches = chunk(stories, ANALYSER_BATCH_SIZE);
  const results = await Promise.all(batches.map(analyseBatch));
  return results.flat();
}
