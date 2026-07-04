import { Resend } from "resend";
import EmailTemplate from "@/components/EmailTemplate";
import { filterUnsentStories, markSeen } from "./dedup";
import { getStories } from "./store";
import type { SendEmailResult } from "./types";

export async function sendDailyBrief(): Promise<SendEmailResult> {
  const stories = await getStories();
  const unsent = await filterUnsentStories(stories);

  if (unsent.length === 0) {
    console.log("[mailer] No new stories to send, skipping.");
    return { sent: false, storiesSent: 0 };
  }

  const fromEmail = process.env.FROM_EMAIL;
  const toEmail = process.env.TO_EMAIL;
  if (!fromEmail || !toEmail) {
    throw new Error("FROM_EMAIL or TO_EMAIL environment variable is not set");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
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

  return { sent: true, storiesSent: unsent.length };
}
