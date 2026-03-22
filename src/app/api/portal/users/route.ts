import { NextResponse } from "next/server";
import { z } from "zod";
import {
  canManagePortalUsers,
  createPortalUserAccount,
  deletePortalUserAccount,
  listPortalUsersForAdmin,
  listPortalUsersForFilters,
  updatePortalUserPermissions,
} from "@/services/dataService";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const allRoles = ["Staff", "Volunteer", "Admin", "Accountant", "Coach", "DataClerk", "SchoolLeader", "Partner", "Government"] as const;

const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(allRoles),
  password: z.string().min(8),
  department: z.string().optional(),
  geographyScope: z.string().optional(),
  sendInviteEmail: z.boolean().optional(),
  isSupervisor: z.boolean().optional(),
  isME: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  isSuperAdmin: z.boolean().optional(),
});

const updateUserSchema = z.object({
  userId: z.coerce.number().int().positive(),
  fullName: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(allRoles).optional(),
  department: z.string().nullable().optional(),
  geographyScope: z.string().nullable().optional(),
  status: z.enum(["active", "invited", "deactivated"]).optional(),
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
      users: await listPortalUsersForAdmin(user),
    });
  }

  return NextResponse.json({
    users: await listPortalUsersForFilters(user),
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
    const shouldInvite = payload.sendInviteEmail === true;
    await createPortalUserAccount({
      ...payload,
      status: shouldInvite ? "invited" : "active",
      mustChangePassword: shouldInvite,
    }, user);

    // Send invitation email if requested
    if (shouldInvite) {
      try {
        const { sendOnboardingInviteEmail } = await import("@/lib/onboarding-email");
        const baseUrl = new URL(request.url).origin;
        await sendOnboardingInviteEmail(payload.email, {
          fullName: payload.fullName,
          temporaryPassword: payload.password,
          loginUrl: `${baseUrl}/portal/login`,
          role: payload.role,
        });
      } catch (emailError) {
        console.warn("[INVITE] Email send failed:", emailError instanceof Error ? emailError.message : emailError);
        // User was created successfully — don't fail the whole operation
      }
    }

    return NextResponse.json({
      ok: true,
      users: await listPortalUsersForAdmin(user),
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
    await updatePortalUserPermissions(payload.userId, payload, user);
    return NextResponse.json({
      ok: true,
      users: await listPortalUsersForAdmin(user),
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
    await deletePortalUserAccount(payload.userId, user);
    return NextResponse.json({
      ok: true,
      users: await listPortalUsersForAdmin(user),
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
