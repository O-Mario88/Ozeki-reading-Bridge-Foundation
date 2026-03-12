import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deletePortalCoreValue,
  savePortalCoreValue,
  updatePortalCoreValue,
} from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

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
    const value = savePortalCoreValue({
      title: body.title,
      description: body.description,
      sortOrder: body.sortOrder,
      isPublished: body.isPublished,
      userId: user!.id,
      userName: user!.fullName,
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
    const value = updatePortalCoreValue({
      id: body.id,
      title: body.title,
      description: body.description,
      sortOrder: body.sortOrder,
      isPublished: body.isPublished,
      userId: user!.id,
      userName: user!.fullName,
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
    deletePortalCoreValue({
      id: body.id,
      userId: user!.id,
      userName: user!.fullName,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete core value." },
      { status: 400 },
    );
  }
}
