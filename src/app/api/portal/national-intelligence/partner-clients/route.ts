import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createPartnerApiClientAsync,
  listPartnerApiClientsAsync,
  setPartnerApiClientActiveAsync,
} from "@/lib/national-intelligence";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { canManagePartnerApiClients } from "@/lib/national-intelligence-auth";

export const runtime = "nodejs";

const postSchema = z.object({
  partnerName: z.string().trim().min(2).max(120),
  allowedScopeType: z.enum(["country", "region", "sub_region", "district", "sub_county", "parish", "school"]),
  allowedScopeIds: z.array(z.string().trim().min(1)).min(1).max(200),
});

const patchSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  active: z.boolean(),
});

export async function GET() {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManagePartnerApiClients(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    return NextResponse.json({ clients: await listPartnerApiClientsAsync() });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManagePartnerApiClients(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = postSchema.parse(await request.json());
    const created = await createPartnerApiClientAsync({
      user,
      input: payload,
    });

    return NextResponse.json({
      created,
      warning:
        "Store API key securely now. It is shown only once and cannot be retrieved in plain text later.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid partner client payload." },
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
  if (!canManagePartnerApiClients(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = patchSchema.parse(await request.json());
    await setPartnerApiClientActiveAsync({
      user,
      clientId: payload.clientId,
      active: payload.active,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid partner client patch payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
