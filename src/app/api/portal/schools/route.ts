import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { listSchoolDirectoryRecordsPostgres } from "@/lib/server/postgres/repositories/schools";
import { createOrUpdateSchool } from "@/lib/server/services/schools/write-service";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const schoolSchema = z.object({
  name: z.string().min(2),
  country: z.string().trim().optional(),
  region: z.string().trim().optional(),
  subRegion: z.string().trim().optional(),
  district: z.string().min(2),
  subCounty: z.string().trim().optional(),
  parish: z.string().trim().optional(),
  village: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  alternateSchoolNames: z.string().trim().optional(),
  schoolExternalId: z.string().trim().nullable().optional(),
  schoolStatus: z.string().trim().optional(),
  schoolStatusDate: z.string().trim().optional(),
  currentPartnerType: z.string().trim().optional(),
  yearFounded: z.coerce.number().int().min(0).optional(),

  accountRecordType: z.string().trim().optional(),
  schoolType: z.string().trim().optional(),
  parentAccountLabel: z.string().trim().optional(),
  schoolRelationshipStatus: z.string().trim().optional(),
  schoolRelationshipStatusDate: z.string().trim().optional(),
  denomination: z.string().trim().optional(),
  protestantDenomination: z.string().trim().optional(),
  clientSchoolNumber: z.coerce.number().int().min(0).optional(),
  firstMetricDate: z.string().trim().optional(),
  metricCount: z.coerce.number().int().min(0).optional(),
  runningTotalMaxEnrollment: z.coerce.number().int().min(0).optional(),
  partnerType: z.string().trim().optional(),
  currentPartnerSchool: z.coerce.boolean().optional(),
  schoolActive: z.coerce.boolean().optional(),
  website: z.string().trim().optional(),
  description: z.string().trim().optional(),
  enrollmentTotal: z.coerce.number().int().min(0).optional(),
  enrollmentByGrade: z.string().trim().optional(),
  enrolledBoys: z.coerce.number().int().min(0).optional(),
  enrolledGirls: z.coerce.number().int().min(0).optional(),
  classesJson: z.string().trim().nullable().optional(),
  enrolledBaby: z.coerce.number().int().min(0).optional(),
  enrolledMiddle: z.coerce.number().int().min(0).optional(),
  enrolledTop: z.coerce.number().int().min(0).optional(),
  enrolledP1: z.coerce.number().int().min(0).optional(),
  enrolledP2: z.coerce.number().int().min(0).optional(),
  enrolledP3: z.coerce.number().int().min(0).optional(),
  enrolledP4: z.coerce.number().int().min(0).optional(),
  enrolledP5: z.coerce.number().int().min(0).optional(),
  enrolledP6: z.coerce.number().int().min(0).optional(),
  enrolledP7: z.coerce.number().int().min(0).optional(),
  gpsLat: z.string().trim().optional(),
  gpsLng: z.string().trim().optional(),
  headTeacherName: z.string().trim().optional(),
  headTeacherGender: z.enum(["Male", "Female", "Other"]).optional(),
  headTeacherPhone: z.string().trim().optional(),
  headTeacherEmail: z.string().trim().email().optional().or(z.literal("")),
  headTeacherWhatsapp: z.string().trim().optional(),
  directorName: z.string().trim().optional(),
  directorGender: z.enum(["Male", "Female", "Other"]).optional(),
  directorPhone: z.string().trim().optional(),
  directorEmail: z.string().trim().email().optional().or(z.literal("")),
  directorWhatsapp: z.string().trim().optional(),
});

const schoolUpdateSchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).optional(),
  country: z.string().trim().min(2).optional(),
  region: z.string().trim().min(2).optional(),
  subRegion: z.string().trim().min(2).optional(),
  district: z.string().trim().min(2).optional(),
  subCounty: z.string().trim().min(2).optional(),
  parish: z.string().trim().min(2).optional(),
  village: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  alternateSchoolNames: z.string().trim().nullable().optional(),
  schoolExternalId: z.string().trim().nullable().optional(),
  schoolStatus: z.string().trim().min(2).optional(),
  schoolStatusDate: z.string().trim().nullable().optional(),
  currentPartnerType: z.string().trim().optional(),
  yearFounded: z.coerce.number().int().min(0).nullable().optional(),

  accountRecordType: z.string().trim().optional(),
  schoolType: z.string().trim().optional(),
  parentAccountLabel: z.string().trim().optional(),
  schoolRelationshipStatus: z.string().trim().nullable().optional(),
  schoolRelationshipStatusDate: z.string().trim().nullable().optional(),
  denomination: z.string().trim().nullable().optional(),
  protestantDenomination: z.string().trim().nullable().optional(),
  clientSchoolNumber: z.coerce.number().int().min(0).optional(),
  firstMetricDate: z.string().trim().nullable().optional(),
  metricCount: z.coerce.number().int().min(0).optional(),
  runningTotalMaxEnrollment: z.coerce.number().int().min(0).optional(),
  partnerType: z.string().trim().nullable().optional(),
  currentPartnerSchool: z.boolean().optional(),
  schoolActive: z.boolean().optional(),
  website: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  enrollmentTotal: z.coerce.number().int().min(0).optional(),
  enrollmentByGrade: z.string().trim().nullable().optional(),
  enrolledBoys: z.coerce.number().int().min(0).optional(),
  enrolledGirls: z.coerce.number().int().min(0).optional(),
  classesJson: z.string().trim().nullable().optional(),
  enrolledBaby: z.coerce.number().int().min(0).optional(),
  enrolledMiddle: z.coerce.number().int().min(0).optional(),
  enrolledTop: z.coerce.number().int().min(0).optional(),
  enrolledP1: z.coerce.number().int().min(0).optional(),
  enrolledP2: z.coerce.number().int().min(0).optional(),
  enrolledP3: z.coerce.number().int().min(0).optional(),
  enrolledP4: z.coerce.number().int().min(0).optional(),
  enrolledP5: z.coerce.number().int().min(0).optional(),
  enrolledP6: z.coerce.number().int().min(0).optional(),
  enrolledP7: z.coerce.number().int().min(0).optional(),
  gpsLat: z.string().trim().nullable().optional(),
  gpsLng: z.string().trim().nullable().optional(),
  headTeacherName: z.string().trim().optional(),
  headTeacherGender: z.enum(["Male", "Female", "Other"]).optional(),
  headTeacherPhone: z.string().trim().nullable().optional(),
  headTeacherEmail: z.string().trim().nullable().optional(),
  headTeacherWhatsapp: z.string().trim().nullable().optional(),
  directorName: z.string().trim().nullable().optional(),
  directorGender: z.enum(["Male", "Female", "Other"]).nullable().optional(),
  directorPhone: z.string().trim().nullable().optional(),
  directorEmail: z.string().trim().nullable().optional(),
  directorWhatsapp: z.string().trim().nullable().optional(),
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
    schools: await listSchoolDirectoryRecordsPostgres({ district, query }),
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
    const result = await createOrUpdateSchool({
      actor: user,
      input: {
        name: payload.name,
        country: payload.country?.trim() || undefined,
        region: payload.region?.trim() || undefined,
        subRegion: payload.subRegion?.trim() || undefined,
        district: payload.district,
        subCounty: payload.subCounty?.trim() || undefined,
        parish: payload.parish?.trim() || undefined,
        village: payload.village?.trim() || undefined,
        notes: payload.notes?.trim() || undefined,
        alternativeSchoolNames: payload.alternateSchoolNames?.trim() || undefined,
        schoolExternalId: payload.schoolExternalId?.trim() || undefined,
        schoolStatus: payload.schoolStatus?.trim() || undefined,
        schoolStatusDate: payload.schoolStatusDate?.trim() || undefined,
        currentPartnerType: payload.currentPartnerType?.trim() || undefined,
        yearFounded: payload.yearFounded,

        accountRecordType: payload.accountRecordType?.trim() || undefined,
        schoolType: payload.schoolType?.trim() || undefined,
        parentAccountLabel: payload.parentAccountLabel?.trim() || undefined,
        schoolRelationshipStatus: payload.schoolRelationshipStatus?.trim() || undefined,
        schoolRelationshipStatusDate: payload.schoolRelationshipStatusDate?.trim() || undefined,
        denomination: payload.denomination?.trim() || undefined,
        protestantDenomination: payload.protestantDenomination?.trim() || undefined,
        clientSchoolNumber: payload.clientSchoolNumber,
        firstMetricDate: payload.firstMetricDate?.trim() || undefined,
        metricCount: payload.metricCount,
        runningTotalMaxEnrollment: payload.runningTotalMaxEnrollment,
        partnerType: payload.partnerType?.trim() || undefined,
        currentPartnerSchool: payload.currentPartnerSchool,
        schoolActive: payload.schoolActive,
        website: payload.website?.trim() || undefined,
        description: payload.description?.trim() || undefined,
        enrollmentTotal: payload.enrollmentTotal,
        enrollmentByGrade: payload.enrollmentByGrade?.trim() || undefined,
        enrolledBoys: payload.enrolledBoys ?? 0,
        enrolledGirls: payload.enrolledGirls ?? 0,
        classesJson: payload.classesJson ?? undefined,
        enrolledBaby: payload.enrolledBaby ?? 0,
        enrolledMiddle: payload.enrolledMiddle ?? 0,
        enrolledTop: payload.enrolledTop ?? 0,
        enrolledP1: payload.enrolledP1 ?? 0,
        enrolledP2: payload.enrolledP2 ?? 0,
        enrolledP3: payload.enrolledP3 ?? 0,
        enrolledP4: payload.enrolledP4 ?? 0,
        enrolledP5: payload.enrolledP5 ?? 0,
        enrolledP6: payload.enrolledP6 ?? 0,
        enrolledP7: payload.enrolledP7 ?? 0,
        latitude: payload.gpsLat?.trim() || undefined,
        longitude: payload.gpsLng?.trim() || undefined,
        schoolPhone: payload.headTeacherPhone?.trim() || undefined,
        schoolEmail: payload.headTeacherEmail?.trim() || undefined,
        headTeacher: payload.headTeacherName?.trim()
          ? {
              fullName: payload.headTeacherName.trim(),
              gender: payload.headTeacherGender || "Other",
              phone: payload.headTeacherPhone?.trim() || undefined,
              email: payload.headTeacherEmail?.trim() || undefined,
              whatsapp: payload.headTeacherWhatsapp?.trim() || undefined,
            }
          : undefined,
        director: payload.directorName?.trim()
          ? {
              fullName: payload.directorName.trim(),
              gender: payload.directorGender || "Other",
              phone: payload.directorPhone?.trim() || undefined,
              email: payload.directorEmail?.trim() || undefined,
              whatsapp: payload.directorWhatsapp?.trim() || undefined,
            }
          : undefined,
      },
    });
    await auditLog({
      actor: user,
      action: "create",
      targetTable: "schools_directory",
      targetId: result.school.id,
      after: result.school,
      detail: `Created ${result.school.schoolCode ?? result.school.name}`,
      request,
    });
    return NextResponse.json({ ok: true, school: result.school });
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
    const result = await createOrUpdateSchool({
      actor: user,
      input: {
        schoolId: payload.schoolId,
        name: payload.name,
        country: payload.country,
        region: payload.region,
        subRegion: payload.subRegion,
        district: payload.district,
        subCounty: payload.subCounty,
        parish: payload.parish,
        village: payload.village,
        notes: payload.notes,
        alternativeSchoolNames: payload.alternateSchoolNames,
        schoolExternalId: payload.schoolExternalId,
        schoolStatus: payload.schoolStatus,
        schoolStatusDate: payload.schoolStatusDate,
        currentPartnerType: payload.currentPartnerType,
        yearFounded: payload.yearFounded,

        accountRecordType: payload.accountRecordType,
        schoolType: payload.schoolType,
        parentAccountLabel: payload.parentAccountLabel,
        schoolRelationshipStatus: payload.schoolRelationshipStatus,
        schoolRelationshipStatusDate: payload.schoolRelationshipStatusDate,
        denomination: payload.denomination,
        protestantDenomination: payload.protestantDenomination,
        clientSchoolNumber: payload.clientSchoolNumber,
        firstMetricDate: payload.firstMetricDate,
        metricCount: payload.metricCount,
        runningTotalMaxEnrollment: payload.runningTotalMaxEnrollment,
        partnerType: payload.partnerType,
        currentPartnerSchool: payload.currentPartnerSchool,
        schoolActive: payload.schoolActive,
        website: payload.website,
        description: payload.description,
        enrollmentTotal: payload.enrollmentTotal,
        enrollmentByGrade: payload.enrollmentByGrade,
        enrolledBoys: payload.enrolledBoys,
        enrolledGirls: payload.enrolledGirls,
        classesJson: payload.classesJson === null ? null : payload.classesJson,
        enrolledBaby: payload.enrolledBaby,
        enrolledMiddle: payload.enrolledMiddle,
        enrolledTop: payload.enrolledTop,
        enrolledP1: payload.enrolledP1,
        enrolledP2: payload.enrolledP2,
        enrolledP3: payload.enrolledP3,
        enrolledP4: payload.enrolledP4,
        enrolledP5: payload.enrolledP5,
        enrolledP6: payload.enrolledP6,
        enrolledP7: payload.enrolledP7,
        latitude: payload.gpsLat,
        longitude: payload.gpsLng,
        schoolPhone: payload.headTeacherPhone,
        schoolEmail: payload.headTeacherEmail || undefined,
        headTeacher: payload.headTeacherName?.trim()
          ? {
              fullName: payload.headTeacherName.trim(),
              gender: payload.headTeacherGender || "Other",
              phone: payload.headTeacherPhone || undefined,
              email: payload.headTeacherEmail || undefined,
              whatsapp: payload.headTeacherWhatsapp?.trim() || undefined,
            }
          : undefined,
        director: payload.directorName?.trim()
          ? {
              fullName: payload.directorName.trim(),
              gender: payload.directorGender || "Other",
              phone: payload.directorPhone || undefined,
              email: payload.directorEmail || undefined,
              whatsapp: payload.directorWhatsapp?.trim() || undefined,
            }
          : undefined,
      },
    });

    await auditLog({
      actor: user,
      action: "update",
      targetTable: "schools_directory",
      targetId: result.school.id,
      after: result.school,
      detail: `Updated ${result.school.schoolCode ?? result.school.name}`,
      request,
    });
    return NextResponse.json({ ok: true, school: result.school });
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
