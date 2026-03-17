import { z } from "zod";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { generateMissingSchoolsTemplate } from "@/lib/server/imports/templates";
import { assertImportRole } from "@/lib/server/imports/utils";
import { RouteError, fileResponse, withRouteHandler } from "@/lib/server/http/route-utils";

export const runtime = "nodejs";

const missingSchoolSchema = z.object({
  school_external_id: z.string().trim().optional().default(""),
  school_name: z.string().trim().default(""),
  country: z.string().trim().optional().default(""),
  region: z.string().trim().optional().default(""),
  sub_region: z.string().trim().optional().default(""),
  district: z.string().trim().optional().default(""),
  parish: z.string().trim().optional().default(""),
  affected_rows: z.array(z.coerce.number().int().positive()).optional().default([]),
});

const requestSchema = z.object({
  format: z.enum(["csv", "xlsx"]),
  missingSchools: z.array(missingSchoolSchema).min(1),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  return withRouteHandler({
    route: "/api/import/training-participants/missing-schools-template",
    method: "POST",
    userId: user?.id ?? null,
    handler: async ({ requestId }) => {
      if (!user) {
        throw new RouteError(401, "Unauthorized", { code: "UNAUTHORIZED" });
      }
      assertImportRole(user, "training_participants");
      const payload = requestSchema.parse(await request.json());
      const body = await generateMissingSchoolsTemplate({
        format: payload.format,
        missingSchools: payload.missingSchools,
      });
      return fileResponse({
        body,
        contentType:
          payload.format === "csv"
            ? "text/csv; charset=utf-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName:
          payload.format === "csv"
            ? "missing-schools-import-template.csv"
            : "missing-schools-import-template.xlsx",
        requestId,
      });
    },
  });
}
