"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormModal } from "@/components/forms";
import {
  allUgandaDistricts,
  getDistrictsByRegion,
  inferRegionFromDistrict,
  ugandaRegions,
} from "@/lib/uganda-locations";
import type { SchoolDirectoryRecord } from "@/lib/types";
import { SCHOOL_TYPE_OPTIONS, SCHOOL_OWNERSHIP_OPTIONS } from "@/lib/types";

interface Props {
  school: SchoolDirectoryRecord;
}

const ALL_CLASSES = [
  "Baby Class", "Middle Class", "Top Class",
  "P1", "P2", "P3", "P4", "P5", "P6", "P7",
];

export function SchoolEditModalClient({ school }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string } | null>(null);

  const initialRegion =
    school.region || inferRegionFromDistrict(school.district) || ugandaRegions[0]?.region || "";
  const [region, setRegion] = useState(initialRegion);
  const [district, setDistrict] = useState(school.district || "");

  const districtOptions = useMemo(
    () => (region ? getDistrictsByRegion(region) : allUgandaDistricts),
    [region],
  );

  const initialClasses = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(school.classesJson || "[]");
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }, [school.classesJson]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    const formData = new FormData(event.currentTarget);
    const body = {
      schoolId: school.id,
      name: String(formData.get("name") ?? "").trim(),
      country: String(formData.get("country") ?? "Uganda").trim(),
      region: region.trim(),
      district: district.trim(),
      subCounty: String(formData.get("subCounty") ?? "").trim(),
      parish: String(formData.get("parish") ?? "").trim(),
      village: String(formData.get("village") ?? "").trim() || null,
      alternateSchoolNames: String(formData.get("alternateSchoolNames") ?? "").trim() || null,
      schoolExternalId: String(formData.get("schoolExternalId") ?? "").trim() || null,
      schoolStatus: String(formData.get("schoolStatus") ?? "Open").trim(),
      schoolStatusDate: String(formData.get("schoolStatusDate") ?? "").trim() || null,
      currentPartnerType: String(formData.get("currentPartnerType") ?? "NA").trim(),
      schoolType: String(formData.get("schoolType") ?? "").trim() || null,
      ownership: String(formData.get("ownership") ?? "").trim() || null,
      yearFounded: formData.get("yearFounded")
        ? Number(formData.get("yearFounded"))
        : null,
      currentPartnerSchool: formData.get("currentPartnerSchool") === "on",
      schoolActive: formData.get("schoolActive") === "on",
      classesJson: JSON.stringify(Array.from(formData.getAll("classes")).map(String)),
    };

    if (!body.name || body.name.length < 2) {
      setFeedback({ kind: "error", message: "School name is required (minimum 2 characters)." });
      setSaving(false);
      return;
    }
    if (!region || !district) {
      setFeedback({ kind: "error", message: "Region and district are required." });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/portal/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; school?: SchoolDirectoryRecord };
      if (!res.ok || !data.school) {
        throw new Error(data.error ?? "Could not update school profile.");
      }
      setFeedback({ kind: "success", message: `Updated ${data.school.schoolCode}.` });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error during update.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 whitespace-nowrap"
      >
        Edit School
      </button>

      {feedback && !open ? (
        <p
          role="status"
          className={`form-message ${feedback.kind === "error" ? "error" : "success"}`}
        >
          {feedback.message}
        </p>
      ) : null}

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit School Profile"
        description={`${school.name}${school.schoolCode ? ` (${school.schoolCode})` : ""}`}
        closeLabel="Close"
        maxWidth="1080px"
      >
        <form
          className="form-grid portal-form-grid portal-form-grid-side"
          onSubmit={handleSubmit}
        >
          <label>
            <span className="portal-field-label">School Name</span>
            <input name="name" defaultValue={school.name} required minLength={2} />
          </label>
          <label>
            <span className="portal-field-label">Country</span>
            <input name="country" defaultValue={school.country || "Uganda"} required />
          </label>
          <label>
            <span className="portal-field-label">EMIS Number (optional)</span>
            <input
              name="schoolExternalId"
              defaultValue={school.schoolExternalId ?? ""}
              placeholder="Leave blank if unknown"
            />
          </label>
          <label>
            <span className="portal-field-label">School Status</span>
            <select name="schoolStatus" defaultValue={school.schoolStatus}>
              <option value="Open">Open</option>
              <option value="Paused">Paused</option>
              <option value="Closed">Closed</option>
            </select>
          </label>
          <label>
            <span className="portal-field-label">Status Date</span>
            <input
              name="schoolStatusDate"
              type="date"
              defaultValue={school.schoolStatusDate?.slice(0, 10) ?? ""}
            />
          </label>
          <label>
            <span className="portal-field-label">Current Partner Type</span>
            <select name="currentPartnerType" defaultValue={school.currentPartnerType}>
              <option value="NA">NA</option>
              <option value="Client">Client</option>
              <option value="Partner">Partner</option>
              <option value="Sponsor District">Sponsor District</option>
            </select>
          </label>
          <label>
            <span className="portal-field-label">School Type</span>
            <select name="schoolType" defaultValue={school.schoolType ?? ""}>
              <option value="">Select…</option>
              {SCHOOL_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">Ownership</span>
            <select name="ownership" defaultValue={school.ownership ?? ""}>
              <option value="">Select…</option>
              {SCHOOL_OWNERSHIP_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">Year Founded</span>
            <input
              name="yearFounded"
              type="number"
              min={0}
              defaultValue={school.yearFounded ?? ""}
            />
          </label>
          <label>
            <span className="portal-field-label">Region</span>
            <select
              value={region}
              onChange={(event) => {
                const next = event.target.value;
                setRegion(next);
                const opts = next ? getDistrictsByRegion(next) : allUgandaDistricts;
                setDistrict((current) => (opts.includes(current) ? current : ""));
              }}
              required
            >
              {ugandaRegions.map((entry) => (
                <option key={entry.region} value={entry.region}>{entry.region}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">District</span>
            <select
              name="district"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              required
            >
              <option value="" disabled>Select a district</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">Sub-county</span>
            <input name="subCounty" defaultValue={school.subCounty} required minLength={2} />
          </label>
          <label>
            <span className="portal-field-label">Parish</span>
            <input name="parish" defaultValue={school.parish} required minLength={2} />
          </label>
          <label>
            <span className="portal-field-label">Village (optional)</span>
            <input name="village" defaultValue={school.village ?? ""} />
          </label>
          <label>
            <span className="portal-field-label">Alternate School Names</span>
            <input
              name="alternateSchoolNames"
              defaultValue={school.alternateSchoolNames ?? ""}
            />
          </label>
          <label className="portal-inline-check">
            <input
              name="currentPartnerSchool"
              type="checkbox"
              defaultChecked={school.currentPartnerSchool}
            />
            <span>Current partner school</span>
          </label>
          <label className="portal-inline-check">
            <input
              name="schoolActive"
              type="checkbox"
              defaultChecked={school.schoolActive}
            />
            <span>School is active</span>
          </label>

          <fieldset className="portal-fieldset full-width">
            <legend>Classes Offered</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5 portal-multiselect">
              {ALL_CLASSES.map((cls) => (
                <label key={cls}>
                  <input
                    type="checkbox"
                    name="classes"
                    value={cls}
                    defaultChecked={initialClasses.includes(cls)}
                  />
                  <span>{cls}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="full-width action-row portal-form-actions">
            <button className="button button-positive" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save profile changes"}
            </button>
            <button
              className="button button-ghost"
              type="button"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>

          {feedback ? (
            <p
              role="status"
              className={`full-width form-message ${feedback.kind === "error" ? "error" : "success"}`}
            >
              {feedback.message}
            </p>
          ) : null}
        </form>
      </FormModal>
    </>
  );
}
