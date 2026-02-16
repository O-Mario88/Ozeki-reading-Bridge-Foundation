import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSchoolDirectoryRecord,
  listSchoolDirectoryRecords,
} from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const schoolSchema = z.object({
  name: z.string().min(2),
  district: z.string().min(2),
  subCounty: z.string().min(2),
  parish: z.string().min(2),
  village: z.string().trim().optional(),
  enrolledBoys: z.coerce.number().int().min(0).optional(),
  enrolledGirls: z.coerce.number().int().min(0).optional(),
  gpsLat: z.string().trim().optional(),
  gpsLng: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
});

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const district = searchParams.get("district") || undefined;
  const query = searchParams.get("query") || undefined;

  return NextResponse.json({
    schools: listSchoolDirectoryRecords({ district, query }),
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = schoolSchema.parse(await request.json());
    const school = createSchoolDirectoryRecord({
      ...payload,
      village: payload.village?.trim() || undefined,
      enrolledBoys: payload.enrolledBoys ?? 0,
      enrolledGirls: payload.enrolledGirls ?? 0,
      gpsLat: payload.gpsLat?.trim() || undefined,
      gpsLng: payload.gpsLng?.trim() || undefined,
      contactName: payload.contactName?.trim() || undefined,
      contactPhone: payload.contactPhone?.trim() || undefined,
    });
    return NextResponse.json({ ok: true, school });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid school payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
