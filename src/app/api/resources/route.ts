import { NextResponse } from "next/server";
import { resources } from "@/lib/content";
import { listPublishedPortalResources } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const portalResources = listPublishedPortalResources(250, {
    sections: ["Resources Library"],
  }).map((entry) => ({
    slug: entry.slug,
    title: entry.title,
    description: entry.description,
    grade: entry.grade,
    skill: entry.skill,
    type: entry.type,
    section: entry.section,
    filePath: entry.externalUrl || `/api/resources/${entry.id}/download`,
    downloadLabel: entry.downloadLabel || undefined,
  }));

  const merged = [...portalResources, ...resources];
  return NextResponse.json({ resources: merged });
}
