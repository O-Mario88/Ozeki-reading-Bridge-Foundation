import { getAuthenticatedPortalUser } from "@/lib/auth";
import { validateSchoolsImport } from "@/lib/server/imports/schools";
import { RouteError, jsonSuccess, withRouteHandler } from "@/lib/server/http/route-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  return withRouteHandler({
    route: "/api/import/schools/validate",
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
      const preview = await validateSchoolsImport({ actor: user, file });
      return jsonSuccess({ preview }, requestId);
    },
  });
}
