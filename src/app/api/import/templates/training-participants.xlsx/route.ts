import { getAuthenticatedPortalUser } from "@/lib/portal-api";
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
    route: "/api/import/templates/training-participants.xlsx",
    method: "GET",
    userId: user?.id ?? null,
    handler: async ({ requestId }) => {
      if (!user) {
        throw new RouteError(401, "Unauthorized", { code: "UNAUTHORIZED" });
      }
      assertImportRole(user, "training_participants");
      const trainingRecordId = parseTrainingId(request.url);
      const body = await generateTrainingParticipantsTemplate({ format: "xlsx", trainingRecordId });
      return fileResponse({
        body,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName: trainingRecordId
          ? `training-participants-import-template-${trainingRecordId}.xlsx`
          : "training-participants-import-template.xlsx",
        requestId,
      });
    },
  });
}
