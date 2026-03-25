import { getAuthenticatedPortalUser } from "@/lib/auth";
import { validateTrainingParticipantsImport } from "@/lib/server/imports/training-participants";
import { RouteError, jsonSuccess, withRouteHandler } from "@/lib/server/http/route-utils";

export const runtime = "nodejs";

function parseTrainingId(value: FormDataEntryValue | null) {
  if (value === null) {
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new RouteError(400, "trainingId must be a positive integer.", { code: "BAD_REQUEST" });
  }
  return parsed;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  return withRouteHandler({
    route: "/api/import/training-participants/validate",
    method: "POST",
    userId: user?.id ?? null,
    handler: async ({ requestId }) => {
      if (!user) {
        throw new RouteError(401, "Unauthorized", { code: "UNAUTHORIZED" });
      }
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        throw new RouteError(400, "Upload a CSV or Excel file.", { code: "BAD_REQUEST" });
      }
      const trainingRecordId = parseTrainingId(formData.get("trainingId"));
      const preview = await validateTrainingParticipantsImport({
        actor: user,
        file,
        trainingRecordId,
      });
      return jsonSuccess({ preview }, requestId);
    },
  });
}
