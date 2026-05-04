import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findResearchDatasetBySlug,
  recordLicenseAcceptance,
  recordResearchDownload,
} from "@/lib/server/postgres/repositories/research-datasets";
import { buildDataset, type DatasetSlug } from "@/lib/server/research/dataset-builder";
import { auditLog } from "@/lib/server/audit/log";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2).max(160),
  organization: z.string().trim().max(200).optional(),
  intendedUse: z.string().trim().min(10).max(800),
});

const SUPPORTED: ReadonlySet<DatasetSlug> = new Set([
  "assessments-anonymised",
  "coaching-visits-anonymised",
  "school-roster-anonymised",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const dataset = await findResearchDatasetBySlug(slug);
  if (!dataset || !dataset.isActive) {
    return NextResponse.json({ error: "Dataset not available." }, { status: 404 });
  }
  if (!SUPPORTED.has(slug as DatasetSlug)) {
    return NextResponse.json(
      { error: "Dataset slug recognised but no builder is registered for it." },
      { status: 501 },
    );
  }

  try {
    const parsed = schema.parse(await request.json());
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = request.headers.get("user-agent") ?? null;

    const licenseId = await recordLicenseAcceptance({
      email: parsed.email,
      fullName: parsed.fullName,
      organization: parsed.organization,
      intendedUse: parsed.intendedUse,
      signedText: dataset.licenseHtml,
      ipAddress,
    });

    const built = await buildDataset(slug as DatasetSlug);
    const buffer = Buffer.from(built.csv, "utf-8");

    await recordResearchDownload({
      datasetId: dataset.id,
      licenseAcceptanceId: licenseId || null,
      email: parsed.email,
      organization: parsed.organization ?? null,
      ipAddress,
      userAgent,
      bytesServed: buffer.byteLength,
    });

    await auditLog({
      actor: { id: 0, name: `${parsed.fullName} (researcher)` },
      action: "download",
      targetTable: "research_datasets",
      targetId: dataset.id,
      after: {
        slug: dataset.slug,
        rowCount: built.rowCount,
        bytes: buffer.byteLength,
        organization: parsed.organization ?? null,
      },
      detail: `Researcher ${parsed.email} downloaded ${dataset.slug} (${built.rowCount} rows)`,
      request,
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${built.fileName}"`,
        "X-Filename": built.fileName,
        "X-Row-Count": String(built.rowCount),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid agreement payload." },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
