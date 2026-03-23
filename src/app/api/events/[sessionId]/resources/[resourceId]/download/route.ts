import { NextResponse } from "next/server";
import { getCurrentPortalUser } from "@/lib/portal-auth";
import { queryPostgres } from "@/lib/server/postgres/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; resourceId: string }> }
) {
  const { sessionId, resourceId } = await params;
  const user = await getCurrentPortalUser();

  if (!user) {
    return NextResponse.redirect(new URL("/portal/login?continue=/events", request.url));
  }

  // 1. Verify user is a registered participant of this exact session
  const check = await queryPostgres(
    `SELECT 1 FROM online_training_participants WHERE session_id = $1 AND teacher_user_id = $2 LIMIT 1`,
    [Number(sessionId), user.id]
  );

  if (check.rows.length === 0) {
    return new NextResponse("Unauthorized. You must explicitly sign up for this training session to access its resources.", { status: 403 });
  }

  // 2. Safely retrieve the specified resource link
  const res = await queryPostgres(
    `
      SELECT external_url, stored_path 
      FROM online_training_resources 
      WHERE id = $1 AND session_id = $2 
      LIMIT 1
    `,
    [Number(resourceId), Number(sessionId)]
  );

  if (res.rows.length === 0) {
    return new NextResponse("Resource not found.", { status: 404 });
  }

  const resource = res.rows[0];

  if (resource.external_url) {
    return NextResponse.redirect(resource.external_url);
  }

  if (resource.stored_path) {
    return NextResponse.redirect(resource.stored_path);
  }

  return new NextResponse("No file associated with this resource.", { status: 404 });
}
