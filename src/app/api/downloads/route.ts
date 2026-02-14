import { NextResponse } from "next/server";
import { z } from "zod";
import { saveDownloadLead } from "@/lib/db";

export const runtime = "nodejs";

const downloadSchema = z.object({
  resourceSlug: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  organization: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = downloadSchema.parse(await request.json());
    saveDownloadLead(payload);

    return NextResponse.json({ ok: true, message: "Lead captured." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid download payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
