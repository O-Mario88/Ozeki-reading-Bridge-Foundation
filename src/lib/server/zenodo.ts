import { queryPostgres } from "@/lib/server/postgres/client";
import { logger } from "@/lib/logger";
import type { ResearchDatasetRow } from "@/lib/server/postgres/repositories/research-datasets";

/**
 * Zenodo deposit adapter. Talks to the Zenodo REST API when ZENODO_TOKEN
 * is set; otherwise records a "pending" deposit row that an operator can
 * push manually. The local zenodo_deposits row is the system of record
 * either way — DOI + record ID get written back on success.
 *
 * Auto-push is intended to run from a yearly cron once dataset versions
 * are stable.
 */

type ZenodoMetadata = {
  title: string;
  description: string;
  upload_type: "dataset";
  publication_date: string;
  creators: { name: string; affiliation: string }[];
  license: string;
  related_identifiers?: { identifier: string; relation: string }[];
};

type ZenodoDeposit = {
  id: string;
  doi: string;
  links?: { html?: string };
};

export type DepositResult = {
  status: "created" | "pending";
  recordId: string | null;
  doi: string | null;
  htmlUrl: string | null;
  message: string;
};

function buildMetadata(dataset: ResearchDatasetRow): ZenodoMetadata {
  return {
    title: `Ozeki Reading Bridge Foundation — ${dataset.title} (${dataset.version})`,
    description: dataset.description,
    upload_type: "dataset",
    publication_date: new Date().toISOString().slice(0, 10),
    creators: [
      { name: "Ozeki Reading Bridge Foundation", affiliation: "Uganda" },
    ],
    license: dataset.licenseHtml.includes("CC-BY-NC") ? "cc-by-nc-4.0" : "cc-by-4.0",
  };
}

export async function pushDatasetToZenodo(
  dataset: ResearchDatasetRow,
  csvBytes: Buffer,
): Promise<DepositResult> {
  const token = process.env.ZENODO_TOKEN?.trim();
  const apiBase = process.env.ZENODO_API_BASE?.trim() || "https://zenodo.org/api";

  const metadata = buildMetadata(dataset);

  if (!token) {
    await queryPostgres(
      `INSERT INTO zenodo_deposits (dataset_id, title, status, request_payload)
       VALUES ($1, $2, 'pending', $3)`,
      [dataset.id, metadata.title, JSON.stringify({ metadata })],
    );
    logger.info("[zenodo] no token configured — deposit queued as pending", {
      datasetSlug: dataset.slug,
      bytes: csvBytes.byteLength,
    });
    return {
      status: "pending",
      recordId: null,
      doi: null,
      htmlUrl: null,
      message: "ZENODO_TOKEN not configured. Deposit row written to zenodo_deposits as 'pending'; an operator can push manually.",
    };
  }

  try {
    const created = await fetch(`${apiBase}/deposit/depositions?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata }),
    });
    if (!created.ok) throw new Error(`Zenodo deposit create failed: HTTP ${created.status}`);
    const deposit = (await created.json()) as ZenodoDeposit;

    const form = new FormData();
    form.append("name", `${dataset.slug}.csv`);
    form.append("file", new Blob([new Uint8Array(csvBytes)]), `${dataset.slug}.csv`);
    const upload = await fetch(`${apiBase}/deposit/depositions/${deposit.id}/files?access_token=${token}`, {
      method: "POST",
      body: form,
    });
    if (!upload.ok) throw new Error(`Zenodo file upload failed: HTTP ${upload.status}`);

    const publish = await fetch(`${apiBase}/deposit/depositions/${deposit.id}/actions/publish?access_token=${token}`, {
      method: "POST",
    });
    if (!publish.ok) throw new Error(`Zenodo publish failed: HTTP ${publish.status}`);
    const published = (await publish.json()) as ZenodoDeposit;

    await queryPostgres(
      `INSERT INTO zenodo_deposits (dataset_id, zenodo_record_id, doi, title, status, request_payload, response_payload, pushed_at)
       VALUES ($1, $2, $3, $4, 'published', $5, $6, NOW())`,
      [
        dataset.id,
        String(published.id ?? deposit.id),
        published.doi ?? null,
        metadata.title,
        JSON.stringify({ metadata }),
        JSON.stringify(published),
      ],
    );
    if (published.doi) {
      await queryPostgres(
        `UPDATE research_datasets SET doi = $2, zenodo_record_id = $3 WHERE id = $1`,
        [dataset.id, published.doi, String(published.id ?? deposit.id)],
      );
    }

    return {
      status: "created",
      recordId: String(published.id ?? deposit.id),
      doi: published.doi ?? null,
      htmlUrl: published.links?.html ?? null,
      message: "Zenodo deposit published.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    await queryPostgres(
      `INSERT INTO zenodo_deposits (dataset_id, title, status, error_message)
       VALUES ($1, $2, 'failed', $3)`,
      [dataset.id, metadata.title, message],
    );
    return {
      status: "pending",
      recordId: null,
      doi: null,
      htmlUrl: null,
      message,
    };
  }
}

export function buildBibTeX(dataset: ResearchDatasetRow): string {
  const year = new Date().getUTCFullYear();
  const key = `ozeki${year}_${dataset.slug.replace(/-/g, "_")}`;
  const doiLine = dataset.doi ? `  doi          = {${dataset.doi}},\n` : "";
  return `@dataset{${key},
  author       = {Ozeki Reading Bridge Foundation},
  title        = {${dataset.title}},
  year         = {${year}},
  publisher    = {Ozeki Reading Bridge Foundation},
  version      = {${dataset.version}},
${doiLine}  url          = {https://www.ozekiread.org/research/datasets/${dataset.slug}}
}
`;
}
