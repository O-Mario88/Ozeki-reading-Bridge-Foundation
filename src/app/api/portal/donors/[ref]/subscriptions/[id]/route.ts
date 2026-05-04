import { NextResponse } from "next/server";
import { getCurrentExternalUser } from "@/lib/external-auth";
import { auditLog } from "@/lib/server/audit/log";
import { cancelDonorSubscription } from "@/lib/server/postgres/repositories/donor-portfolio";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ ref: string; id: string }> },
) {
  const { ref, id } = await context.params;
  const user = await getCurrentExternalUser();
  if (!user || user.role !== "donor" || user.refCode !== ref) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const subscriptionId = Number(id);
  if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) {
    return NextResponse.json({ error: "Invalid subscription id." }, { status: 400 });
  }
  await cancelDonorSubscription(user.id, subscriptionId);
  await auditLog({
    actor: { id: 0, name: `${user.fullName} (donor)` },
    action: "cancel",
    targetTable: "donor_recurring_subscriptions",
    targetId: subscriptionId,
    detail: `Donor cancelled recurring plan #${subscriptionId}`,
    request,
  });
  return NextResponse.json({ ok: true });
}
