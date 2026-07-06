import { NextResponse } from "next/server";
import { backfillAuroraRelevance } from "@/lib/analyser";
import { addStories, getStories } from "@/lib/store";
import type { ApiResponse } from "@/lib/types";

interface BackfillResult {
  attempted: number;
  filled: number;
  total: number;
}

// One-off backfill for stories stored before "auroraRelevance" was generated
// for every article rather than only the highest-scoring ones. Run manually
// (POST) once - new stories from the regular pipeline already get this field.
export async function POST(): Promise<NextResponse<ApiResponse<BackfillResult>>> {
  try {
    const stories = await getStories();
    const missing = stories.filter((story) => !story.auroraRelevance);

    if (missing.length === 0) {
      return NextResponse.json({
        success: true,
        data: { attempted: 0, filled: 0, total: stories.length },
      });
    }

    const patched = await backfillAuroraRelevance(missing);
    await addStories(patched);

    const filled = patched.filter((story) => story.auroraRelevance).length;

    return NextResponse.json({
      success: true,
      data: { attempted: missing.length, filled, total: stories.length },
    });
  } catch (error) {
    console.error("[backfill-aurora-relevance] Unexpected failure:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
