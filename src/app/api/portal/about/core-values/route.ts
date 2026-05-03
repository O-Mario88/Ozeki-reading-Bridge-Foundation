import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deletePortalCoreValuePostgres,
  savePortalCoreValuePostgres,
  updatePortalCoreValuePostgres,
} from "@/lib/server/postgres/repositories/public-content";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const payloadSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().min(20).max(5000),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isPublished: z.boolean().optional(),
});

function canManage(user: Awaited<ReturnType<typeof getAuthenticatedPortalUser>>) {
  return Boolean(user && user.role !== "Volunteer");
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!canManage(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = payloadSchema.parse(await request.json());
    const value = await savePortalCoreValuePostgres({
      title: body.title,
      description: body.description,
      sortOrder: body.sortOrder,
      isPublished: body.isPublished,
      userId: user!.id,
    });
    return NextResponse.json({ value });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save core value." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!canManage(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = payloadSchema.extend({ id: z.number().int().positive() }).parse(await request.json());
    const value = await updatePortalCoreValuePostgres({
      id: body.id,
      title: body.title,
      description: body.description,
      sortOrder: body.sortOrder,
      isPublished: body.isPublished,
      userId: user!.id,
    });
    return NextResponse.json({ value });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update core value." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!canManage(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = z.object({ id: z.number().int().positive() }).parse(await request.json());
    await deletePortalCoreValuePostgres(body.id);
    if (user) {
      await auditLog({
        actor: user,
        action: "delete",
        targetTable: "portal_core_values",
        targetId: body.id,
        request,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete core value." },
      { status: 400 },
    );
  }
}
