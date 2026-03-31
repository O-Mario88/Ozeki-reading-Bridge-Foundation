import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentPortalUser } from "@/lib/auth";
import { authenticatePortalUserPostgres } from "@/lib/server/postgres/repositories/auth";

export const runtime = "nodejs";

const reverifySchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentPortalUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = reverifySchema.parse(await request.json());
    
    // We only reverify by taking their known email + their supplied password
    const verifiedUser = await authenticatePortalUserPostgres(user.email, payload.password);

    if (!verifiedUser || verifiedUser.id !== user.id) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (_error) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
}
