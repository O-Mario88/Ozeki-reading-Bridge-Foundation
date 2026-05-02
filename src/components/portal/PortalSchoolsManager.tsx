"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  allUgandaDistricts,
  getDistrictsByRegion,
  getSubRegionsByRegion,
  inferRegionFromDistrict,
  ugandaRegions,
} from "@/lib/uganda-locations";
import { SchoolDirectoryRecord } from "@/lib/types";
import dynamic from "next/dynamic";

const SchoolRosterPicker = dynamic(
  () => import("./SchoolRosterPicker").then((mod) => mod.SchoolRosterPicker),
  { ssr: false, loading: () => <div>Loading roster...</div> },
);
import { FormModal } from "@/components/forms";
import { EnrollmentFormModal } from "./EnrollmentFormModal";
import { LiteracyImpactFormModal } from "./LiteracyImpactFormModal";

interface PortalSchoolsManagerProps {
  initialSchools: SchoolDirectoryRecord[];
  /** When true, hide the directory grid + profile pane and render only the
   *  "New School" modal — auto-opened. Used by /portal/schools/new so the
   *  Add School button on the dashboard goes straight to the input form. */
  createOnly?: boolean;
}

type Feedback = {
  kind: "idle" | "success" | "error";
  message: string;
};


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

export function PortalSchoolsManager({
  initialSchools,
  createOnly = false,
}: PortalSchoolsManagerProps) {
  const router = useRouter();
  const [schools, setSchools] = useState(initialSchools);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(
    initialSchools[0]?.id ?? null,
  );

  const [createRegion, setCreateRegion] = useState(ugandaRegions[0]?.region ?? "");
  const [createSubRegion, setCreateSubRegion] = useState("");
  const [createDistrict, setCreateDistrict] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterSubRegion, setFilterSubRegion] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [queryFilter, setQueryFilter] = useState("");

  const [isDeletingSchool, setIsDeletingSchool] = useState(false);

  const [savingSchool, setSavingSchool] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(createOnly);
  const [isEnrollmentFormOpen, setIsEnrollmentFormOpen] = useState(false);
  const [isLiteracyImpactFormOpen, setIsLiteracyImpactFormOpen] = useState(false);
  const [createContactName, setCreateContactName] = useState("");
  const [createContactPhone, setCreateContactPhone] = useState("");
  const [createContactGender, setCreateContactGender] = useState<"Male" | "Female" | "Other" | "">("");
  const [createContactEmail, setCreateContactEmail] = useState("");
  const [createContactWhatsapp, setCreateContactWhatsapp] = useState("");
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

  const createDistrictOptions = createSubRegion
    ? getDistrictsByRegion(createSubRegion)
    : createRegion
      ? getDistrictsByRegion(createRegion)
      : allUgandaDistricts;
  const filterDistrictOptions = filterSubRegion
    ? getDistrictsByRegion(filterSubRegion)
    : filterRegion
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
    const subRegion = String(formData.get("subRegion") ?? "").trim();
    const district = String(formData.get("district") ?? "").trim();
    const payload = {
      name: String(formData.get("name") ?? ""),
      country: String(formData.get("country") ?? "Uganda"),
      region,
      subRegion,
      district,
      subCounty: String(formData.get("subCounty") ?? ""),
      parish: String(formData.get("parish") ?? ""),
      village: String(formData.get("village") ?? ""),
      alternateSchoolNames: String(formData.get("alternateSchoolNames") ?? ""),
      schoolStatus: String(formData.get("schoolStatus") ?? "Open"),
      schoolStatusDate: String(formData.get("schoolStatusDate") ?? ""),
      currentPartnerType: String(formData.get("currentPartnerType") ?? "NA"),
      yearFounded: String(formData.get("yearFounded") ?? ""),
      currentPartnerSchool: formData.get("currentPartnerSchool") === "on",
      schoolActive: formData.get("schoolActive") !== null ? formData.get("schoolActive") === "on" : true,
      classesJson: JSON.stringify(Array.from(formData.getAll("classes")).map(String)),

      headTeacherName: String(formData.get("headTeacherName") ?? ""),
      headTeacherPhone: String(formData.get("headTeacherPhone") ?? ""),
      headTeacherGender: String(formData.get("headTeacherGender") ?? ""),
      headTeacherEmail: String(formData.get("headTeacherEmail") ?? ""),
      headTeacherWhatsapp: String(formData.get("headTeacherWhatsapp") ?? ""),
    };

    if (!region || !district) {
      setCreateFeedback({
        kind: "error",
        message: "Region and district are required.",
      });
      setSavingSchool(false);
      return;
    }


    if (payload.headTeacherPhone && !isValidPhone(payload.headTeacherPhone)) {
      setCreateFeedback({
        kind: "error",
        message: "Head Teacher phone format is invalid. Use digits and optional +, space, (), or -.",
      });
      setSavingSchool(false);
      return;
    }


    try {
      const response = await fetch("/api/portal/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          country: payload.country.trim() || "Uganda",
          region: payload.region,
          subRegion: payload.subRegion || undefined,
          district: payload.district,
          subCounty: payload.subCounty.trim() || undefined,
          parish: payload.parish.trim() || undefined,
          village: payload.village.trim() || undefined,
          alternateSchoolNames: payload.alternateSchoolNames.trim() || undefined,
          schoolStatus: payload.schoolStatus || "Open",
          schoolStatusDate: payload.schoolStatusDate.trim() || undefined,
          currentPartnerType: payload.currentPartnerType || "NA",
          metricCount: 0,
          runningTotalMaxEnrollment: 0,
          enrollmentTotal: 0,
          classesJson: payload.classesJson,
          enrolledBoys: 0,
          enrolledGirls: 0,
          enrolledBaby: 0,
          enrolledMiddle: 0,
          enrolledTop: 0,
          enrolledP1: 0,
          enrolledP2: 0,
          enrolledP3: 0,
          enrolledP4: 0,
          enrolledP5: 0,
          enrolledP6: 0,
          enrolledP7: 0,
          headTeacherName: payload.headTeacherName.trim() || undefined,
          headTeacherGender: payload.headTeacherGender || undefined,
          headTeacherPhone: payload.headTeacherPhone.trim() || undefined,
          headTeacherEmail: payload.headTeacherEmail.trim() || undefined,
          headTeacherWhatsapp: payload.headTeacherWhatsapp.trim() || undefined,
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
      setCreateSubRegion("");
      setCreateDistrict("");
      setCreateContactName("");
      setCreateContactPhone("");
      setCreateContactGender("");
      setCreateContactEmail("");
      setCreateContactWhatsapp("");
      setIsCreateFormOpen(false);
      setCreateFeedback({
        kind: "success",
        message: `School ${data.school.schoolCode} saved. Next: add reading teachers, schedule first visit, and create a baseline assessment session from the school profile actions.`,
      });
      // In createOnly mode (the dedicated /portal/schools/new route), jump
      // straight to the new school's dashboard once the save completes —
      // there's no directory underneath to navigate back to.
      if (createOnly) {
        router.push(`/portal/schools/${data.school.id}`);
      }
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
      country: String(formData.get("country") ?? "Uganda"),
      district: String(formData.get("district") ?? ""),
      subCounty: String(formData.get("subCounty") ?? ""),
      parish: String(formData.get("parish") ?? ""),
      village: String(formData.get("village") ?? ""),
      alternateSchoolNames: String(formData.get("alternateSchoolNames") ?? ""),
      schoolStatus: String(formData.get("schoolStatus") ?? "Open"),
      schoolStatusDate: String(formData.get("schoolStatusDate") ?? ""),
      currentPartnerType: String(formData.get("currentPartnerType") ?? "NA"),
      yearFounded: String(formData.get("yearFounded") ?? ""),
      currentPartnerSchool: formData.get("currentPartnerSchool") === "on",
      schoolActive: formData.get("schoolActive") !== null ? formData.get("schoolActive") === "on" : true,
      classesJson: JSON.stringify(Array.from(formData.getAll("classes")).map(String)),

      headTeacherName: String(formData.get("headTeacherName") ?? ""),
      headTeacherPhone: String(formData.get("headTeacherPhone") ?? ""),
      headTeacherGender: String(formData.get("headTeacherGender") ?? ""),
      headTeacherEmail: String(formData.get("headTeacherEmail") ?? ""),
      headTeacherWhatsapp: String(formData.get("headTeacherWhatsapp") ?? ""),
    };

    if (!isValidPhone(payload.headTeacherPhone)) {
      setProfileFeedback({
        kind: "error",
        message: "Head Teacher phone format is invalid. Use digits and optional +, space, (), or -.",
      });
      setSavingProfile(false);
      return;
    }
    if (!payload.headTeacherName.trim()) {
      setProfileFeedback({
        kind: "error",
        message: "Head Teacher full name is required.",
      });
      setSavingProfile(false);
      return;
    }
    if (
      payload.headTeacherGender !== "Male" &&
      payload.headTeacherGender !== "Female" &&
      payload.headTeacherGender !== "Other"
    ) {
      setProfileFeedback({
        kind: "error",
        message: "Head Teacher gender is required.",
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
          country: payload.country.trim(),
          district: payload.district.trim(),
          subCounty: payload.subCounty.trim(),
          parish: payload.parish.trim(),
          village: payload.village.trim() || null,
          alternateSchoolNames: payload.alternateSchoolNames.trim() || null,
          schoolStatus: payload.schoolStatus.trim() || "Open",
          schoolStatusDate: payload.schoolStatusDate.trim() || null,
          currentPartnerType: payload.currentPartnerType.trim() || "NA",
          yearFounded: payload.yearFounded.trim() ? Number(payload.yearFounded) : null,
          currentPartnerSchool: payload.currentPartnerSchool,
          schoolActive: payload.schoolActive,
          enrollmentTotal: selectedSchool.enrollmentTotal ?? 0,
          classesJson: payload.classesJson,
          enrolledBoys: selectedSchool.enrolledBoys ?? 0,
          enrolledGirls: selectedSchool.enrolledGirls ?? 0,
          enrolledBaby: selectedSchool.enrolledBaby ?? 0,
          enrolledMiddle: selectedSchool.enrolledMiddle ?? 0,
          enrolledTop: selectedSchool.enrolledTop ?? 0,
          enrolledP1: selectedSchool.enrolledP1 ?? 0,
          enrolledP2: selectedSchool.enrolledP2 ?? 0,
          enrolledP3: selectedSchool.enrolledP3 ?? 0,
          enrolledP4: selectedSchool.enrolledP4 ?? 0,
          enrolledP5: selectedSchool.enrolledP5 ?? 0,
          enrolledP6: selectedSchool.enrolledP6 ?? 0,
          enrolledP7: selectedSchool.enrolledP7 ?? 0,
          headTeacherName: payload.headTeacherName.trim(),
          headTeacherGender: payload.headTeacherGender as "Male" | "Female" | "Other",
          headTeacherPhone: payload.headTeacherPhone.trim() || undefined,
          headTeacherEmail: payload.headTeacherEmail.trim() || undefined,
          headTeacherWhatsapp: payload.headTeacherWhatsapp.trim() || undefined,
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
    } catch (e) {
      setProfileFeedback({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    } finally {
      setEditingProfile(false);
      setSavingProfile(false);
    }
  }

  async function handleDeleteSchool(id: number, e: React.MouseEvent) {
    e.preventDefault();
    if (!window.confirm("Are you SURE you want to permanently delete this school and all of its associated records? This cannot be undone.")) return;
    
    setIsDeletingSchool(true);
    try {
      const res = await fetch(`/api/portal/schools/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete school");
      }
      setSchools((current) => current.filter((s) => s.id !== id));
      if (selectedSchoolId === id) {
        setSelectedSchoolId(schools.find((s) => s.id !== id)?.id ?? null);
      }
      setDirectoryFeedback({
        kind: "success",
        message: "School and all tied records successfully deleted.",
      });
    } catch (e) {
      setDirectoryFeedback({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error during deletion",
      });
    } finally {
      setIsDeletingSchool(false);
    }
  }

  if (loading) {
    return <section className="ds-card">Loading schools...</section>;
  }

  /* createOnly mode (used by /portal/schools/new): render only the
     New School modal — no directory grid, no profile pane, no
     listing. Modal close redirects back to the Schools dashboard
     since there's nothing to fall back to underneath. */
  const handleCreateModalClose = () => {
    if (createOnly) {
      router.push("/portal/schools");
    } else {
      setIsCreateFormOpen(false);
    }
  };

  return (
    <div className="portal-grid">
      {!createOnly && (
        <section className="ds-card">
          <div className="portal-school-create-header">
            <h2>New School Entry</h2>
            <button
              className="button button-compact"
              type="button"
              onClick={() => {
                setIsCreateFormOpen(true);
                setCreateFeedback({ kind: "idle", message: "" });
              }}
            >
              + New School
            </button>
          </div>
          <p className="portal-muted">Create school records in a floating form without leaving this page.</p>
        </section>
      )}
      <section className="ds-card" hidden={!createOnly && !isCreateFormOpen}>
        {isCreateFormOpen ? (
          <FormModal
            open={isCreateFormOpen}
            onClose={handleCreateModalClose}
            title="New School Entry"
            description="Add a new school account and baseline metadata."
            closeLabel={createOnly ? "Cancel" : "Close"}
            maxWidth="1080px"
          >
            <form ref={createFormRef} className="form-grid portal-form-grid portal-form-grid-side" onSubmit={handleCreateSchool}>
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
                <span className="portal-field-label">Country</span>
                <input name="country" defaultValue="Uganda" required />
              </label>
              <label>
                <span className="portal-field-label">School Status</span>
                <select name="schoolStatus" defaultValue="Open">
                  <option value="Open">Open</option>
                  <option value="Paused">Paused</option>
                  <option value="Closed">Closed</option>
                </select>
              </label>
              <label>
                <span className="portal-field-label">Status Date</span>
                <input name="schoolStatusDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </label>
              <label>
                <span className="portal-field-label">Current Partner Type</span>
                <select name="currentPartnerType" defaultValue="NA">
                  <option value="NA">NA</option>
                  <option value="Client">Client</option>
                  <option value="Partner">Partner</option>
                  <option value="Sponsor District">Sponsor District</option>
                </select>
              </label>
              <label>
                <span className="portal-field-label">Year Founded</span>
                <input name="yearFounded" type="number" min={0} placeholder="e.g. 2016" />
              </label>
              <label>
                <span className="portal-field-label">
                  <span>Region</span>
                </span>
                <select
                  name="region"
                  value={createRegion}
                  onChange={(event) => {
                    const nextRegion = event.target.value;
                    const options = getDistrictsByRegion(nextRegion);
                    const subRegions = getSubRegionsByRegion(nextRegion);
                    setCreateRegion(nextRegion);
                    setCreateSubRegion(subRegions.length > 0 ? "" : "");
                    setCreateDistrict((current) => (options.includes(current) ? current : ""));
                  }}
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
                  <span>Sub-Region</span>
                </span>
                <select
                  name="subRegion"
                  value={createSubRegion}
                  onChange={(event) => {
                    const nextSubRegion = event.target.value;
                    setCreateSubRegion(nextSubRegion);
                    const options = nextSubRegion 
                      ? getDistrictsByRegion(nextSubRegion) 
                      : getDistrictsByRegion(createRegion);
                    setCreateDistrict((current) => (options.includes(current) ? current : ""));
                  }}
                >
                  <option value="">Select sub-region</option>
                  {getSubRegionsByRegion(createRegion).map((sr) => (
                    <option key={sr.subRegion} value={sr.subRegion}>
                      {sr.subRegion}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="portal-field-label">
                  <span>District</span>
                </span>
                <select
                  name="district"
                  value={createDistrict}
                  onChange={(event) => setCreateDistrict(event.target.value)}
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
              <fieldset className="portal-fieldset full-width">
                <legend>Classes Offered</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5 portal-multiselect">
                  {[
                    "Baby Class",
                    "Middle Class",
                    "Top Class",
                    "P1",
                    "P2",
                    "P3",
                    "P4",
                    "P5",
                    "P6",
                    "P7",
                  ].map((cls) => (
                    <label key={cls}>
                      <input
                        type="checkbox"
                        name="classes"
                        value={cls}
                      />
                      <span>{cls}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="full-width mt-4 mb-2">
                <h3 className="text-lg font-semibold border-b pb-1">Primary Contact</h3>
              </div>
              <label>
                <span className="portal-field-label">
                  <span>Head Teacher Name</span>
                </span>
                <input
                  name="headTeacherName"
                  placeholder="e.g. Sarah Akello"
                  autoComplete="name"
                  value={createContactName}
                  onChange={(event) => setCreateContactName(event.target.value)}
                />
              </label>
              <label>
                <span className="portal-field-label">Head Teacher Phone (optional)</span>
                <input
                  name="headTeacherPhone"
                  placeholder="+2567xxxxxxxx"
                  inputMode="tel"
                  autoComplete="tel"
                  value={createContactPhone}
                  onChange={(event) => setCreateContactPhone(event.target.value)}
                />
              </label>
              <label>
                <span className="portal-field-label">
                  <span>Head Teacher Gender</span>
                </span>
                <select
                  name="headTeacherGender"
                  value={createContactGender}
                  onChange={(event) =>
                    setCreateContactGender(event.target.value as "Male" | "Female" | "Other" | "")
                  }
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                <span className="portal-field-label">Head Teacher Email (optional)</span>
                <input
                  name="headTeacherEmail"
                  type="email"
                  placeholder="name@school.org"
                  autoComplete="email"
                  value={createContactEmail}
                  onChange={(event) => setCreateContactEmail(event.target.value)}
                />
              </label>
              <label className="full-width">
                <span className="portal-field-label">Head Teacher WhatsApp (optional)</span>
                <input
                  name="headTeacherWhatsapp"
                  placeholder="+2567xxxxxxxx"
                  inputMode="tel"
                  value={createContactWhatsapp}
                  onChange={(event) => setCreateContactWhatsapp(event.target.value)}
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
          </FormModal>
        ) : null}
      </section>

      {!createOnly && (
      <>
      <section className="ds-card">
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
                  {selectedSchool.country} • {selectedSchool.region || selectedSchool.district} • {selectedSchool.district}
                  {selectedSchool.village ? ` • ${selectedSchool.village}` : ""}
                </p>
              </div>
              <div className="portal-school-profile-actions">
                <button
                  type="button"
                  className="button button-compact"
                  onClick={() => setIsEnrollmentFormOpen(true)}
                >
                  New Enrollment
                </button>
                <button
                  type="button"
                  className="button button-compact"
                  onClick={() => setIsLiteracyImpactFormOpen(true)}
                >
                  New Literacy Impact
                </button>
                <Link href={`/portal/trainings?new=1&schoolId=${selectedSchool.id}`} className="button button-compact">
                  New Training
                </Link>
                <Link href={`/portal/visits?new=1&schoolId=${selectedSchool.id}`} className="button button-compact">
                  New School Visit
                </Link>
                <Link href={`/portal/assessments?new=1&schoolId=${selectedSchool.id}`} className="button button-compact">
                  New Assessment
                </Link>
                <Link href={`/portal/story?new=1&schoolId=${selectedSchool.id}`} className="button button-compact">
                  New 1001 Story
                </Link>
                <Link href={`/portal/schools/${selectedSchool.id}`} className="button button-compact">
                  Open Full Profile
                </Link>
                <button
                  type="button"
                  className="button button-compact button-error ml-auto"
                  onClick={(e) => handleDeleteSchool(selectedSchool.id, e)}
                  disabled={isDeletingSchool}
                >
                  {isDeletingSchool ? "Deleting..." : "Delete School"}
                </button>
              </div>
            </div>

            <div className="portal-school-profile-kpis">
              <article>
                <strong>{selectedSchool.schoolStatus}</strong>
                <span>School Status</span>
              </article>
              <article>
                <strong>{selectedSchool.currentPartnerType}</strong>
                <span>Current Partner Type</span>
              </article>
              <article>
                <strong>{selectedSchool.yearFounded ?? "-"}</strong>
                <span>Year Founded</span>
              </article>
              <article>
                <strong>{Number(selectedSchool.enrolledLearners ?? 0).toLocaleString()}</strong>
                <span>Overall Enrollment</span>
              </article>
              <article>
                <strong>{Number(selectedSchool.directImpactLearners ?? 0).toLocaleString()}</strong>
                <span>Literacy Impact Learners</span>
              </article>
            </div>
            
            <EnrollmentFormModal 
              open={isEnrollmentFormOpen} 
              onClose={() => setIsEnrollmentFormOpen(false)} 
              school={selectedSchool}
              onSuccess={() => fetchSchools(districtFilter, queryFilter)}
            />
            
            <LiteracyImpactFormModal 
              open={isLiteracyImpactFormOpen} 
              onClose={() => setIsLiteracyImpactFormOpen(false)} 
              school={selectedSchool}
              onSuccess={() => fetchSchools(districtFilter, queryFilter)}
            />

            {/* ── School Roster Tabs ── */}
            <div className="portal-school-roster-tabs" style={{ marginTop: "1rem" }}>
              <h4 style={{ marginBottom: "0.5rem", fontSize: "0.95rem" }}>School Roster</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <SchoolRosterPicker
                    schoolId={selectedSchool.id}
                    schoolName={selectedSchool.name}
                    participantType="teacher"
                    selectedUid=""
                    onSelect={() => { }}
                    label="Contacts (Leaders/Teachers)"
                  />
                </div>
                <div>
                  <SchoolRosterPicker
                    schoolId={selectedSchool.id}
                    schoolName={selectedSchool.name}
                    participantType="learner"
                    selectedUid=""
                    onSelect={() => { }}
                    label="Learners"
                  />
                </div>
              </div>
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
              <FormModal
                open={editingProfile}
                onClose={() => setEditingProfile(false)}
                title="Edit School Profile"
                description={`${selectedSchool.name} (${selectedSchool.schoolCode})`}
                closeLabel="Close"
                maxWidth="1080px"
              >
                <form
                  ref={editFormRef}
                  className="form-grid portal-form-grid portal-form-grid-side"
                  onSubmit={handleUpdateSchoolProfile}
                >
                  <label>
                    <span className="portal-field-label">School Name</span>
                    <input name="name" defaultValue={selectedSchool.name} required minLength={2} />
                  </label>
                  <label>
                    <span className="portal-field-label">Country</span>
                    <input name="country" defaultValue={selectedSchool.country} required />
                  </label>
                  <label>
                    <span className="portal-field-label">School Status</span>
                    <select name="schoolStatus" defaultValue={selectedSchool.schoolStatus}>
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
                      defaultValue={selectedSchool.schoolStatusDate?.slice(0, 10) ?? ""}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Current Partner Type</span>
                    <select name="currentPartnerType" defaultValue={selectedSchool.currentPartnerType}>
                      <option value="NA">NA</option>
                      <option value="Client">Client</option>
                      <option value="Partner">Partner</option>
                      <option value="Sponsor District">Sponsor District</option>
                    </select>
                  </label>
                  <label>
                    <span className="portal-field-label">Year Founded</span>
                    <input
                      name="yearFounded"
                      type="number"
                      min={0}
                      defaultValue={selectedSchool.yearFounded ?? ""}
                    />
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
                    <legend>Classes Offered</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5 portal-multiselect">
                      {[
                        "Baby Class",
                        "Middle Class",
                        "Top Class",
                        "P1",
                        "P2",
                        "P3",
                        "P4",
                        "P5",
                        "P6",
                        "P7",
                      ].map((cls) => {
                        const selectedClasses = (() => {
                          try {
                            return (JSON.parse(selectedSchool.classesJson || "[]") as string[]) || [];
                          } catch {
                            return [];
                          }
                        })();
                        return (
                          <label key={cls}>
                            <input
                              type="checkbox"
                              name="classes"
                              value={cls}
                              defaultChecked={selectedClasses.includes(cls)}
                            />
                            <span>{cls}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>


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
                  <label>
                    <span className="portal-field-label">Alternate School Names</span>
                    <input
                      name="alternateSchoolNames"
                      defaultValue={selectedSchool.alternateSchoolNames ?? ""}
                    />
                  </label>
                  <label className="portal-inline-check">
                    <input
                      name="currentPartnerSchool"
                      type="checkbox"
                      defaultChecked={selectedSchool.currentPartnerSchool}
                    />
                    <span>Current partner school</span>
                  </label>
                  <label className="portal-inline-check">
                    <input
                      name="schoolActive"
                      type="checkbox"
                      defaultChecked={selectedSchool.schoolActive}
                    />
                    <span>School is active</span>
                  </label>
                  <label>
                    <span className="portal-field-label">Head Teacher Name</span>
                    <input
                      name="headTeacherName"
                      value={editContactName}
                      onChange={(event) => setEditContactName(event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Head Teacher Phone</span>
                    <input
                      name="headTeacherPhone"
                      value={editContactPhone}
                      onChange={(event) => setEditContactPhone(event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Head Teacher Gender</span>
                    <select
                      name="headTeacherGender"
                      defaultValue="Other"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label>
                    <span className="portal-field-label">Head Teacher Email</span>
                    <input
                      name="headTeacherEmail"
                      type="email"
                      defaultValue={selectedSchool.contactEmail ?? ""}
                    />
                  </label>
                  <label className="full-width">
                    <span className="portal-field-label">Head Teacher WhatsApp</span>
                    <input
                      name="headTeacherWhatsapp"
                      defaultValue=""
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
                      onClick={() => {
                        setEditingProfile(false);
                        setProfileFeedback({ kind: "idle", message: "" });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </FormModal>
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

      <section className="ds-card">
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
                setFilterSubRegion("");
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
            <span className="portal-field-label">Sub-Region</span>
            <select
              value={filterSubRegion}
              onChange={(event) => {
                const nextSubRegion = event.target.value;
                setFilterSubRegion(nextSubRegion);
                const options = nextSubRegion 
                  ? getDistrictsByRegion(nextSubRegion) 
                  : filterRegion 
                    ? getDistrictsByRegion(filterRegion)
                    : allUgandaDistricts;
                setDistrictFilter((current) => (options.includes(current) ? current : ""));
              }}
            >
              <option value="">All sub-regions</option>
              {getSubRegionsByRegion(filterRegion).map((sr) => (
                <option key={sr.subRegion} value={sr.subRegion}>
                  {sr.subRegion}
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
                setFilterSubRegion("");
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

        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Account Name</th>
                <th>School ID</th>
                <th>Current Partner Type</th>
                <th>Country</th>
                <th>Primary Contact</th>
                <th>Phone</th>
                <th>School Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={8}>No schools available.</td>
                </tr>
              ) : (
                schools.map((school) => (
                  <tr key={school.id}>
                    <td title={school.name}>
                      <Link href={`/portal/schools/${school.id}`} className="portal-table-cell-ellipsis is-school-name">
                        {school.name}
                      </Link>
                    </td>
                    <td title={school.schoolCode}>
                      <span className="portal-table-cell-ellipsis is-code">{school.schoolCode}</span>
                    </td>
                    <td title={school.currentPartnerType}>
                      <span className="portal-table-cell-ellipsis">{school.currentPartnerType}</span>
                    </td>
                    <td title={school.country}>
                      <span className="portal-table-cell-ellipsis">{school.country}</span>
                    </td>
                    <td title={school.primaryContactName ?? school.contactName ?? "-"}>
                      <span className="portal-table-cell-ellipsis is-contact">
                        {school.primaryContactName ?? school.contactName ?? "-"}
                      </span>
                    </td>
                    <td title={school.contactPhone ?? "-"}>
                      <span className="portal-table-cell-ellipsis">{school.contactPhone ?? "-"}</span>
                    </td>
                    <td>
                      <span className={`portal-filter-chip ${school.schoolStatus === "Open" ? "active" : ""}`}>
                        {school.schoolStatus}
                      </span>
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
      </>
      )}
    </div >
  );
}
