import path from "node:path";
import { NextResponse } from "next/server";
import { createMediaFileResponse, resolveMimeType } from "@/lib/media-response";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { getRuntimeDataDir } from "@/lib/runtime-paths";
import {
  getPortalLeadershipTeamMemberByIdPostgres,
  getPublishedPortalLeadershipTeamMemberByIdPostgres,
} from "@/lib/server/postgres/repositories/public-content";

export const runtime = "nodejs";

function toId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid leadership member id.");
  }
  return id;
}

function ensureSafePath(storedPath: string) {
  const normalizedRoot = path.resolve(getRuntimeDataDir(), "about");
  const normalizedFile = path.resolve(storedPath);
  if (!normalizedFile.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error("Invalid profile photo path.");
  }
  return normalizedFile;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const id = toId(params.id);
    const user = await getAuthenticatedPortalUser();
    const member =
      user && user.role !== "Volunteer"
        ? await getPortalLeadershipTeamMemberByIdPostgres(id)
        : await getPublishedPortalLeadershipTeamMemberByIdPostgres(id);

    if (!member || !member.photoStoredPath) {
      return NextResponse.json({ error: "Profile photo not found." }, { status: 404 });
    }

    const filePath = ensureSafePath(member.photoStoredPath);
    const contentType = resolveMimeType(
      member.photoFileName ?? filePath,
      member.photoMimeType ?? "image/jpeg",
      "image",
    );

    return createMediaFileResponse({
      request,
      filePath,
      contentType,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
