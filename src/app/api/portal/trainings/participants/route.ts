import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { createOrUpdateTrainingParticipant } from "@/lib/server/services/training/participant-service";
import { assertImportRole } from "@/lib/server/imports/utils";
import { RouteError, jsonSuccess, withRouteHandler } from "@/lib/server/http/route-utils";

export const runtime = "nodejs";

const participantSchema = z
  .object({
    trainingRecordId: z.coerce.number().int().positive().optional(),
    trainingCode: z.string().trim().optional(),
    participantExternalId: z.string().trim().optional(),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    sex: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().optional(),
    role: z.string().trim().min(1),
    jobTitle: z.string().trim().optional(),
    schoolId: z.coerce.number().int().positive().optional(),
    schoolExternalId: z.string().trim().optional(),
    schoolName: z.string().trim().optional(),
    country: z.string().trim().optional(),
    region: z.string().trim().optional(),
    subRegion: z.string().trim().optional(),
    district: z.string().trim().optional(),
    parish: z.string().trim().optional(),
    attendanceStatus: z.string().trim().optional(),
    attendedFrom: z.string().trim().optional(),
    attendedTo: z.string().trim().optional(),
    certificateStatus: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.trainingRecordId && !value.trainingCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "trainingRecordId or trainingCode is required.",
        path: ["trainingRecordId"],
      });
    }
    if (!value.schoolId && !value.schoolExternalId && !value.schoolName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "schoolId, schoolExternalId, or schoolName is required.",
        path: ["schoolId"],
      });
    }
  });

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  return withRouteHandler({
    route: "/api/portal/trainings/participants",
    method: "POST",
    userId: user?.id ?? null,
    handler: async ({ requestId }) => {
      if (!user) {
        throw new RouteError(401, "Unauthorized", { code: "UNAUTHORIZED" });
      }
      assertImportRole(user, "training_participants");
      const payload = participantSchema.parse(await request.json());
      const result = await createOrUpdateTrainingParticipant({
        actor: user,
        input: {
          trainingRecordId: payload.trainingRecordId,
          trainingCode: payload.trainingCode,
          participantExternalId: payload.participantExternalId,
          firstName: payload.firstName,
          lastName: payload.lastName,
          sex: payload.sex,
          phone: payload.phone,
          email: payload.email,
          role: payload.role,
          jobTitle: payload.jobTitle,
          schoolId: payload.schoolId,
          schoolExternalId: payload.schoolExternalId,
          schoolName: payload.schoolName,
          country: payload.country,
          region: payload.region,
          subRegion: payload.subRegion,
          district: payload.district,
          parish: payload.parish,
          attendanceStatus: payload.attendanceStatus,
          attendedFrom: payload.attendedFrom,
          attendedTo: payload.attendedTo,
          certificateStatus: payload.certificateStatus,
          notes: payload.notes,
        },
      });
      return jsonSuccess({ participant: result }, requestId);
    },
  });
}
