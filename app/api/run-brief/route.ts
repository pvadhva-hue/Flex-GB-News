import { NextResponse } from "next/server";
import { fetchAllStories } from "@/lib/fetcher";
import { filterUnseenStories } from "@/lib/dedup";
import { analyseStories } from "@/lib/analyser";
import { sendDailyBrief } from "@/lib/mailer";
import { addStories } from "@/lib/store";
import type { ApiResponse, RunBriefResult } from "@/lib/types";

// Vercel Cron Jobs trigger this route with a GET request, while manual/local
// testing has been done via POST - both are supported and run the identical
// pipeline.
async function runBrief(): Promise<NextResponse<ApiResponse<RunBriefResult>>> {
  try {
    const fetched = await fetchAllStories();
    const unseen = await filterUnseenStories(fetched);
    const analysed = await analyseStories(unseen);
    await addStories(analysed);

    const result: RunBriefResult = {
      fetched: fetched.length,
      newStories: unseen.length,
      analysedStories: analysed,
    };

    // A failed email send shouldn't erase a successful fetch/analyse/store -
    // report it alongside the pipeline result rather than as an overall 500.
    try {
      result.emailResult = await sendDailyBrief();
    } catch (emailError) {
      console.error("[run-brief] Chained email send failed:", emailError);
      result.emailError = emailError instanceof Error ? emailError.message : "Unknown error";
    }

    return NextResponse.json({ success: true, data: result });
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

export const GET = runBrief;
export const POST = runBrief;
