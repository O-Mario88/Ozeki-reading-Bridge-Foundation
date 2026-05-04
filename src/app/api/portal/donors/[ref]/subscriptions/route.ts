import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentExternalUser } from "@/lib/external-auth";
import { auditLog } from "@/lib/server/audit/log";
import {
  createDonorSubscription,
  listDonorSubscriptions,
} from "@/lib/server/postgres/repositories/donor-portfolio";

export const runtime = "nodejs";

const postSchema = z.object({
  planLabel: z.string().trim().min(2).max(120),
  amountUgx: z.number().int().positive().max(10_000_000_000),
  frequency: z.enum(["monthly", "quarterly", "annual"]),
});

async function authorise(ref: string) {
  const user = await getCurrentExternalUser();
  if (!user || user.role !== "donor" || user.refCode !== ref) {
    return null;
  }
  return user;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ ref: string }> },
) {
  const { ref } = await context.params;
  const user = await authorise(ref);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subscriptions = await listDonorSubscriptions(user.id);
  return NextResponse.json({ subscriptions });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ ref: string }> },
) {
  const { ref } = await context.params;
  const user = await authorise(ref);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const parsed = postSchema.parse(await request.json());
    const subscription = await createDonorSubscription({
      donorUserId: user.id,
      planLabel: parsed.planLabel,
      amountUgx: parsed.amountUgx,
      frequency: parsed.frequency,
    });

    await auditLog({
      actor: { id: 0, name: `${user.fullName} (donor)` },
      action: "create",
      targetTable: "donor_recurring_subscriptions",
      targetId: subscription.id,
      after: {
        planLabel: subscription.planLabel,
        amountUgx: subscription.amountUgx,
        frequency: subscription.frequency,
      },
      detail: `Donor created recurring plan "${subscription.planLabel}" (${subscription.frequency})`,
      request,
    });

    return NextResponse.json({ ok: true, subscription });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid plan payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
