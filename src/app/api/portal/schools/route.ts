import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSchoolDirectoryRecord,
  listSchoolDirectoryRecords,
  updateSchoolDirectoryRecord,
} from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const schoolSchema = z.object({
  name: z.string().min(2),
  district: z.string().min(2),
  subCounty: z.string().trim().optional(),
  parish: z.string().trim().optional(),
  village: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  enrollmentTotal: z.coerce.number().int().min(0).optional(),
  enrollmentByGrade: z.string().trim().optional(),
  enrolledBoys: z.coerce.number().int().min(0).optional(),
  enrolledGirls: z.coerce.number().int().min(0).optional(),
  gpsLat: z.string().trim().optional(),
  gpsLng: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  proprietor: z.object({
    fullName: z.string().trim().min(2, "Primary contact full name is required."),
    gender: z.enum(["Male", "Female", "Other"]),
    phone: z.string().trim().optional(),
    email: z.string().trim().email().optional().or(z.literal("")),
    whatsapp: z.string().trim().optional(),
    category: z
      .enum([
        "Proprietor",
        "Head Teacher",
        "DOS",
        "Teacher",
        "Administrator",
        "Deputy Head Teacher",
        "Accountant",
      ])
      .optional(),
    roleTitle: z.string().trim().optional(),
  }),
});

const schoolUpdateSchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).optional(),
  district: z.string().trim().min(2).optional(),
  subCounty: z.string().trim().min(2).optional(),
  parish: z.string().trim().min(2).optional(),
  village: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  enrollmentTotal: z.coerce.number().int().min(0).optional(),
  enrollmentByGrade: z.string().trim().nullable().optional(),
  enrolledBoys: z.coerce.number().int().min(0).optional(),
  enrolledGirls: z.coerce.number().int().min(0).optional(),
  gpsLat: z.string().trim().nullable().optional(),
  gpsLng: z.string().trim().nullable().optional(),
  contactName: z.string().trim().nullable().optional(),
  contactPhone: z.string().trim().nullable().optional(),
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
    schools: await listSchoolDirectoryRecords({ district, query }),
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
      notes: payload.notes?.trim() || undefined,
      enrollmentTotal: payload.enrollmentTotal,
      enrollmentByGrade: payload.enrollmentByGrade?.trim() || undefined,
      enrolledBoys: payload.enrolledBoys ?? 0,
      enrolledGirls: payload.enrolledGirls ?? 0,
      gpsLat: payload.gpsLat?.trim() || undefined,
      gpsLng: payload.gpsLng?.trim() || undefined,
      contactName: payload.contactName?.trim() || undefined,
      contactPhone: payload.contactPhone?.trim() || undefined,
      proprietor: {
        fullName: payload.proprietor.fullName.trim(),
        gender: payload.proprietor.gender,
        phone: payload.proprietor.phone?.trim() || undefined,
        email: payload.proprietor.email?.trim() || undefined,
        whatsapp: payload.proprietor.whatsapp?.trim() || undefined,
        category: payload.proprietor.category,
        roleTitle: payload.proprietor.roleTitle?.trim() || undefined,
      },
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

export async function PATCH(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "Volunteer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = schoolUpdateSchema.parse(await request.json());
    const school = updateSchoolDirectoryRecord(payload.schoolId, {
      name: payload.name,
      district: payload.district,
      subCounty: payload.subCounty,
      parish: payload.parish,
      village: payload.village,
      notes: payload.notes,
      enrollmentTotal: payload.enrollmentTotal,
      enrollmentByGrade: payload.enrollmentByGrade,
      enrolledBoys: payload.enrolledBoys,
      enrolledGirls: payload.enrolledGirls,
      gpsLat: payload.gpsLat,
      gpsLng: payload.gpsLng,
      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
    });

    return NextResponse.json({ ok: true, school });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid school update payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
