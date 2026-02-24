"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  allUgandaDistricts,
  getDistrictsByRegion,
  inferRegionFromDistrict,
  ugandaRegions,
} from "@/lib/uganda-locations";
import { SchoolDirectoryRecord } from "@/lib/types";

interface PortalSchoolsManagerProps {
  initialSchools: SchoolDirectoryRecord[];
}

type Feedback = {
  kind: "idle" | "success" | "error";
  message: string;
};

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isValidPhone(value: string) {
  if (!value.trim()) {
    return true;
  }
  return /^[+0-9()\s-]{7,20}$/.test(value.trim());
}

function normalizeContactValue(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function toWholeNumber(value: string) {
  const parsed = value.trim() ? Number(value.trim()) : 0;
  if (!Number.isInteger(parsed) || parsed < 0) {
    return Number.NaN;
  }
  return parsed;
}

function toGpsInputValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function setFormInputValue(form: HTMLFormElement | null, name: string, value: string) {
  if (!form) {
    return;
  }
  const input = form.elements.namedItem(name) as HTMLInputElement | null;
  if (input) {
    input.value = value;
  }
}

async function getBrowserCoordinates() {
  if (typeof window === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not available on this device.");
  }

  return new Promise<{ lat: string; lng: string }>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        });
      },
      (error) => {
        reject(new Error(error.message || "Could not detect current location."));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}

export function PortalSchoolsManager({ initialSchools }: PortalSchoolsManagerProps) {
  const [schools, setSchools] = useState(initialSchools);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(
    initialSchools[0]?.id ?? null,
  );

  const [createRegion, setCreateRegion] = useState(ugandaRegions[0]?.region ?? "");
  const [createDistrict, setCreateDistrict] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [queryFilter, setQueryFilter] = useState("");

  const [savingSchool, setSavingSchool] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [createContactName, setCreateContactName] = useState("");
  const [createContactPhone, setCreateContactPhone] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");

  const [createFeedback, setCreateFeedback] = useState<Feedback>({
    kind: "idle",
    message: "",
  });
  const [directoryFeedback, setDirectoryFeedback] = useState<Feedback>({
    kind: "idle",
    message: "",
  });
  const [profileFeedback, setProfileFeedback] = useState<Feedback>({
    kind: "idle",
    message: "",
  });

  const createFormRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  const createDistrictOptions = createRegion
    ? getDistrictsByRegion(createRegion)
    : allUgandaDistricts;
  const filterDistrictOptions = filterRegion
    ? getDistrictsByRegion(filterRegion)
    : allUgandaDistricts;

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === selectedSchoolId) ?? null,
    [schools, selectedSchoolId],
  );
  const knownSchools = useMemo(() => {
    const byId = new Map<number, SchoolDirectoryRecord>();
    [...initialSchools, ...schools].forEach((school) => {
      byId.set(school.id, school);
    });
    return Array.from(byId.values());
  }, [initialSchools, schools]);
  const createDuplicateContactMatches = useMemo(() => {
    const normalizedName = normalizeContactValue(createContactName);
    const normalizedPhone = normalizeContactValue(createContactPhone);
    if (!normalizedName && !normalizedPhone) {
      return [];
    }

    return knownSchools.filter((school) => {
      const nameMatch =
        normalizedName && normalizeContactValue(school.contactName) === normalizedName;
      const phoneMatch =
        normalizedPhone && normalizeContactValue(school.contactPhone) === normalizedPhone;
      return Boolean(nameMatch || phoneMatch);
    });
  }, [createContactName, createContactPhone, knownSchools]);
  const editDuplicateContactMatches = useMemo(() => {
    if (!selectedSchool) {
      return [];
    }
    const normalizedName = normalizeContactValue(editContactName);
    const normalizedPhone = normalizeContactValue(editContactPhone);
    if (!normalizedName && !normalizedPhone) {
      return [];
    }

    return knownSchools.filter((school) => {
      if (school.id === selectedSchool.id) {
        return false;
      }
      const nameMatch =
        normalizedName && normalizeContactValue(school.contactName) === normalizedName;
      const phoneMatch =
        normalizedPhone && normalizeContactValue(school.contactPhone) === normalizedPhone;
      return Boolean(nameMatch || phoneMatch);
    });
  }, [editContactName, editContactPhone, knownSchools, selectedSchool]);

  const [editRegion, setEditRegion] = useState(
    inferRegionFromDistrict(selectedSchool?.district ?? "") ?? ugandaRegions[0]?.region ?? "",
  );
  const [editDistrict, setEditDistrict] = useState(selectedSchool?.district ?? "");
  const editDistrictOptions = editRegion ? getDistrictsByRegion(editRegion) : allUgandaDistricts;

  useEffect(() => {
    if (!schools.some((school) => school.id === selectedSchoolId)) {
      setSelectedSchoolId(schools[0]?.id ?? null);
    }
  }, [schools, selectedSchoolId]);

  useEffect(() => {
    if (!selectedSchool) {
      return;
    }
    if (!editingProfile) {
      setEditRegion(inferRegionFromDistrict(selectedSchool.district) ?? ugandaRegions[0]?.region ?? "");
      setEditDistrict(selectedSchool.district);
    }
    setEditContactName(selectedSchool.contactName ?? "");
    setEditContactPhone(selectedSchool.contactPhone ?? "");
  }, [editingProfile, selectedSchool]);

  function upsertSchool(updatedSchool: SchoolDirectoryRecord) {
    setSchools((prev) => {
      const existingIndex = prev.findIndex((school) => school.id === updatedSchool.id);
      if (existingIndex === -1) {
        return [updatedSchool, ...prev];
      }
      return prev.map((school) => (school.id === updatedSchool.id ? updatedSchool : school));
    });
  }

  async function autofillGps(target: "create" | "edit") {
    const setFeedback = target === "create" ? setCreateFeedback : setProfileFeedback;
    try {
      setFeedback({ kind: "success", message: "Detecting current location..." });
      const coords = await getBrowserCoordinates();
      const form = target === "create" ? createFormRef.current : editFormRef.current;
      setFormInputValue(form, "gpsLat", coords.lat);
      setFormInputValue(form, "gpsLng", coords.lng);
      setFeedback({
        kind: "success",
        message: `GPS coordinates captured (${coords.lat}, ${coords.lng}).`,
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not detect GPS coordinates.",
      });
    }
  }

  async function fetchSchools(district: string, query: string) {
    setLoading(true);
    setDirectoryFeedback({ kind: "idle", message: "" });
    try {
      const params = new URLSearchParams();
      if (district.trim()) params.set("district", district.trim());
      if (query.trim()) params.set("query", query.trim());

      const response = await fetch(`/api/portal/schools?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { error?: string; schools?: SchoolDirectoryRecord[] };
      if (!response.ok || !data.schools) {
        throw new Error(data.error ?? "Could not load schools.");
      }
      setSchools(data.schools);
      if (data.schools.length > 0 && !data.schools.some((school) => school.id === selectedSchoolId)) {
        setSelectedSchoolId(data.schools[0].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load schools.";
      setDirectoryFeedback({ kind: "error", message });
    } finally {
      setLoading(false);
    }
  }

  async function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetchSchools(districtFilter, queryFilter);
  }

  async function handleCreateSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setCreateFeedback({ kind: "success", message: "Saving school..." });
    setSavingSchool(true);

    const formData = new FormData(form);
    const region = String(formData.get("region") ?? "").trim();
    const district = String(formData.get("district") ?? "").trim();
    const payload = {
      name: String(formData.get("name") ?? ""),
      district,
      subCounty: String(formData.get("subCounty") ?? ""),
      parish: String(formData.get("parish") ?? ""),
      village: String(formData.get("village") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      enrollmentTotal: String(formData.get("enrollmentTotal") ?? "0"),
      enrolledBoys: String(formData.get("enrolledBoys") ?? "0"),
      enrolledGirls: String(formData.get("enrolledGirls") ?? "0"),
      enrolledBaby: String(formData.get("enrolledBaby") ?? "0"),
      enrolledMiddle: String(formData.get("enrolledMiddle") ?? "0"),
      enrolledTop: String(formData.get("enrolledTop") ?? "0"),
      enrolledP1: String(formData.get("enrolledP1") ?? "0"),
      enrolledP2: String(formData.get("enrolledP2") ?? "0"),
      enrolledP3: String(formData.get("enrolledP3") ?? "0"),
      enrolledP4: String(formData.get("enrolledP4") ?? "0"),
      enrolledP5: String(formData.get("enrolledP5") ?? "0"),
      enrolledP6: String(formData.get("enrolledP6") ?? "0"),
      enrolledP7: String(formData.get("enrolledP7") ?? "0"),
      gpsLat: String(formData.get("gpsLat") ?? ""),
      gpsLng: String(formData.get("gpsLng") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
    };

    if (!region || !district) {
      setCreateFeedback({
        kind: "error",
        message: "Region and district are required.",
      });
      setSavingSchool(false);
      return;
    }

    const lat = parseOptionalNumber(payload.gpsLat);
    if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
      setCreateFeedback({
        kind: "error",
        message: "GPS latitude must be a valid number between -90 and 90.",
      });
      setSavingSchool(false);
      return;
    }
    const lng = parseOptionalNumber(payload.gpsLng);
    if (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
      setCreateFeedback({
        kind: "error",
        message: "GPS longitude must be a valid number between -180 and 180.",
      });
      setSavingSchool(false);
      return;
    }
    if (!isValidPhone(payload.contactPhone)) {
      setCreateFeedback({
        kind: "error",
        message: "Contact phone format is invalid. Use digits and optional +, space, (), or -.",
      });
      setSavingSchool(false);
      return;
    }
    const enrolledBoys = toWholeNumber(payload.enrolledBoys);
    const enrolledGirls = toWholeNumber(payload.enrolledGirls);
    const enrollmentTotal = toWholeNumber(payload.enrollmentTotal);
    if (Number.isNaN(enrollmentTotal) || enrollmentTotal <= 0) {
      setCreateFeedback({
        kind: "error",
        message: "Enrollment total is required and must be a whole number greater than 0.",
      });
      setSavingSchool(false);
      return;
    }
    if (Number.isNaN(enrolledBoys)) {
      setCreateFeedback({
        kind: "error",
        message: "Enrolled boys must be a whole number greater than or equal to 0.",
      });
      setSavingSchool(false);
      return;
    }
    if (Number.isNaN(enrolledGirls)) {
      setCreateFeedback({
        kind: "error",
        message: "Enrolled girls must be a whole number greater than or equal to 0.",
      });
      setSavingSchool(false);
      return;
    }

    try {
      const response = await fetch("/api/portal/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          enrollmentTotal,
          enrolledBoys,
          enrolledGirls,
          enrolledBaby: toWholeNumber(payload.enrolledBaby),
          enrolledMiddle: toWholeNumber(payload.enrolledMiddle),
          enrolledTop: toWholeNumber(payload.enrolledTop),
          enrolledP1: toWholeNumber(payload.enrolledP1),
          enrolledP2: toWholeNumber(payload.enrolledP2),
          enrolledP3: toWholeNumber(payload.enrolledP3),
          enrolledP4: toWholeNumber(payload.enrolledP4),
          enrolledP5: toWholeNumber(payload.enrolledP5),
          enrolledP6: toWholeNumber(payload.enrolledP6),
          enrolledP7: toWholeNumber(payload.enrolledP7),
        }),
      });

      const data = (await response.json()) as { error?: string; school?: SchoolDirectoryRecord };
      if (!response.ok || !data.school) {
        throw new Error(data.error ?? "Could not save school.");
      }

      upsertSchool(data.school);
      setSelectedSchoolId(data.school.id);
      setEditingProfile(false);
      setSelectedSchoolId(data.school.id);
      setEditingProfile(false);
      form.reset();
      setCreateRegion(ugandaRegions[0]?.region ?? "");
      setCreateDistrict("");
      setCreateContactName("");
      setCreateContactPhone("");
      setIsCreateFormOpen(false);
      setCreateFeedback({
        kind: "success",
        message: `School ${data.school.schoolCode} saved. Next: add reading teachers, schedule first visit, and create a baseline assessment session from the school profile actions.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save school.";
      setCreateFeedback({ kind: "error", message });
    } finally {
      setSavingSchool(false);
    }
  }

  async function handleUpdateSchoolProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSchool) {
      return;
    }

    setSavingProfile(true);
    setProfileFeedback({ kind: "success", message: "Saving profile updates..." });

    const formData = new FormData(event.currentTarget);
    const payload = {
      schoolId: selectedSchool.id,
      name: String(formData.get("name") ?? ""),
      district: String(formData.get("district") ?? ""),
      subCounty: String(formData.get("subCounty") ?? ""),
      parish: String(formData.get("parish") ?? ""),
      village: String(formData.get("village") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      enrolledBoys: String(formData.get("enrolledBoys") ?? "0"),
      enrolledGirls: String(formData.get("enrolledGirls") ?? "0"),
      enrollmentTotal: String(formData.get("enrollmentTotal") ?? selectedSchool.enrollmentTotal ?? "0"),
      enrolledBaby: String(formData.get("enrolledBaby") ?? "0"),
      enrolledMiddle: String(formData.get("enrolledMiddle") ?? "0"),
      enrolledTop: String(formData.get("enrolledTop") ?? "0"),
      enrolledP1: String(formData.get("enrolledP1") ?? "0"),
      enrolledP2: String(formData.get("enrolledP2") ?? "0"),
      enrolledP3: String(formData.get("enrolledP3") ?? "0"),
      enrolledP4: String(formData.get("enrolledP4") ?? "0"),
      enrolledP5: String(formData.get("enrolledP5") ?? "0"),
      enrolledP6: String(formData.get("enrolledP6") ?? "0"),
      enrolledP7: String(formData.get("enrolledP7") ?? "0"),
      gpsLat: String(formData.get("gpsLat") ?? ""),
      gpsLng: String(formData.get("gpsLng") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
    };

    const lat = parseOptionalNumber(payload.gpsLat);
    if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
      setProfileFeedback({
        kind: "error",
        message: "GPS latitude must be a valid number between -90 and 90.",
      });
      setSavingProfile(false);
      return;
    }
    const lng = parseOptionalNumber(payload.gpsLng);
    if (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
      setProfileFeedback({
        kind: "error",
        message: "GPS longitude must be a valid number between -180 and 180.",
      });
      setSavingProfile(false);
      return;
    }
    if (!isValidPhone(payload.contactPhone)) {
      setProfileFeedback({
        kind: "error",
        message: "Contact phone format is invalid. Use digits and optional +, space, (), or -.",
      });
      setSavingProfile(false);
      return;
    }

    const enrolledBoys = toWholeNumber(payload.enrolledBoys);
    const enrolledGirls = toWholeNumber(payload.enrolledGirls);
    const enrollmentTotal = toWholeNumber(payload.enrollmentTotal);
    if (Number.isNaN(enrolledBoys) || Number.isNaN(enrolledGirls)) {
      setProfileFeedback({
        kind: "error",
        message: "Enrollment values must be whole numbers greater than or equal to 0.",
      });
      setSavingProfile(false);
      return;
    }
    if (Number.isNaN(enrollmentTotal) || enrollmentTotal <= 0) {
      setProfileFeedback({
        kind: "error",
        message: "Enrollment total is required and must be greater than 0.",
      });
      setSavingProfile(false);
      return;
    }

    try {
      const response = await fetch("/api/portal/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: selectedSchool.id,
          name: payload.name.trim(),
          district: payload.district.trim(),
          subCounty: payload.subCounty.trim(),
          parish: payload.parish.trim(),
          village: payload.village.trim() || null,
          notes: payload.notes.trim() || null,
          enrollmentTotal,
          enrolledBoys,
          enrolledGirls,
          enrolledBaby: toWholeNumber(payload.enrolledBaby),
          enrolledMiddle: toWholeNumber(payload.enrolledMiddle),
          enrolledTop: toWholeNumber(payload.enrolledTop),
          enrolledP1: toWholeNumber(payload.enrolledP1),
          enrolledP2: toWholeNumber(payload.enrolledP2),
          enrolledP3: toWholeNumber(payload.enrolledP3),
          enrolledP4: toWholeNumber(payload.enrolledP4),
          enrolledP5: toWholeNumber(payload.enrolledP5),
          enrolledP6: toWholeNumber(payload.enrolledP6),
          enrolledP7: toWholeNumber(payload.enrolledP7),
          gpsLat: payload.gpsLat.trim() || null,
          gpsLng: payload.gpsLng.trim() || null,
          contactName: payload.contactName.trim() || null,
          contactPhone: payload.contactPhone.trim() || null,
        }),
      });

      const data = (await response.json()) as { error?: string; school?: SchoolDirectoryRecord };
      if (!response.ok || !data.school) {
        throw new Error(data.error ?? "Could not update school profile.");
      }

      upsertSchool(data.school);
      setSelectedSchoolId(data.school.id);
      setEditingProfile(false);
      setProfileFeedback({
        kind: "success",
        message: `School profile for ${data.school.schoolCode} updated.`,
      });
    } catch (error) {
      setProfileFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not update school profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="card">
        <div className="portal-school-create-header">
          <h2>New School Entry</h2>
          <button
            className="button button-compact"
            type="button"
            onClick={() => {
              setIsCreateFormOpen((prev) => !prev);
              setCreateFeedback({ kind: "idle", message: "" });
            }}
          >
            {isCreateFormOpen ? "Hide Form" : "+ New School"}
          </button>
        </div>
        {isCreateFormOpen ? (
          <form ref={createFormRef} className="form-grid portal-form-grid" onSubmit={handleCreateSchool}>
            <label>
              <span className="portal-field-label">
                <span>School Name</span>
                <span className="portal-required-indicator">
                  *<span className="visually-hidden">required</span>
                </span>
              </span>
              <input
                name="name"
                required
                minLength={2}
                placeholder="e.g. Bright Future Primary - Gulu"
                autoComplete="organization"
              />
            </label>
            <label>
              <span className="portal-field-label">
                <span>Region</span>
                <span className="portal-required-indicator">
                  *<span className="visually-hidden">required</span>
                </span>
              </span>
              <select
                name="region"
                value={createRegion}
                onChange={(event) => {
                  const nextRegion = event.target.value;
                  const options = getDistrictsByRegion(nextRegion);
                  setCreateRegion(nextRegion);
                  setCreateDistrict((current) => (options.includes(current) ? current : ""));
                }}
                required
              >
                <option value="">Select region</option>
                {ugandaRegions.map((entry) => (
                  <option key={entry.region} value={entry.region}>
                    {entry.region}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="portal-field-label">
                <span>District</span>
                <span className="portal-required-indicator">
                  *<span className="visually-hidden">required</span>
                </span>
              </span>
              <select
                name="district"
                value={createDistrict}
                onChange={(event) => setCreateDistrict(event.target.value)}
                required
              >
                <option value="">Select district</option>
                {createDistrictOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="portal-field-label">
                <span>Enrollment Total</span>
                <span className="portal-required-indicator">
                  *<span className="visually-hidden">required</span>
                </span>
              </span>
              <input
                name="enrollmentTotal"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={0}
                inputMode="numeric"
              />
            </label>
            <label>
              <span className="portal-field-label">
                <span>Sub-county (optional)</span>
              </span>
              <input
                name="subCounty"
                placeholder="e.g. Loro"
                autoComplete="address-level2"
              />
            </label>
            <label>
              <span className="portal-field-label">
                <span>Parish (optional)</span>
              </span>
              <input
                name="parish"
                placeholder="e.g. Corner Parish"
                autoComplete="address-level3"
              />
            </label>
            <label>
              <span className="portal-field-label">Village (optional)</span>
              <input name="village" placeholder="e.g. Lukole" autoComplete="address-level4" />
            </label>
            <label className="full-width">
              <span className="portal-field-label">Notes</span>
              <textarea
                name="notes"
                rows={3}
                placeholder="School metadata notes, access details, or additional context."
              />
            </label>
            <fieldset className="portal-fieldset">
              <legend>Class Enrollment</legend>
              <div className="form-grid-3">
                <label>
                  <span className="portal-field-label">Baby</span>
                  <input name="enrolledBaby" type="number" min={0} defaultValue={0} />
                </label>
                <label>
                  <span className="portal-field-label">Middle</span>
                  <input name="enrolledMiddle" type="number" min={0} defaultValue={0} />
                </label>
                <label>
                  <span className="portal-field-label">Top</span>
                  <input name="enrolledTop" type="number" min={0} defaultValue={0} />
                </label>
                <label>
                  <span className="portal-field-label">P1</span>
                  <input name="enrolledP1" type="number" min={0} defaultValue={0} />
                </label>
                <label>
                  <span className="portal-field-label">P2</span>
                  <input name="enrolledP2" type="number" min={0} defaultValue={0} />
                </label>
                <label>
                  <span className="portal-field-label">P3</span>
                  <input name="enrolledP3" type="number" min={0} defaultValue={0} />
                </label>
                <label>
                  <span className="portal-field-label">P4</span>
                  <input name="enrolledP4" type="number" min={0} defaultValue={0} />
                </label>
                <label>
                  <span className="portal-field-label">P5</span>
                  <input name="enrolledP5" type="number" min={0} defaultValue={0} />
                </label>
                <label>
                  <span className="portal-field-label">P6</span>
                  <input name="enrolledP6" type="number" min={0} defaultValue={0} />
                </label>
                <label>
                  <span className="portal-field-label">P7</span>
                  <input name="enrolledP7" type="number" min={0} defaultValue={0} />
                </label>
              </div>
            </fieldset>
            <label>
              <span className="portal-field-label">Total Boys</span>
              <input
                name="enrolledBoys"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                inputMode="numeric"
              />
            </label>
            <label>
              <span className="portal-field-label">Total Girls</span>
              <input
                name="enrolledGirls"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                inputMode="numeric"
              />
            </label>
            <label>
              <span className="portal-field-label">GPS Latitude (optional)</span>
              <input name="gpsLat" placeholder="e.g. 2.7746" inputMode="decimal" />
            </label>
            <label>
              <span className="portal-field-label">GPS Longitude (optional)</span>
              <input name="gpsLng" placeholder="e.g. 32.2990" inputMode="decimal" />
            </label>
            <label>
              <span className="portal-field-label">Primary Contact Name (optional)</span>
              <input
                name="contactName"
                placeholder="e.g. Headteacher name"
                autoComplete="name"
                value={createContactName}
                onChange={(event) => setCreateContactName(event.target.value)}
              />
            </label>
            <label>
              <span className="portal-field-label">Primary Contact Phone (optional)</span>
              <input
                name="contactPhone"
                placeholder="+2567xxxxxxxx"
                inputMode="tel"
                autoComplete="tel"
                value={createContactPhone}
                onChange={(event) => setCreateContactPhone(event.target.value)}
              />
            </label>
            {createDuplicateContactMatches.length > 0 ? (
              <p className="full-width portal-warning-note" role="status">
                Warning: Duplicate contact found in{" "}
                {createDuplicateContactMatches
                  .map((school) => `${school.schoolCode} (${school.name})`)
                  .join(", ")}
                . Saving is allowed.
              </p>
            ) : null}

            <div className="full-width action-row portal-form-actions">
              <button className="button" type="submit" disabled={savingSchool}>
                {savingSchool ? "Saving..." : "Save School"}
              </button>
              <button
                className="button button-ghost"
                type="button"
                disabled={savingSchool}
                onClick={() => void autofillGps("create")}
              >
                Use Current GPS
              </button>
            </div>

            {createFeedback.message ? (
              <p
                role="status"
                className={`full-width form-message ${createFeedback.kind === "error" ? "error" : "success"
                  }`}
              >
                {createFeedback.message}
              </p>
            ) : null}
          </form>
        ) : (
          <p className="portal-muted">Click “+ New School” to open the school metadata form.</p>
        )}
      </section>

      <section className="card">
        <h2>School Profile</h2>
        {!selectedSchool ? (
          <p>Select a school from the directory below to manage profile-linked activities.</p>
        ) : (
          <div className="portal-school-profile">
            <div className="portal-school-profile-header">
              <div>
                <p className="portal-overline">School Account</p>
                <h3>
                  {selectedSchool.name} ({selectedSchool.schoolCode})
                </h3>
                <p className="portal-muted">
                  {selectedSchool.district} • {selectedSchool.subCounty} • {selectedSchool.parish}
                  {selectedSchool.village ? ` • ${selectedSchool.village}` : ""}
                </p>
                {selectedSchool.notes ? (
                  <p className="portal-muted">{selectedSchool.notes}</p>
                ) : null}
              </div>
              <div className="portal-school-profile-actions">
                <Link href={`/portal/trainings?new=1&schoolId=${selectedSchool.id}`} className="button button-compact">
                  New Training
                </Link>
                <Link href={`/portal/visits?new=1&schoolId=${selectedSchool.id}`} className="button button-compact">
                  New School Visit
                </Link>
                <Link href={`/portal/visits?new=1&schoolId=${selectedSchool.id}&programType=Observation`} className="button button-compact">
                  Teacher Evaluation
                </Link>
                <Link href={`/portal/assessments?new=1&schoolId=${selectedSchool.id}`} className="button button-compact">
                  New Assessment
                </Link>
                <Link href={`/portal/story?new=1&schoolId=${selectedSchool.id}`} className="button button-compact">
                  New 1001 Story
                </Link>
              </div>
            </div>

            <div className="portal-school-profile-kpis">
              <article>
                <strong>{Number(selectedSchool.enrolledBoys ?? 0).toLocaleString()}</strong>
                <span>Boys Enrolled</span>
              </article>
              <article>
                <strong>{Number(selectedSchool.enrolledGirls ?? 0).toLocaleString()}</strong>
                <span>Girls Enrolled</span>
              </article>
              <article>
                <strong>{Number(selectedSchool.enrolledLearners ?? 0).toLocaleString()}</strong>
                <span>Total Enrollment</span>
              </article>
              <article>
                <strong>
                  {selectedSchool.gpsLat && selectedSchool.gpsLng
                    ? `${selectedSchool.gpsLat}, ${selectedSchool.gpsLng}`
                    : "Not logged"}
                </strong>
                <span>School GPS</span>
              </article>
            </div>

            {!editingProfile ? (
              <div className="action-row portal-form-actions">
                <button
                  className="button"
                  type="button"
                  onClick={() => setEditingProfile(true)}
                >
                  Edit school profile
                </button>
              </div>
            ) : (
              <form
                ref={editFormRef}
                className="form-grid portal-form-grid"
                onSubmit={handleUpdateSchoolProfile}
              >
                <label>
                  <span className="portal-field-label">School Name</span>
                  <input name="name" defaultValue={selectedSchool.name} required minLength={2} />
                </label>
                <label>
                  <span className="portal-field-label">Region</span>
                  <select
                    value={editRegion}
                    onChange={(event) => {
                      const nextRegion = event.target.value;
                      const options = nextRegion
                        ? getDistrictsByRegion(nextRegion)
                        : allUgandaDistricts;
                      setEditRegion(nextRegion);
                      setEditDistrict((current) => (options.includes(current) ? current : ""));
                    }}
                    required
                  >
                    {ugandaRegions.map((entry) => (
                      <option key={entry.region} value={entry.region}>
                        {entry.region}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset className="portal-fieldset full-width">
                  <legend>Class Enrollment</legend>
                  <div className="form-grid-3">
                    <label>
                      <span className="portal-field-label">Baby</span>
                      <input name="enrolledBaby" type="number" min={0} defaultValue={selectedSchool.enrolledBaby ?? 0} />
                    </label>
                    <label>
                      <span className="portal-field-label">Middle</span>
                      <input name="enrolledMiddle" type="number" min={0} defaultValue={selectedSchool.enrolledMiddle ?? 0} />
                    </label>
                    <label>
                      <span className="portal-field-label">Top</span>
                      <input name="enrolledTop" type="number" min={0} defaultValue={selectedSchool.enrolledTop ?? 0} />
                    </label>
                    <label>
                      <span className="portal-field-label">P1</span>
                      <input name="enrolledP1" type="number" min={0} defaultValue={selectedSchool.enrolledP1 ?? 0} />
                    </label>
                    <label>
                      <span className="portal-field-label">P2</span>
                      <input name="enrolledP2" type="number" min={0} defaultValue={selectedSchool.enrolledP2 ?? 0} />
                    </label>
                    <label>
                      <span className="portal-field-label">P3</span>
                      <input name="enrolledP3" type="number" min={0} defaultValue={selectedSchool.enrolledP3 ?? 0} />
                    </label>
                    <label>
                      <span className="portal-field-label">P4</span>
                      <input name="enrolledP4" type="number" min={0} defaultValue={selectedSchool.enrolledP4 ?? 0} />
                    </label>
                    <label>
                      <span className="portal-field-label">P5</span>
                      <input name="enrolledP5" type="number" min={0} defaultValue={selectedSchool.enrolledP5 ?? 0} />
                    </label>
                    <label>
                      <span className="portal-field-label">P6</span>
                      <input name="enrolledP6" type="number" min={0} defaultValue={selectedSchool.enrolledP6 ?? 0} />
                    </label>
                    <label>
                      <span className="portal-field-label">P7</span>
                      <input name="enrolledP7" type="number" min={0} defaultValue={selectedSchool.enrolledP7 ?? 0} />
                    </label>
                  </div>
                </fieldset>

                <div className="form-grid-2 full-width">
                  <label>
                    <span className="portal-field-label">Enrollment Total</span>
                    <input
                      name="enrollmentTotal"
                      type="number"
                      min={1}
                      defaultValue={selectedSchool.enrollmentTotal ?? selectedSchool.enrolledLearners ?? 0}
                      required
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Total Boys</span>
                    <input name="enrolledBoys" type="number" defaultValue={selectedSchool.enrolledBoys ?? 0} />
                  </label>
                  <label>
                    <span className="portal-field-label">Total Girls</span>
                    <input name="enrolledGirls" type="number" defaultValue={selectedSchool.enrolledGirls ?? 0} />
                  </label>
                </div>
                <label>
                  <span className="portal-field-label">District</span>
                  <select
                    name="district"
                    value={editDistrict}
                    onChange={(event) => setEditDistrict(event.target.value)}
                    required
                  >
                    {editDistrictOptions.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="portal-field-label">Sub-county</span>
                  <input
                    name="subCounty"
                    defaultValue={selectedSchool.subCounty}
                    required
                    minLength={2}
                  />
                </label>
                <label>
                  <span className="portal-field-label">Parish</span>
                  <input name="parish" defaultValue={selectedSchool.parish} required minLength={2} />
                </label>
                <label>
                  <span className="portal-field-label">Village (optional)</span>
                  <input name="village" defaultValue={selectedSchool.village ?? ""} />
                </label>
                <label className="full-width">
                  <span className="portal-field-label">Notes</span>
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={selectedSchool.notes ?? ""}
                    placeholder="School metadata notes, access details, or additional context."
                  />
                </label>
                <label>
                  <span className="portal-field-label">Enrolled Boys</span>
                  <input
                    name="enrolledBoys"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={selectedSchool.enrolledBoys ?? 0}
                  />
                </label>
                <label>
                  <span className="portal-field-label">Enrolled Girls</span>
                  <input
                    name="enrolledGirls"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={selectedSchool.enrolledGirls ?? 0}
                  />
                </label>
                <label>
                  <span className="portal-field-label">GPS Latitude</span>
                  <input name="gpsLat" defaultValue={toGpsInputValue(selectedSchool.gpsLat)} />
                </label>
                <label>
                  <span className="portal-field-label">GPS Longitude</span>
                  <input name="gpsLng" defaultValue={toGpsInputValue(selectedSchool.gpsLng)} />
                </label>
                <label>
                  <span className="portal-field-label">Contact Name</span>
                  <input
                    name="contactName"
                    value={editContactName}
                    onChange={(event) => setEditContactName(event.target.value)}
                  />
                </label>
                <label>
                  <span className="portal-field-label">Contact Phone</span>
                  <input
                    name="contactPhone"
                    value={editContactPhone}
                    onChange={(event) => setEditContactPhone(event.target.value)}
                  />
                </label>
                {editDuplicateContactMatches.length > 0 ? (
                  <p className="full-width portal-warning-note" role="status">
                    Warning: Duplicate contact found in{" "}
                    {editDuplicateContactMatches
                      .map((school) => `${school.schoolCode} (${school.name})`)
                      .join(", ")}
                    . Saving is allowed.
                  </p>
                ) : null}
                <div className="full-width action-row portal-form-actions">
                  <button className="button" type="submit" disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save profile changes"}
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    disabled={savingProfile}
                    onClick={() => void autofillGps("edit")}
                  >
                    Use Current GPS
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    disabled={savingProfile}
                    onClick={() => {
                      setEditingProfile(false);
                      setProfileFeedback({ kind: "idle", message: "" });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {profileFeedback.message ? (
              <p
                role="status"
                className={`form-message ${profileFeedback.kind === "error" ? "error" : "success"
                  }`}
              >
                {profileFeedback.message}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Schools Directory</h2>
        <form className="portal-filter-grid" onSubmit={handleFilterSubmit}>
          <label>
            <span className="portal-field-label">Region</span>
            <select
              value={filterRegion}
              onChange={(event) => {
                const nextRegion = event.target.value;
                const options = nextRegion ? getDistrictsByRegion(nextRegion) : allUgandaDistricts;
                setFilterRegion(nextRegion);
                setDistrictFilter((current) => (options.includes(current) ? current : ""));
              }}
            >
              <option value="">All regions</option>
              {ugandaRegions.map((entry) => (
                <option key={entry.region} value={entry.region}>
                  {entry.region}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">District</span>
            <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)}>
              <option value="">All districts</option>
              {filterDistrictOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">School name or ID</span>
            <input
              placeholder="Search by school name or code"
              value={queryFilter}
              onChange={(event) => setQueryFilter(event.target.value)}
            />
          </label>
          <div className="action-row portal-filter-actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "Filtering..." : "Apply"}
            </button>
            <button
              className="button button-ghost"
              type="button"
              onClick={() => {
                setFilterRegion("");
                setDistrictFilter("");
                setQueryFilter("");
                void fetchSchools("", "");
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {directoryFeedback.message ? (
          <p
            role="status"
            className={`form-message ${directoryFeedback.kind === "error" ? "error" : "success"
              }`}
          >
            {directoryFeedback.message}
          </p>
        ) : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>School ID</th>
                <th>Name</th>
                <th>District</th>
                <th>Sub-county</th>
                <th>Parish</th>
                <th>Village</th>
                <th>Boys</th>
                <th>Girls</th>
                <th>Total</th>
                <th>GPS</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={12}>No schools available.</td>
                </tr>
              ) : (
                schools.map((school) => (
                  <tr key={school.id}>
                    <td>{school.schoolCode}</td>
                    <td>{school.name}</td>
                    <td>{school.district}</td>
                    <td>{school.subCounty}</td>
                    <td>{school.parish}</td>
                    <td>{school.village ?? "-"}</td>
                    <td>{Number(school.enrolledBoys ?? 0).toLocaleString()}</td>
                    <td>{Number(school.enrolledGirls ?? 0).toLocaleString()}</td>
                    <td>{Number(school.enrolledLearners ?? 0).toLocaleString()}</td>
                    <td>
                      {school.gpsLat && school.gpsLng ? `${school.gpsLat}, ${school.gpsLng}` : "-"}
                    </td>
                    <td>
                      {school.contactName ?? "-"}
                      {school.contactPhone ? ` (${school.contactPhone})` : ""}
                    </td>
                    <td>
                      <Link
                        href={`/portal/schools/${school.id}`}
                        className="button button-ghost button-compact"
                      >
                        Open profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div >
  );
}
