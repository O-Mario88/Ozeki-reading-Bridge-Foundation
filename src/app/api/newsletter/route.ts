import { NextResponse } from "next/server";
import { z } from "zod";
import { saveNewsletterSubscriber } from "@/lib/content-db";

export const runtime = "nodejs";

const newsletterSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  try {
    const payload = newsletterSchema.parse(await request.json());
    const localPart = payload.email
      .split("@")[0]
      ?.replace(/[._-]+/g, " ")
      .trim();
    const fallbackName =
      localPart && localPart.length >= 2 ? localPart : "Newsletter Subscriber";

    await saveNewsletterSubscriber({
      email: payload.email.toLowerCase(),
      name: payload.name?.trim() || fallbackName,
    });

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
