import { NextResponse } from "next/server";
import { z } from "zod";
import { saveContact } from "@/lib/db";

export const runtime = "nodejs";

const contactSchema = z.object({
  type: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  organization: z.string().optional(),
  message: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const payload = contactSchema.parse(await request.json());
    saveContact(payload);

    return NextResponse.json({ ok: true, message: "Inquiry submitted." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid inquiry payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
