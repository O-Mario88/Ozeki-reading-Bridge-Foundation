import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import {
  listSubscriptionsForUserPostgres,
  upsertSubscriptionPostgres,
} from "@/lib/server/postgres/repositories/notifications";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requirePortalUser();
    const data = await listSubscriptionsForUserPostgres(user.id);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[api/portal/notifications/subscriptions GET]", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}

const schema = z.object({
  eventType: z.string().min(2).max(100),
  channel: z.enum(["in_app", "email", "sms"]),
  isEnabled: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const user = await requirePortalUser();
    const body = await request.json();
    const parsed = schema.parse(body);
    await upsertSubscriptionPostgres({
      userId: user.id,
      eventType: parsed.eventType,
      channel: parsed.channel,
      isEnabled: parsed.isEnabled,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/portal/notifications/subscriptions POST]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
