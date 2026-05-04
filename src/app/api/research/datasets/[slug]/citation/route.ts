import { NextResponse } from "next/server";
import { findResearchDatasetBySlug } from "@/lib/server/postgres/repositories/research-datasets";
import { buildBibTeX } from "@/lib/server/zenodo";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const dataset = await findResearchDatasetBySlug(slug);
  if (!dataset || !dataset.isActive) {
    return NextResponse.json({ error: "Dataset not available." }, { status: 404 });
  }
  const format = new URL(request.url).searchParams.get("format") ?? "bibtex";

  if (format === "bibtex") {
    const bib = buildBibTeX(dataset);
    return new NextResponse(bib, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${dataset.slug}.bib"`,
      },
    });
  }
  return NextResponse.json({ error: "Unsupported citation format." }, { status: 400 });
}
