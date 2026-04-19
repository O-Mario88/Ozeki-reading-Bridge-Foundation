import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalUser } from "@/lib/auth";
import {
  listApiKeysPostgres,
  createApiKeyPostgres,
} from "@/lib/server/postgres/repositories/api-keys";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  organisation: z.string().trim().max(200).nullable().optional(),
  contactEmail: z.string().trim().email().nullable().optional(),
  scopes: z.array(z.string().trim().min(1)).optional(),
  rateLimitPerMinute: z.coerce.number().int().min(1).max(1000).optional(),
  rateLimitPerDay: z.coerce.number().int().min(1).max(1000000).optional(),
  expiresAt: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const user = await requirePortalUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Admin only." }, { status: 403 });
    }
    const keys = await listApiKeysPostgres();
    return NextResponse.json({ keys });
  } catch (error) {
    logger.error("[admin/api-keys] GET failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalUser();
    if (!user.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json({ error: "Admin only." }, { status: 403 });
    }
    const parsed = createSchema.parse(await req.json());
    const { record, plaintextKey } = await createApiKeyPostgres({
      ...parsed,
      createdByUserId: user.id,
    });
    // plaintextKey is returned ONCE and must be stored by the caller
    return NextResponse.json({ record, plaintextKey }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    logger.error("[admin/api-keys] POST failed", { error: String(error) });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
