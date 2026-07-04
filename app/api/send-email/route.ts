import { NextResponse } from "next/server";
import { sendDailyBrief } from "@/lib/mailer";
import type { ApiResponse, SendEmailResult } from "@/lib/types";

export async function POST(): Promise<NextResponse<ApiResponse<SendEmailResult>>> {
  try {
    const data = await sendDailyBrief();
    return NextResponse.json({ success: true, data });
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
