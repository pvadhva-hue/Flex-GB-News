import { NextResponse } from "next/server";
import { fetchAllStories } from "@/lib/fetcher";
import { filterUnseenStories } from "@/lib/dedup";
import { analyseStories } from "@/lib/analyser";
import { sendDailyBrief } from "@/lib/mailer";
import { addStories } from "@/lib/store";
import type { ApiResponse, RunBriefResult } from "@/lib/types";

// vercel.json schedules this route via two daily UTC cron entries (one that
// lands at 06:30 UK time during BST, one during GMT) since Vercel Cron has no
// timezone/DST awareness. Whichever entry doesn't correspond to genuine 06:30
// UK local time on a given day is a no-op via this guard, so the pipeline
// only actually runs once a day regardless of the season.
function isSixThirtyUkTime(): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour === 6 && minute === 30;
}

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

// Vercel Cron Jobs trigger via GET - only run the pipeline if it's genuinely
// 06:30 UK time right now (see isSixThirtyUkTime above).
export async function GET(): Promise<NextResponse<ApiResponse<RunBriefResult>>> {
  if (!isSixThirtyUkTime()) {
    return NextResponse.json({
      success: true,
      data: { fetched: 0, newStories: 0, analysedStories: [], skipped: true },
    });
  }
  return runBrief();
}

// POST always runs immediately, regardless of time of day - used for manual
// testing.
export const POST = runBrief;
