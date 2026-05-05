"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, MapPin, Trash2, X } from "lucide-react";

export type StagedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
};

export type CapturedGeolocation = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  capturedAt: string;
};

export type PhotoEvidenceCaptureHandle = {
  getStaged: () => StagedPhoto[];
  getGeolocation: () => CapturedGeolocation | null;
  clear: () => void;
};

type Props = {
  helperText?: string;
  maxPhotos?: number;
};

const DEFAULT_MAX = 12;

export const PhotoEvidenceCapture = forwardRef<PhotoEvidenceCaptureHandle, Props>(
  function PhotoEvidenceCapture({ helperText, maxPhotos = DEFAULT_MAX }, ref) {
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const libraryInputRef = useRef<HTMLInputElement>(null);
    const [staged, setStaged] = useState<StagedPhoto[]>([]);
    const [geo, setGeo] = useState<CapturedGeolocation | null>(null);
    const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "ok" | "denied" | "unsupported">("idle");

    useImperativeHandle(ref, () => ({
      getStaged: () => staged,
      getGeolocation: () => geo,
      clear: () => {
        setStaged((prev) => {
          prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
          return [];
        });
      },
    }), [staged, geo]);

    const stagedRef = useRef<StagedPhoto[]>([]);
    useEffect(() => { stagedRef.current = staged; }, [staged]);
    useEffect(() => {
      // Cleanup any object URLs we created during the component's lifetime.
      // Reads from the ref so the effect's [] deps are genuinely empty.
      return () => {
        stagedRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      };
    }, []);

    const requestGeolocation = () => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setGeoStatus("unsupported");
        return;
      }
      setGeoStatus("requesting");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeo({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: pos.coords.accuracy ?? null,
            capturedAt: new Date(pos.timestamp).toISOString(),
          });
          setGeoStatus("ok");
        },
        () => setGeoStatus("denied"),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    };

    const handleFiles = (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      if (geoStatus === "idle") requestGeolocation();
      setStaged((prev) => {
        const remainingSlots = Math.max(0, maxPhotos - prev.length);
        const accepted = Array.from(fileList)
          .filter((f) => f.type.toLowerCase().startsWith("image/"))
          .slice(0, remainingSlots);
        const next: StagedPhoto[] = accepted.map((file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          caption: "",
        }));
        return [...prev, ...next];
      });
    };

    const removeStaged = (id: string) => {
      setStaged((prev) => {
        const target = prev.find((p) => p.id === id);
        if (target) URL.revokeObjectURL(target.previewUrl);
        return prev.filter((p) => p.id !== id);
      });
    };

    const updateCaption = (id: string, caption: string) => {
      setStaged((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));
    };

    const geoLabel =
      geoStatus === "requesting" ? "Getting location…" :
      geoStatus === "ok" && geo ? `GPS captured · ±${Math.round(geo.accuracyM ?? 0)}m` :
      geoStatus === "denied" ? "GPS denied — relying on photo EXIF only" :
      geoStatus === "unsupported" ? "GPS unavailable on this device" :
      "Tap a button to add photos";

    return (
      <div className="rounded-2xl bg-white border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Photo Evidence</h2>
          <span className="text-xs text-gray-500">{staged.length}/{maxPhotos}</span>
        </div>
        {helperText ? (
          <p className="text-xs text-gray-500 mb-3">{helperText}</p>
        ) : null}

        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={staged.length >= maxPhotos}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#066a67] text-white text-sm font-semibold hover:bg-[#066a67]/90 disabled:bg-gray-300"
          >
            <Camera className="w-4 h-4" />
            Take photo
          </button>
          <button
            type="button"
            onClick={() => libraryInputRef.current?.click()}
            disabled={staged.length >= maxPhotos}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <ImagePlus className="w-4 h-4" />
            Choose from library
          </button>
        </div>

        <div className={`flex items-center gap-1.5 text-xs mb-4 ${geoStatus === "ok" ? "text-[#066a67]" : "text-gray-500"}`}>
          <MapPin className="w-3.5 h-3.5" />
          <span>{geoLabel}</span>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
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
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {staged.length > 0 ? (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {staged.map((p) => (
              <li key={p.id} className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
                <div className="relative aspect-square bg-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.previewUrl} alt={p.file.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeStaged(p.id)}
                    aria-label="Remove photo"
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-2">
                  <input
                    type="text"
                    value={p.caption}
                    onChange={(e) => updateCaption(p.id, e.target.value)}
                    placeholder="Caption (optional)"
                    maxLength={200}
                    className="w-full px-2 py-1 text-xs rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#066a67]/40"
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-500">
            No photos added yet. Take a photo at the school to attach GPS-tagged evidence.
          </div>
        )}
      </div>
    );
  },
);

export type UploadStagedPhotosResult = {
  uploaded: number;
  failed: { fileName: string; error: string }[];
};

export async function uploadStagedPhotos(args: {
  parentType: "coaching_visit" | "training_session" | "training_record";
  parentId: number;
  schoolId?: number | null;
  staged: StagedPhoto[];
  geo: CapturedGeolocation | null;
}): Promise<UploadStagedPhotosResult> {
  const result: UploadStagedPhotosResult = { uploaded: 0, failed: [] };
  for (const photo of args.staged) {
    const form = new FormData();
    form.append("file", photo.file);
    form.append("parentType", args.parentType);
    form.append("parentId", String(args.parentId));
    if (args.schoolId) form.append("schoolId", String(args.schoolId));
    if (args.geo) {
      form.append("lat", String(args.geo.lat));
      form.append("lng", String(args.geo.lng));
      if (args.geo.accuracyM !== null) form.append("accuracyM", String(args.geo.accuracyM));
    }
    if (photo.caption.trim()) form.append("caption", photo.caption.trim());

    try {
      const res = await fetch("/api/portal/evidence/photos", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        result.failed.push({ fileName: photo.file.name, error: data?.error ?? `HTTP ${res.status}` });
        continue;
      }
      result.uploaded += 1;
    } catch (error) {
      result.failed.push({
        fileName: photo.file.name,
        error: error instanceof Error ? error.message : "Network error.",
      });
    }
  }
  return result;
}

export { Loader2, Trash2 };
