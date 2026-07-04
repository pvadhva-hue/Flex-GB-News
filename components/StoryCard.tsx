"use client";

import { useState } from "react";
import type { AnalysedStory } from "@/lib/types";

const CATEGORY_LABELS: Record<AnalysedStory["category"], string> = {
  transaction: "Transaction",
  offtake: "Offtake",
  policy: "Policy",
  market: "Market",
  technology: "Technology",
  other: "Other",
};

const REGION_LABELS: Record<AnalysedStory["region"], string> = {
  europe: "Europe",
  row: "Rest of World",
};

function formatDate(pubDate: string): string {
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return pubDate;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function StoryCard({ story }: { story: AnalysedStory }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full flex-col items-start gap-2 text-left"
      >
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs uppercase tracking-wide text-[#00e5c8]">
              {CATEGORY_LABELS[story.category]}
            </span>
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-400">
              {REGION_LABELS[story.region]}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {formatDate(story.pubDate)} · {story.source} · score {story.score}/10
          </span>
        </div>
        <h2 className="text-base font-medium text-slate-100 sm:text-lg">{story.title}</h2>
        <p className="text-sm text-slate-400">{story.summary}</p>
      </button>

      {story.auroraRelevance && (
        <div className="mt-3 rounded-md border border-[#00e5c8]/30 bg-[#00e5c8]/5 p-3 text-sm text-slate-300">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#00e5c8]">
            Why this matters to Aurora
          </span>
          {story.auroraRelevance}
        </div>
      )}

      {expanded && (
        <div className="mt-3 border-t border-slate-800 pt-3 text-sm text-slate-400">
          {story.players.length > 0 && (
            <p className="mb-2">
              <span className="text-slate-500">Players: </span>
              {story.players.join(", ")}
            </p>
          )}
          <p className="mb-2">{story.contentSnippet}</p>
          <a
            href={story.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00e5c8] hover:underline"
          >
            Read full story →
          </a>
        </div>
      )}
    </article>
  );
}
