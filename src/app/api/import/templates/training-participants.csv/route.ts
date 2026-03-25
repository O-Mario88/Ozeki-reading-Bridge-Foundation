import { getAuthenticatedPortalUser } from "@/lib/auth";
import { generateTrainingParticipantsTemplate } from "@/lib/server/imports/templates";
import { assertImportRole } from "@/lib/server/imports/utils";
import { RouteError, fileResponse, withRouteHandler } from "@/lib/server/http/route-utils";

export const runtime = "nodejs";

function parseTrainingId(url: string) {
  const value = new URL(url).searchParams.get("trainingId");
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new RouteError(400, "trainingId must be a positive integer.", { code: "BAD_REQUEST" });
  }
  return parsed;
}

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  return withRouteHandler({
    route: "/api/import/templates/training-participants.csv",
    method: "GET",
    userId: user?.id ?? null,
    handler: async ({ requestId }) => {
      if (!user) {
        throw new RouteError(401, "Unauthorized", { code: "UNAUTHORIZED" });
      }
      assertImportRole(user, "training_participants");
      const trainingRecordId = parseTrainingId(request.url);
      const body = await generateTrainingParticipantsTemplate({ format: "csv", trainingRecordId });
      return fileResponse({
        body,
        contentType: "text/csv; charset=utf-8",
        fileName: trainingRecordId
          ? `training-participants-import-template-${trainingRecordId}.csv`
          : "training-participants-import-template.csv",
        requestId,
      });
    },
  });
}
