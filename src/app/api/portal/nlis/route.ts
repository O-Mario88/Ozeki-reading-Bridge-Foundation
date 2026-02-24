import { NextResponse } from "next/server";
import {
    logAuditEvent,
    saveCostEntry,
    saveObservationRubric,
    saveInterventionGroup,
    saveMaterialDistribution,
    saveConsentRecord,
} from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { RubricIndicator } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const user = await getAuthenticatedPortalUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { formType, ...data } = body;

    try {
        let result: unknown;

        switch (formType) {
            case "cost": {
                result = saveCostEntry(
                    {
                        scopeType: data.scopeType ?? "country",
                        scopeValue: data.scopeValue ?? "Uganda",
                        period: data.period,
                        category: data.category,
                        amount: Number(data.amount),
                        notes: data.notes,
                    },
                    user.id,
                );
                logAuditEvent(user.id, user.fullName, "create", "cost_entries", null, `Category: ${data.category}, Amount: ${data.amount}`);
                break;
            }

            case "rubric": {
                const indicators: RubricIndicator[] = [];
                const keys = ["lesson_planning", "classroom_mgmt", "phonics", "comprehension", "differentiation"];
                const labels = ["Lesson planning", "Classroom management", "Phonics instruction", "Comprehension strategies", "Differentiation"];
                for (let i = 1; i <= 5; i++) {
                    if (data[`score${i}`]) {
                        indicators.push({ key: keys[i - 1], label: labels[i - 1], score: Number(data[`score${i}`]), maxScore: 5 });
                    }
                }
                result = saveObservationRubric(
                    {
                        schoolId: Number(data.schoolId),
                        teacherUid: data.teacherUid,
                        date: data.date,
                        lessonType: data.lessonType,
                        indicators,
                        strengths: data.strengths,
                        gaps: data.gaps,
                        coachingActions: data.coachingActions,
                    },
                    user.id,
                );
                logAuditEvent(user.id, user.fullName, "create", "observation_rubrics", null, `Teacher: ${data.teacherUid}`);
                break;
            }

            case "intervention": {
                result = saveInterventionGroup(
                    {
                        schoolId: Number(data.schoolId),
                        grade: data.grade,
                        targetSkill: data.targetSkill,
                        learnerUids: [],
                        schedule: data.schedule,
                        startDate: data.startDate,
                        endDate: data.endDate,
                    },
                    user.id,
                );
                logAuditEvent(user.id, user.fullName, "create", "intervention_groups", null, `Grade: ${data.grade}, Skill: ${data.targetSkill}`);
                break;
            }

            case "material": {
                result = saveMaterialDistribution(
                    {
                        schoolId: Number(data.schoolId),
                        date: data.date,
                        materialType: data.materialType,
                        quantity: Number(data.quantity),
                        receiptPath: data.receiptPath,
                        notes: data.notes,
                    },
                    user.id,
                );
                logAuditEvent(user.id, user.fullName, "create", "material_distributions", null, `Type: ${data.materialType}, Qty: ${data.quantity}`);
                break;
            }

            case "consent": {
                result = saveConsentRecord(
                    {
                        schoolId: Number(data.schoolId),
                        consentType: data.consentType,
                        source: data.source,
                        date: data.date,
                        allowedUsage: data.allowedUsage,
                        linkedFiles: data.linkedFiles,
                        expiryDate: data.expiryDate,
                    },
                    user.id,
                );
                logAuditEvent(user.id, user.fullName, "create", "consent_records", null, `Type: ${data.consentType}, Usage: ${data.allowedUsage}`);
                break;
            }

            case "safeguarding": {
                // Safeguarding incidents logged as audit events with high severity
                logAuditEvent(
                    user.id,
                    user.fullName,
                    "safeguarding_incident",
                    "safeguarding",
                    null,
                    JSON.stringify({
                        date: data.date,
                        type: data.incidentType,
                        severity: data.severity,
                        description: data.description,
                        actionTaken: data.actionTaken,
                        referredTo: data.referredTo,
                        followUpDate: data.followUpDate,
                        schoolId: data.schoolId,
                    }),
                );
                result = { status: "recorded", message: "Safeguarding incident securely logged" };
                break;
            }

            default:
                return NextResponse.json({ error: `Unknown form type: ${formType}` }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: result });
    } catch (err) {
        console.error("NLIS form submission error:", err);
        return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
    }
}
