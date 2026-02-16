import { NextResponse } from "next/server";
import { z } from "zod";
import {
  canManagePortalUsers,
  createPortalUserAccount,
  deletePortalUserAccount,
  listPortalUsersForAdmin,
  listPortalUsersForFilters,
  updatePortalUserPermissions,
} from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(["Staff", "Volunteer"]),
  password: z.string().min(8),
  isSupervisor: z.boolean().optional(),
  isME: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  isSuperAdmin: z.boolean().optional(),
});

const updateUserSchema = z.object({
  userId: z.coerce.number().int().positive(),
  fullName: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(["Staff", "Volunteer"]).optional(),
  isSupervisor: z.boolean().optional(),
  isME: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  isSuperAdmin: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

const deleteUserSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = new URL(request.url).searchParams.get("mode");
  if (mode === "admin") {
    if (!canManagePortalUsers(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      users: listPortalUsersForAdmin(user),
    });
  }

  return NextResponse.json({
    users: listPortalUsersForFilters(user),
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManagePortalUsers(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = createUserSchema.parse(await request.json());
    createPortalUserAccount(payload, user);
    return NextResponse.json({
      ok: true,
      users: listPortalUsersForAdmin(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid user payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManagePortalUsers(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = updateUserSchema.parse(await request.json());
    updatePortalUserPermissions(payload.userId, payload, user);
    return NextResponse.json({
      ok: true,
      users: listPortalUsersForAdmin(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid user update payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManagePortalUsers(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = deleteUserSchema.parse(await request.json());
    deletePortalUserAccount(payload.userId, user);
    return NextResponse.json({
      ok: true,
      users: listPortalUsersForAdmin(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid delete payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
