import { NextResponse } from "next/server";
import { z } from "zod";
import {
    listTeachersBySchool,
    addTeacherToSchool,
    updateTeacherInSchool,
    listLearnersBySchool,
    addLearnerToSchool,
    updateLearnerInSchool,
} from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export const runtime = "nodejs";

const addTeacherSchema = z.object({
    schoolId: z.coerce.number().int().positive(),
    type: z.literal("teacher"),
    fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
    gender: z.enum(["Male", "Female"]),
    isReadingTeacher: z.boolean().optional().default(true),
    phone: z.string().trim().optional(),
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

const updateTeacherSchema = z.object({
    uid: z.string().min(1),
    type: z.literal("teacher"),
    fullName: z.string().trim().min(2).optional(),
    gender: z.enum(["Male", "Female"]).optional(),
    isReadingTeacher: z.boolean().optional(),
    phone: z.string().trim().nullable().optional(),
    status: z.string().optional(),
});

const updateLearnerSchema = z.object({
    uid: z.string().min(1),
    type: z.literal("learner"),
    fullName: z.string().trim().min(2).optional(),
    gender: z.enum(["Boy", "Girl", "Other"]).optional(),
    age: z.coerce.number().int().min(3).max(25).optional(),
    classGrade: z.string().trim().min(1).optional(),
});

export async function GET(request: Request) {
    const user = await getAuthenticatedPortalUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = Number(searchParams.get("schoolId"));
    const type = searchParams.get("type") || "teacher";

    if (!schoolId || !Number.isFinite(schoolId)) {
        return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    if (type === "learner") {
        return NextResponse.json({ roster: listLearnersBySchool(schoolId) });
    }

    return NextResponse.json({ roster: listTeachersBySchool(schoolId) });
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
            const entry = addLearnerToSchool({
                schoolId: data.schoolId,
                fullName: data.fullName,
                gender: data.gender,
                age: data.age,
                classGrade: data.classGrade,
                internalChildId: data.internalChildId,
            });
            return NextResponse.json({ ok: true, entry });
        }

        const data = addTeacherSchema.parse(body);
        const entry = addTeacherToSchool({
            schoolId: data.schoolId,
            fullName: data.fullName,
            gender: data.gender,
            isReadingTeacher: data.isReadingTeacher,
            phone: data.phone,
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
            updateLearnerInSchool(data.uid, {
                fullName: data.fullName,
                gender: data.gender,
                age: data.age,
                classGrade: data.classGrade,
            });
            return NextResponse.json({ ok: true });
        }

        const data = updateTeacherSchema.parse(body);
        updateTeacherInSchool(data.uid, {
            fullName: data.fullName,
            gender: data.gender,
            isReadingTeacher: data.isReadingTeacher,
            phone: data.phone,
            status: data.status,
        });
        return NextResponse.json({ ok: true });
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
