import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  getActiveOrganizationProfile,
  upsertOrganizationProfile,
} from "@/lib/server/postgres/repositories/organization-profile";

export const runtime = "nodejs";

const organizationProfileSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().min(2),
  poBox: z.string().trim().min(2),
  telephone: z.string().trim().min(4),
  email: z.string().trim().email(),
  tin: z.string().trim().min(2),
  registrationNumber: z.string().trim().min(2),
  logoStorageUrl: z.string().trim().url().or(z.literal("")).optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const profile = await getActiveOrganizationProfile({ fresh: true });
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load organization profile.";
    const status = /unauthorized|forbidden/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = organizationProfileSchema.parse(body);
    const profile = await upsertOrganizationProfile({
      ...parsed,
      logoStorageUrl: parsed.logoStorageUrl || null,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid organization profile payload." },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Could not save organization profile.";
    const status = /unauthorized|forbidden/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
