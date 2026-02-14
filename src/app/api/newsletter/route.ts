import { NextResponse } from "next/server";
import { z } from "zod";
import { saveNewsletterSubscriber } from "@/lib/db";

export const runtime = "nodejs";

const newsletterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const payload = newsletterSchema.parse(await request.json());
    saveNewsletterSubscriber(payload);

    return NextResponse.json({ ok: true, message: "Subscribed successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid subscription payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
