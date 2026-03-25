import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/auth";
import { commitSchoolsImport } from "@/lib/server/imports/schools";
import { RouteError, jsonSuccess, withRouteHandler } from "@/lib/server/http/route-utils";

export const runtime = "nodejs";

const commitSchema = z.object({
  importJobId: z.coerce.number().int().positive(),
  forceImport: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  return withRouteHandler({
    route: "/api/import/schools/commit",
    method: "POST",
    userId: user?.id ?? null,
    handler: async ({ requestId }) => {
      if (!user) {
        throw new RouteError(401, "Unauthorized", { code: "UNAUTHORIZED" });
      }
      const payload = commitSchema.parse(await request.json());
      const result = await commitSchoolsImport({
        actor: user,
        importJobId: payload.importJobId,
        forceImport: payload.forceImport,
      });
      return jsonSuccess(result, requestId);
    },
  });
}
