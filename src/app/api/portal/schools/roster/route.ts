import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addSchoolContactToSchool,
  addSchoolLearnerToSchool,
  getSchoolContactByUid,
  getSchoolLearnerByUid,
  listSchoolContactsBySchool,
  listSchoolLearnersBySchool,
  updateSchoolContactInSchool,
  updateSchoolLearnerInSchool,
} from "@/services/dataService";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { isPostgresConfigured } from "@/lib/server/postgres/client";
import {
  createSchoolContactInSchoolPostgres,
  createSchoolLearnerInSchoolPostgres,
  getSchoolContactByUidPostgres,
  getSchoolLearnerByUidPostgres,
  listSchoolContactsBySchoolPostgres,
  listSchoolLearnersBySchoolPostgres,
  updateSchoolContactInSchoolPostgres,
  updateSchoolLearnerInSchoolPostgres,
} from "@/lib/server/postgres/repositories/schools";

export const runtime = "nodejs";

const contactCategorySchema = z.enum([
  "Proprietor",
  "Head Teacher",
  "Deputy Head Teacher",
  "DOS",
  "Head Teacher Lower",
  "Teacher",
  "Administrator",
  "Accountant",
]);

const addContactSchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  type: z.enum(["contact", "teacher"]).default("contact"),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
  gender: z.enum(["Male", "Female"]),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  category: contactCategorySchema.optional(),
  roleTitle: z.string().trim().optional(),
  isPrimaryContact: z.boolean().optional().default(false),
  isReadingTeacher: z.boolean().optional(),
  contactRecordType: z.string().trim().optional(),
  nickname: z.string().trim().optional(),
  leadershipRole: z.boolean().optional(),
  subRole: z.string().trim().optional(),
  roleFormula: z.string().trim().optional(),
  lastSsaSent: z.string().trim().optional(),
  trainer: z.boolean().optional(),
  notes: z.string().trim().optional(),
  classTaught: z.string().trim().optional(),
  subjectTaught: z.string().trim().optional(),
});

const addLearnerSchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  type: z.literal("learner"),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
  gender: z.enum(["Boy", "Girl", "Other"]),
  age: z.coerce.number().int().min(3).max(25),
  classGrade: z.string().trim().min(1, "Class/grade is required"),
  internalChildId: z.string().trim().optional(),
});

const updateContactSchema = z.object({
  uid: z.string().min(1),
  type: z.enum(["contact", "teacher"]).default("contact"),
  fullName: z.string().trim().min(2).optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  whatsapp: z.string().trim().nullable().optional(),
  category: contactCategorySchema.optional(),
  roleTitle: z.string().trim().nullable().optional(),
  isPrimaryContact: z.boolean().optional(),
  isReadingTeacher: z.boolean().optional(),
  contactRecordType: z.string().trim().nullable().optional(),
  nickname: z.string().trim().nullable().optional(),
  leadershipRole: z.boolean().optional(),
  subRole: z.string().trim().nullable().optional(),
  roleFormula: z.string().trim().nullable().optional(),
  lastSsaSent: z.string().trim().nullable().optional(),
  trainer: z.boolean().optional(),
  notes: z.string().trim().nullable().optional(),
  classTaught: z.string().trim().nullable().optional(),
  subjectTaught: z.string().trim().nullable().optional(),
});

const updateLearnerSchema = z.object({
  uid: z.string().min(1),
  type: z.literal("learner"),
  fullName: z.string().trim().min(2).optional(),
  gender: z.enum(["Boy", "Girl", "Other"]).optional(),
  age: z.coerce.number().int().min(3).max(25).optional(),
  classGrade: z.string().trim().min(1).optional(),
  internalChildId: z.string().trim().nullable().optional(),
});

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const schoolId = Number(searchParams.get("schoolId"));
  const type = searchParams.get("type") || "contact";

  if (!schoolId || !Number.isFinite(schoolId)) {
    return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
  }

  if (type === "learner") {
    if (isPostgresConfigured()) {
      return NextResponse.json({
        roster: (await listSchoolLearnersBySchoolPostgres(schoolId)).map((entry) => ({
          ...entry,
          fullName: entry.learnerName,
        })),
      });
    }
    return NextResponse.json({
      roster: (await listSchoolLearnersBySchool(schoolId)).map((entry) => ({
        ...entry,
        fullName: entry.learnerName,
      })),
    });
  }

  if (isPostgresConfigured()) {
    return NextResponse.json({
      roster: await listSchoolContactsBySchoolPostgres(schoolId, { category: "all" }),
    });
  }

  return NextResponse.json({
    roster: listSchoolContactsBySchool(schoolId, { category: "all" }),
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const type = body?.type;

    if (type === "learner") {
      const data = addLearnerSchema.parse(body);
      const entry = isPostgresConfigured()
        ? await createSchoolLearnerInSchoolPostgres({
            schoolId: data.schoolId,
            learnerName: data.fullName,
            gender: data.gender,
            age: data.age,
            classGrade: data.classGrade,
            internalChildId: data.internalChildId,
          })
        : await addSchoolLearnerToSchool({
            schoolId: data.schoolId,
            learnerName: data.fullName,
            gender: data.gender,
            age: data.age,
            classGrade: data.classGrade,
            internalChildId: data.internalChildId,
          });
      return NextResponse.json({
        ok: true,
        entry: {
          ...entry,
          fullName: entry.learnerName,
        },
      });
    }

    const data = addContactSchema.parse(body);
    const category =
      data.type === "teacher"
        ? "Teacher"
        : data.category ?? "Teacher";
    const roleTitle =
      data.roleTitle?.trim() ||
      (data.type === "teacher"
        ? data.isReadingTeacher === false
          ? "Teacher"
          : "Reading Teacher"
        : undefined);
    const entry = isPostgresConfigured()
      ? await createSchoolContactInSchoolPostgres({
          schoolId: data.schoolId,
          fullName: data.fullName,
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          whatsapp: data.whatsapp,
          category,
          roleTitle,
          isPrimaryContact: data.isPrimaryContact,
          contactRecordType: data.contactRecordType,
          nickname: data.nickname,
          leadershipRole:
            data.leadershipRole ??
            (category !== "Teacher" && category !== "Administrator" ? true : false),
          subRole: data.subRole,
          roleFormula: data.roleFormula,
          lastSsaSent: data.lastSsaSent,
          trainer: data.trainer,
          notes: data.notes,
          classTaught: data.classTaught,
          subjectTaught: data.subjectTaught,
        })
      : await addSchoolContactToSchool({
          schoolId: data.schoolId,
          fullName: data.fullName,
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          whatsapp: data.whatsapp,
          category,
          roleTitle,
          isPrimaryContact: data.isPrimaryContact,
          contactRecordType: data.contactRecordType,
          nickname: data.nickname,
          leadershipRole:
            data.leadershipRole ??
            (category !== "Teacher" && category !== "Administrator" ? true : false),
          subRole: data.subRole,
          roleFormula: data.roleFormula,
          lastSsaSent: data.lastSsaSent,
          trainer: data.trainer,
          notes: data.notes,
          classTaught: data.classTaught,
          subjectTaught: data.subjectTaught,
        });
    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid payload." },
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

  try {
    const body = await request.json();
    const type = body?.type;

    if (type === "learner") {
      const data = updateLearnerSchema.parse(body);
      const existing = isPostgresConfigured()
        ? await getSchoolLearnerByUidPostgres(data.uid)
        : await getSchoolLearnerByUid(data.uid);
      if (!existing) {
        return NextResponse.json({ error: "Learner not found." }, { status: 404 });
      }
      const entry = isPostgresConfigured()
        ? await updateSchoolLearnerInSchoolPostgres(existing.learnerId, {
            learnerName: data.fullName,
            gender: data.gender,
            age: data.age,
            classGrade: data.classGrade,
            internalChildId: data.internalChildId ?? undefined,
          })
        : await updateSchoolLearnerInSchool(existing.learnerId, {
            learnerName: data.fullName,
            gender: data.gender,
            age: data.age,
            classGrade: data.classGrade,
            internalChildId: data.internalChildId ?? undefined,
          });
      return NextResponse.json({
        ok: true,
        entry: {
          ...entry,
          fullName: entry.learnerName,
        },
      });
    }

    const data = updateContactSchema.parse(body);
    const existing = isPostgresConfigured()
      ? await getSchoolContactByUidPostgres(data.uid)
      : await getSchoolContactByUid(data.uid);
    if (!existing) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }

    const category = data.type === "teacher" ? "Teacher" : data.category;
    const roleTitle =
      data.roleTitle !== undefined
        ? data.roleTitle ?? undefined
        : data.type === "teacher"
          ? data.isReadingTeacher === false
            ? "Teacher"
            : "Reading Teacher"
          : undefined;
    const entry = isPostgresConfigured()
      ? await updateSchoolContactInSchoolPostgres(existing.contactId, {
          fullName: data.fullName,
          gender: data.gender,
          phone: data.phone ?? undefined,
          email: data.email ?? undefined,
          whatsapp: data.whatsapp ?? undefined,
          category,
          roleTitle,
          isPrimaryContact: data.isPrimaryContact,
          contactRecordType: data.contactRecordType ?? undefined,
          nickname: data.nickname ?? undefined,
          leadershipRole: data.leadershipRole,
          subRole: data.subRole ?? undefined,
          roleFormula: data.roleFormula ?? undefined,
          lastSsaSent: data.lastSsaSent ?? undefined,
          trainer: data.trainer,
          notes: data.notes ?? undefined,
          classTaught: data.classTaught ?? undefined,
          subjectTaught: data.subjectTaught ?? undefined,
        })
      : await updateSchoolContactInSchool(existing.contactId, {
          fullName: data.fullName,
          gender: data.gender,
          phone: data.phone ?? undefined,
          email: data.email ?? undefined,
          whatsapp: data.whatsapp ?? undefined,
          category,
          roleTitle,
          isPrimaryContact: data.isPrimaryContact,
          contactRecordType: data.contactRecordType ?? undefined,
          nickname: data.nickname ?? undefined,
          leadershipRole: data.leadershipRole,
          subRole: data.subRole ?? undefined,
          roleFormula: data.roleFormula ?? undefined,
          lastSsaSent: data.lastSsaSent ?? undefined,
          trainer: data.trainer,
          notes: data.notes ?? undefined,
          classTaught: data.classTaught ?? undefined,
          subjectTaught: data.subjectTaught ?? undefined,
        });
    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
