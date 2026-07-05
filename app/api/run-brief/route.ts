import { NextResponse } from "next/server";
import { fetchAllStories } from "@/lib/fetcher";
import { filterUnseenStories } from "@/lib/dedup";
import { analyseStories } from "@/lib/analyser";
import { sendDailyBrief } from "@/lib/mailer";
import { addStories } from "@/lib/store";
import type { ApiResponse, RunBriefResult } from "@/lib/types";

// vercel.json schedules this route via two daily UTC cron entries (one that
// lands at 6am UK time during BST, one during GMT) since Vercel Cron has no
// timezone/DST awareness. Whichever entry doesn't correspond to genuine 6am
// UK local time on a given day is a no-op via this guard, so the pipeline
// only actually runs once a day regardless of the season. The two schedules
// are a full hour apart (05:30 and 06:30 UTC), so matching on the hour alone
// - rather than requiring an exact minute - is deliberate: cron triggers are
// not guaranteed to fire on the exact minute, and an exact-minute match would
// silently skip the entire day's run if a trigger landed even slightly late.
function isSixAmUkTime(): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return hour === 6;
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
// the 6am UK hour right now (see isSixAmUkTime above).
export async function GET(): Promise<NextResponse<ApiResponse<RunBriefResult>>> {
  if (!isSixAmUkTime()) {
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
