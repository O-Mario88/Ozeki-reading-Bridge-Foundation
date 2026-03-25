import { getAuthenticatedPortalUser } from "@/lib/auth";
import { RouteError, jsonSuccess, withRouteHandler } from "@/lib/server/http/route-utils";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthenticatedPortalUser();
  return withRouteHandler({
    route: "/api/portal/contacts/training-sessions",
    method: "GET",
    userId: user?.id ?? null,
    handler: async ({ requestId }) => {
      if (!user) {
        throw new RouteError(401, "Unauthorized", { code: "UNAUTHORIZED" });
      }

      const result = await queryPostgres<{
        id: number;
        recordCode: string;
        trainingName: string;
        date: string | null;
        location: string | null;
      }>(
        `
          SELECT
            pr.id,
            pr.record_code AS "recordCode",
            COALESCE(NULLIF(pr.payload_json::jsonb->>'trainingName', ''), pr.record_code) AS "trainingName",
            pr.date::text AS date,
            COALESCE(pr.school_name, pr.district) AS location
          FROM portal_records pr
          WHERE pr.module = 'training'
            AND pr.deleted_at IS NULL
          ORDER BY pr.date DESC, pr.id DESC
          LIMIT 10
        `,
      );

      return jsonSuccess({ sessions: result.rows }, requestId);
    },
  });
}
