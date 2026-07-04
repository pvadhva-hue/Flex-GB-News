import { NextResponse } from "next/server";
import { fetchAllStories } from "@/lib/fetcher";
import { filterUnseenStories } from "@/lib/dedup";
import { analyseStories } from "@/lib/analyser";
import { addStories } from "@/lib/store";
import type { ApiResponse, RunBriefResult } from "@/lib/types";

export async function POST(): Promise<NextResponse<ApiResponse<RunBriefResult>>> {
  try {
    const fetched = await fetchAllStories();
    const unseen = await filterUnseenStories(fetched);
    const analysed = await analyseStories(unseen);
    await addStories(analysed);

    return NextResponse.json({
      success: true,
      data: {
        fetched: fetched.length,
        newStories: unseen.length,
        analysedStories: analysed,
      },
    });
  } catch (error) {
    console.error("[run-brief] Unexpected failure:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
