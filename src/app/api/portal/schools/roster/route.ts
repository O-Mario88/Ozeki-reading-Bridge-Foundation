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
} from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const contactCategorySchema = z.enum([
  "Proprietor",
  "Head Teacher",
  "Deputy Head Teacher",
  "DOS",
  "Teacher",
]);

const addContactSchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  type: z.enum(["contact", "teacher"]).default("contact"),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
  gender: z.enum(["Male", "Female", "Other"]),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  category: contactCategorySchema.optional(),
  roleTitle: z.string().trim().optional(),
  isPrimaryContact: z.boolean().optional().default(false),
  classTaught: z.string().trim().optional(),
  subjectTaught: z.string().trim().optional(),
  isReadingTeacher: z.boolean().optional(),
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
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  whatsapp: z.string().trim().nullable().optional(),
  category: contactCategorySchema.optional(),
  roleTitle: z.string().trim().nullable().optional(),
  isPrimaryContact: z.boolean().optional(),
  classTaught: z.string().trim().nullable().optional(),
  subjectTaught: z.string().trim().nullable().optional(),
  isReadingTeacher: z.boolean().optional(),
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
    return NextResponse.json({
      roster: listSchoolLearnersBySchool(schoolId).map((entry) => ({
        ...entry,
        fullName: entry.learnerName,
      })),
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
      const entry = addSchoolLearnerToSchool({
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
    const entry = addSchoolContactToSchool({
      schoolId: data.schoolId,
      fullName: data.fullName,
      gender: data.gender,
      phone: data.phone,
      email: data.email,
      whatsapp: data.whatsapp,
      category,
      roleTitle,
      isPrimaryContact: data.isPrimaryContact,
      classTaught: category === "Teacher" ? data.classTaught ?? "Not assigned" : undefined,
      subjectTaught: category === "Teacher" ? data.subjectTaught ?? "Not assigned" : undefined,
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
      const existing = getSchoolLearnerByUid(data.uid);
      if (!existing) {
        return NextResponse.json({ error: "Learner not found." }, { status: 404 });
      }
      const entry = updateSchoolLearnerInSchool(existing.learnerId, {
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
    const existing = getSchoolContactByUid(data.uid);
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
    const entry = updateSchoolContactInSchool(existing.contactId, {
      fullName: data.fullName,
      gender: data.gender,
      phone: data.phone ?? undefined,
      email: data.email ?? undefined,
      whatsapp: data.whatsapp ?? undefined,
      category,
      roleTitle,
      isPrimaryContact: data.isPrimaryContact,
      classTaught: category === "Teacher" ? data.classTaught ?? undefined : undefined,
      subjectTaught: category === "Teacher" ? data.subjectTaught ?? undefined : undefined,
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
