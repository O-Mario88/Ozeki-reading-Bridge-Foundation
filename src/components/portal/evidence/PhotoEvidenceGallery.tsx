"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, MapPin, Plus, ShieldCheck } from "lucide-react";

export type GalleryPhoto = {
  id: number;
  parentType: string;
  parentId: number;
  schoolId: number | null;
  capturedAt: string | null;
  lat: number | null;
  lng: number | null;
  gpsAccuracyM: number | null;
  photoHashSha256: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  widthPx: number | null;
  heightPx: number | null;
  caption: string | null;
  uploadedByUserId: number | null;
  createdAt: string;
  downloadUrl: string;
};

type Props = {
  parentType: "coaching_visit" | "training_session" | "training_record";
  parentId: number;
  schoolId?: number | null;
  allowUpload?: boolean;
  initialPhotos?: GalleryPhoto[];
};

function formatTimestamp(value: string | null): string {
  if (!value) return "Unknown time";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function PhotoEvidenceGallery({
  parentType,
  parentId,
  schoolId,
  allowUpload = false,
  initialPhotos,
}: Props) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPhotos ?? []);
  const [loading, setLoading] = useState<boolean>(initialPhotos === undefined);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL("/api/portal/evidence/photos", window.location.origin);
      url.searchParams.set("parentType", parentType);
      url.searchParams.set("parentId", String(parentId));
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { photos: GalleryPhoto[] };
      setPhotos(data.photos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos.");
    } finally {
      setLoading(false);
    }
  }, [parentType, parentId]);

  useEffect(() => {
    if (initialPhotos === undefined) {
      void refresh();
    }
  }, [initialPhotos, refresh]);

  const requestGeo = (): Promise<GeolocationPosition | null> =>
    new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    });

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const geo = await requestGeo();
      let succeeded = 0;
      const failures: string[] = [];
      for (const file of Array.from(fileList)) {
        if (!file.type.toLowerCase().startsWith("image/")) {
          failures.push(`${file.name}: not an image`);
          continue;
        }
        const form = new FormData();
        form.append("file", file);
        form.append("parentType", parentType);
        form.append("parentId", String(parentId));
        if (schoolId) form.append("schoolId", String(schoolId));
        if (geo) {
          form.append("lat", String(geo.coords.latitude));
          form.append("lng", String(geo.coords.longitude));
          if (geo.coords.accuracy) form.append("accuracyM", String(geo.coords.accuracy));
        }
        const res = await fetch("/api/portal/evidence/photos", { method: "POST", body: form });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          failures.push(`${file.name}: ${data?.error ?? `HTTP ${res.status}`}`);
          continue;
        }
        succeeded += 1;
      }
      if (failures.length > 0) {
        setUploadError(`${succeeded} uploaded, ${failures.length} failed: ${failures.join("; ")}`);
      }
      await refresh();
    } finally {
      setUploading(false);
    }
  };

  const mapHref = (lat: number, lng: number) =>
    `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Photo Evidence</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {photos.length} photo{photos.length === 1 ? "" : "s"} on file
            {photos.some((p) => p.lat !== null) ? " · GPS verified" : ""}
          </p>
        </div>
        {allowUpload ? (
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#066a67] text-white text-xs font-semibold hover:bg-[#066a67]/90 disabled:bg-gray-300"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Add photo
            </button>
            <button
              type="button"
              onClick={() => libraryInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:border-gray-300 disabled:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              From library
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                void uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={libraryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        ) : null}
      </div>

      {uploadError ? (
        <p className="text-xs text-red-600 mb-3">{uploadError}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-600 mb-3">{error}</p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500 py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading photos…
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-500">
          No photo evidence on file yet.
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((p) => (
            <li key={p.id} className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
              <a href={`${p.downloadUrl}?inline=1`} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${p.downloadUrl}?inline=1`}
                  alt={p.caption ?? p.fileName}
                  className="w-full aspect-square object-cover bg-black/5"
                  loading="lazy"
                />
              </a>
              <div className="p-2.5 space-y-1">
                {p.caption ? (
                  <p className="text-xs text-gray-800 line-clamp-2">{p.caption}</p>
                ) : null}
                <p className="text-[10px] text-gray-500">{formatTimestamp(p.capturedAt ?? p.createdAt)}</p>
                <div className="flex items-center justify-between">
                  {p.lat !== null && p.lng !== null ? (
                    <a
                      href={mapHref(p.lat, p.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-[#066a67] hover:underline"
                    >
                      <MapPin className="w-3 h-3" /> Map
                    </a>
                  ) : (
                    <span className="text-[10px] text-gray-400">No GPS</span>
                  )}
                  <span className="text-[10px] text-gray-400">{formatBytes(p.sizeBytes)}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-400" title={`SHA-256: ${p.photoHashSha256}`}>
                  <ShieldCheck className="w-3 h-3" />
                  <span className="truncate">{p.photoHashSha256.slice(0, 12)}…</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
