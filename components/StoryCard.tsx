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

export default function StoryCard({ story }: { story: AnalysedStory }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full flex-col items-start gap-2 text-left"
      >
        <div className="flex w-full items-center justify-between gap-3">
          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs uppercase tracking-wide text-[#00e5c8]">
            {CATEGORY_LABELS[story.category]}
          </span>
          <span className="text-xs text-slate-500">
            {story.source} · score {story.score}/10
          </span>
        </div>
        <h2 className="text-base font-medium text-slate-100 sm:text-lg">{story.title}</h2>
        <p className="text-sm text-slate-400">{story.summary}</p>
      </button>

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
