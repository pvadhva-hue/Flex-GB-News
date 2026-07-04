import { NextResponse } from "next/server";
import { Resend } from "resend";
import EmailTemplate from "@/components/EmailTemplate";
import { filterUnsentStories, markSeen } from "@/lib/dedup";
import { getStories } from "@/lib/store";
import type { ApiResponse, SendEmailResult } from "@/lib/types";

export async function POST(): Promise<NextResponse<ApiResponse<SendEmailResult>>> {
  try {
    const stories = await getStories();
    const unsent = await filterUnsentStories(stories);

    if (unsent.length === 0) {
      console.log("[send-email] No new stories to send, skipping.");
      return NextResponse.json({ success: true, data: { sent: false, storiesSent: 0 } });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL;
    const toEmail = process.env.TO_EMAIL;
    if (!fromEmail || !toEmail) {
      throw new Error("FROM_EMAIL or TO_EMAIL environment variable is not set");
    }

    const now = new Date();
    const weekday = now.toLocaleDateString("en-GB", { weekday: "long" });
    const date = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const subject = `BESS Brief — ${weekday} ${date} · ${unsent.length} new stories`;

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject,
      react: EmailTemplate({ stories: unsent, weekday, date }),
    });

    if (error) {
      throw new Error(`Resend failed: ${error.message}`);
    }

    // Mark seen only after a confirmed successful send, so a failure never
    // silently drops stories from the next attempt.
    await markSeen(unsent.map((story) => story.hash));

    return NextResponse.json({ success: true, data: { sent: true, storiesSent: unsent.length } });
  } catch (error) {
    console.error("[send-email] Unexpected failure:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
