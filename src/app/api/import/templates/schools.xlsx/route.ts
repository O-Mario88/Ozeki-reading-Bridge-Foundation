import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { generateSchoolsTemplate } from "@/lib/server/imports/templates";
import { assertImportRole } from "@/lib/server/imports/utils";
import { RouteError, fileResponse, withRouteHandler } from "@/lib/server/http/route-utils";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthenticatedPortalUser();
  return withRouteHandler({
    route: "/api/import/templates/schools.xlsx",
    method: "GET",
    userId: user?.id ?? null,
    handler: async ({ requestId }) => {
      if (!user) {
        throw new RouteError(401, "Unauthorized", { code: "UNAUTHORIZED" });
      }
      assertImportRole(user, "schools");
      const body = await generateSchoolsTemplate({ format: "xlsx" });
      return fileResponse({
        body,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName: "schools-import-template.xlsx",
        requestId,
      });
    },
  });
}
