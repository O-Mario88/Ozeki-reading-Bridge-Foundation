import fs from "node:fs/promises";
import path from "node:path";

export type GalleryUploadRecord = {
  id: string;
  imageUrl: string;
  description: string;
  altText: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  createdByUserId: number;
  createdByName: string;
};

export type PublicGalleryPhoto = {
  id: string;
  imageUrl: string;
  description: string;
  altText: string;
  createdAt: string;
  source: "upload";
};

const galleryDir = path.join(process.cwd(), "data", "gallery");
const galleryFile = path.join(galleryDir, "uploads.json");

function toIsoOrNow(value: string | null | undefined) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function normalizeShortText(value: string | null | undefined, fallback = "") {
  const trimmed = (value ?? "").trim();
  return trimmed || fallback;
}

function compareByNewest(a: { createdAt: string }, b: { createdAt: string }) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

async function ensureStore() {
  await fs.mkdir(galleryDir, { recursive: true });
  try {
    await fs.access(galleryFile);
  } catch {
    await fs.writeFile(galleryFile, "[]", "utf8");
  }
}

async function readStore(): Promise<GalleryUploadRecord[]> {
  await ensureStore();
  try {
    const raw = await fs.readFile(galleryFile, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const row = entry as Partial<GalleryUploadRecord>;
        if (!row.id || !row.imageUrl) {
          return null;
        }
        const description = normalizeShortText(row.description);
        if (!description) {
          return null;
        }
        const createdAt = toIsoOrNow(row.createdAt);
        return {
          id: String(row.id),
          imageUrl: String(row.imageUrl),
          description,
          altText: normalizeShortText(row.altText, description).slice(0, 220),
          fileName: normalizeShortText(row.fileName, "upload"),
          sizeBytes: Number(row.sizeBytes ?? 0) || 0,
          mimeType: normalizeShortText(row.mimeType, "image/jpeg"),
          createdAt,
          createdByUserId: Number(row.createdByUserId ?? 0) || 0,
          createdByName: normalizeShortText(row.createdByName, "Portal Staff"),
        } satisfies GalleryUploadRecord;
      })
      .filter((entry): entry is GalleryUploadRecord => entry !== null)
      .sort(compareByNewest);
  } catch {
    return [];
  }
}

async function writeStore(records: GalleryUploadRecord[]) {
  await ensureStore();
  const normalized = records
    .slice()
    .sort(compareByNewest)
    .map((row) => ({
      ...row,
      createdAt: toIsoOrNow(row.createdAt),
    }));
  await fs.writeFile(galleryFile, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
}

export async function listGalleryUploads(limit = 400): Promise<GalleryUploadRecord[]> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 1000));
  const records = await readStore();
  return records.slice(0, safeLimit);
}

export async function addGalleryUpload(record: GalleryUploadRecord): Promise<GalleryUploadRecord> {
  const current = await readStore();
  const next: GalleryUploadRecord = {
    ...record,
    createdAt: toIsoOrNow(record.createdAt),
    description: normalizeShortText(record.description).slice(0, 280),
    altText: normalizeShortText(record.altText, record.description).slice(0, 220),
    fileName: normalizeShortText(record.fileName, "upload"),
    mimeType: normalizeShortText(record.mimeType, "image/jpeg"),
    createdByName: normalizeShortText(record.createdByName, "Portal Staff"),
  };
  await writeStore([next, ...current]);
  return next;
}

export async function listPublicGalleryPhotos(limit = 120): Promise<PublicGalleryPhoto[]> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 400));
  const uploads = await listGalleryUploads(safeLimit);
  return uploads
    .map((row) => ({
      id: row.id,
      imageUrl: row.imageUrl,
      description: row.description,
      altText: row.altText || row.description,
      createdAt: row.createdAt,
      source: "upload",
    } satisfies PublicGalleryPhoto))
    .sort(compareByNewest)
    .slice(0, safeLimit);
}
