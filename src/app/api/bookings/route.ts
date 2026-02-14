import { NextResponse } from "next/server";
import { z } from "zod";
import { saveBooking } from "@/lib/db";

export const runtime = "nodejs";

const bookingSchema = z.object({
  service: z.string().min(2),
  schoolName: z.string().min(2),
  contactName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  teachers: z.coerce.number().int().positive(),
  grades: z.string().min(2),
  challenges: z.string().min(10),
  location: z.string().min(2),
  preferredDate: z.string().min(6),
  preferredTime: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const payload = bookingSchema.parse(await request.json());
    saveBooking(payload);

    return NextResponse.json({ ok: true, message: "Booking request submitted." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid booking payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
