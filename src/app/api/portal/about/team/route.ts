import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  deletePortalLeadershipTeamMember,
  getPortalLeadershipTeamMemberById,
  savePortalLeadershipTeamMember,
  updatePortalLeadershipTeamMember,
} from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { getRuntimeDataDir } from "@/lib/runtime-paths";

export const runtime = "nodejs";

const MAX_PHOTO_SIZE_BYTES = 20 * 1024 * 1024;
const allowedPhotoExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function canManage(user: Awaited<ReturnType<typeof getAuthenticatedPortalUser>>) {
  return Boolean(user && user.role !== "Volunteer");
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizePhotoExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return allowedPhotoExtensions.has(extension) ? extension : "";
}

async function ensureAboutDir() {
  const aboutDir = path.join(getRuntimeDataDir(), "about");
  await fs.mkdir(aboutDir, { recursive: true });
  return aboutDir;
}

async function removeStoredFile(storedPath: string | null | undefined) {
  if (!storedPath) {
    return;
  }
  try {
    await fs.unlink(storedPath);
  } catch {
    // Best effort.
  }
}

async function savePhotoFile(file: File) {
  if (!file || file.size <= 0) {
    return null;
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error("Profile photo must be 20MB or smaller.");
  }

  const extension = normalizePhotoExtension(file.name);
  if (!extension) {
    throw new Error("Upload a JPG, PNG, WebP, or AVIF profile photo.");
  }

  const aboutDir = await ensureAboutDir();
  const fileName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeName(file.name)}`;
  const storedPath = path.join(aboutDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storedPath, buffer);
  return {
    photoFileName: file.name,
    photoStoredPath: storedPath,
    photoMimeType: file.type || "image/jpeg",
    photoSizeBytes: file.size,
  };
}

function toClientRecord(id: number) {
  const member = getPortalLeadershipTeamMemberById(id);
  if (!member) {
    throw new Error("Leadership team member not found.");
  }
  return {
    ...member,
    photoUrl: member.photoFileName ? `/api/about/team/${member.id}/photo?v=${encodeURIComponent(member.updatedAt)}` : null,
  };
}

export async function POST(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!canManage(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const photo = formData.get("photo");
    const upload =
      photo instanceof File && photo.size > 0 ? await savePhotoFile(photo) : null;

    const member = savePortalLeadershipTeamMember({
      section: String(formData.get("section") ?? "").trim() as "board" | "staff" | "volunteer",
      name: String(formData.get("name") ?? ""),
      role: String(formData.get("role") ?? ""),
      biography: String(formData.get("biography") ?? ""),
      background: String(formData.get("background") ?? ""),
      career: String(formData.get("career") ?? ""),
      photoAlt: String(formData.get("photoAlt") ?? "").trim() || null,
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      isPublished: String(formData.get("isPublished") ?? "1") !== "0",
      userId: user!.id,
      userName: user!.fullName,
      ...upload,
    });

    return NextResponse.json({ member: toClientRecord(member.id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save leadership team member." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!canManage(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const id = Number(formData.get("id") ?? 0);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Leadership team member id is invalid.");
    }

    const existing = getPortalLeadershipTeamMemberById(id);
    if (!existing) {
      throw new Error("Leadership team member not found.");
    }

    const removePhoto = String(formData.get("removePhoto") ?? "0") === "1";
    const photo = formData.get("photo");
    const upload =
      photo instanceof File && photo.size > 0 ? await savePhotoFile(photo) : null;
    if (removePhoto || upload) {
      await removeStoredFile(existing.photoStoredPath);
    }

    const member = updatePortalLeadershipTeamMember({
      id,
      section: String(formData.get("section") ?? existing.section).trim() as "board" | "staff" | "volunteer",
      name: String(formData.get("name") ?? existing.name),
      role: String(formData.get("role") ?? existing.role),
      biography: String(formData.get("biography") ?? existing.biography),
      background: String(formData.get("background") ?? existing.background),
      career: String(formData.get("career") ?? existing.career),
      photoAlt:
        String(formData.get("photoAlt") ?? existing.photoAlt ?? "").trim() || null,
      sortOrder: Number(formData.get("sortOrder") ?? existing.sortOrder),
      isPublished:
        String(formData.get("isPublished") ?? (existing.isPublished ? "1" : "0")) !== "0",
      userId: user!.id,
      userName: user!.fullName,
      photoFileName: removePhoto ? null : upload?.photoFileName ?? existing.photoFileName,
      photoStoredPath: removePhoto ? null : upload?.photoStoredPath ?? existing.photoStoredPath,
      photoMimeType: removePhoto ? null : upload?.photoMimeType ?? existing.photoMimeType,
      photoSizeBytes: removePhoto ? null : upload?.photoSizeBytes ?? existing.photoSizeBytes,
    });

    return NextResponse.json({ member: toClientRecord(member.id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update leadership team member." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!canManage(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { id?: number };
    const id = Number(body.id ?? 0);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Leadership team member id is invalid.");
    }
    const existing = getPortalLeadershipTeamMemberById(id);
    if (!existing) {
      throw new Error("Leadership team member not found.");
    }
    await removeStoredFile(existing.photoStoredPath);
    deletePortalLeadershipTeamMember({
      id,
      userId: user!.id,
      userName: user!.fullName,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete leadership team member." },
      { status: 400 },
    );
  }
}
