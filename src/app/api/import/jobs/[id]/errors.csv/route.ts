import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { getImportJobErrorCsv } from "@/lib/server/imports/jobs";
import { RouteError, fileResponse, withRouteHandler } from "@/lib/server/http/route-utils";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getAuthenticatedPortalUser();
  return withRouteHandler({
    route: "/api/import/jobs/[id]/errors.csv",
    method: "GET",
    userId: user?.id ?? null,
    handler: async ({ requestId }) => {
      if (!user) {
        throw new RouteError(401, "Unauthorized", { code: "UNAUTHORIZED" });
      }
      if (user.role === "Volunteer") {
        throw new RouteError(403, "You do not have permission to download import errors.", { code: "FORBIDDEN" });
      }
      const { id } = await context.params;
      const importJobId = Number(id);
      if (!Number.isInteger(importJobId) || importJobId <= 0) {
        throw new RouteError(400, "Import job id must be a positive integer.", { code: "BAD_REQUEST" });
      }
      const body = await getImportJobErrorCsv(importJobId);
      return fileResponse({
        body,
        contentType: "text/csv; charset=utf-8",
        fileName: `import-job-${importJobId}-errors.csv`,
        requestId,
      });
    },
  });
}
