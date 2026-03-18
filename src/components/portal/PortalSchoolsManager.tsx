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
import dynamic from "next/dynamic";

const SchoolRosterPicker = dynamic(
  () => import("./SchoolRosterPicker").then((mod) => mod.SchoolRosterPicker),
  { ssr: false, loading: () => <div>Loading roster...</div> },
);

import { FormModal } from "@/components/forms";

interface PortalSchoolsManagerProps {
  initialSchools: SchoolDirectoryRecord[];
}

type Feedback = {
  kind: "idle" | "success" | "error";
  message: string;
};

const primaryContactRoleOptions = [
  "Proprietor",
  "Head Teacher",
  "DOS",
  "Teacher",
  "Administrator",
  "Deputy Head Teacher",
  "Accountant",
] as const;

type PrimaryContactRole = (typeof primaryContactRoleOptions)[number];

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

export function PortalSchoolsManager({
  initialSchools,
}: PortalSchoolsManagerProps) {
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
  const [createContactGender, setCreateContactGender] = useState<"Male" | "Female" | "Other" | "">("");
  const [createContactEmail, setCreateContactEmail] = useState("");
  const [createContactWhatsapp, setCreateContactWhatsapp] = useState("");
  const [createContactRoleTitle, setCreateContactRoleTitle] = useState<PrimaryContactRole>("Proprietor");
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
      country: String(formData.get("country") ?? "Uganda"),
      region,
      district,
      subCounty: String(formData.get("subCounty") ?? ""),
      parish: String(formData.get("parish") ?? ""),
      village: String(formData.get("village") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      alternateSchoolNames: String(formData.get("alternateSchoolNames") ?? ""),
      schoolStatus: String(formData.get("schoolStatus") ?? "Open"),
      schoolStatusDate: String(formData.get("schoolStatusDate") ?? ""),
      currentPartnerType: String(formData.get("currentPartnerType") ?? "NA"),
      yearFounded: String(formData.get("yearFounded") ?? ""),
      denomination: String(formData.get("denomination") ?? ""),
      protestantDenomination: String(formData.get("protestantDenomination") ?? ""),
      accountRecordType: String(formData.get("accountRecordType") ?? "School"),
      schoolType: String(formData.get("schoolType") ?? "School"),
      parentAccountLabel: String(formData.get("parentAccountLabel") ?? "Uganda"),
      schoolRelationshipStatus: String(formData.get("schoolRelationshipStatus") ?? ""),
      schoolRelationshipStatusDate: String(formData.get("schoolRelationshipStatusDate") ?? ""),
      clientSchoolNumber: Number(formData.get("clientSchoolNumber")) || 0,
      firstMetricDate: String(formData.get("firstMetricDate") ?? ""),
      website: String(formData.get("website") ?? ""),
      description: String(formData.get("description") ?? ""),
      partnerType: String(formData.get("partnerType") ?? ""),
      currentPartnerSchool: formData.get("currentPartnerSchool") === "on",
      schoolActive: formData.get("schoolActive") !== null ? formData.get("schoolActive") === "on" : true,
      enrolledBoys: String(formData.get("enrolledBoys") ?? "0"),
      enrolledGirls: String(formData.get("enrolledGirls") ?? "0"),
      enrolledBaby: String(formData.get("enrolledBaby") ?? "0"),
      enrolledMiddle: String(formData.get("enrolledMiddle") ?? "0"),
      enrolledTop: String(formData.get("enrolledTop") ?? "0"),
      enrolledP1: String(formData.get("enrolledP1") ?? "0"),
      enrolledP2: String(formData.get("enrolledP2") ?? "0"),
      enrolledP3: String(formData.get("enrolledP3") ?? "0"),
      gpsLat: String(formData.get("gpsLat") ?? ""),
      gpsLng: String(formData.get("gpsLng") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      proprietorGender: String(formData.get("proprietorGender") ?? ""),
      proprietorEmail: String(formData.get("proprietorEmail") ?? ""),
      proprietorWhatsapp: String(formData.get("proprietorWhatsapp") ?? ""),
      primaryContactRole: String(formData.get("primaryContactRole") ?? "Proprietor"),
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
        message: "Primary contact phone format is invalid. Use digits and optional +, space, (), or -.",
      });
      setSavingSchool(false);
      return;
    }
    if (!payload.contactName.trim()) {
      setCreateFeedback({
        kind: "error",
        message: "Primary contact full name is required.",
      });
      setSavingSchool(false);
      return;
    }
    if (
      payload.proprietorGender !== "Male" &&
      payload.proprietorGender !== "Female" &&
      payload.proprietorGender !== "Other"
    ) {
      setCreateFeedback({
        kind: "error",
        message: "Primary contact gender is required.",
      });
      setSavingSchool(false);
      return;
    }
    if (!primaryContactRoleOptions.includes(payload.primaryContactRole as PrimaryContactRole)) {
      setCreateFeedback({
        kind: "error",
        message: "Select a valid primary contact role.",
      });
      setSavingSchool(false);
      return;
    }
    const enrolledBoys = toWholeNumber(payload.enrolledBoys);
    const enrolledGirls = toWholeNumber(payload.enrolledGirls);
    const enrolledBaby = toWholeNumber(payload.enrolledBaby);
    const enrolledMiddle = toWholeNumber(payload.enrolledMiddle);
    const enrolledTop = toWholeNumber(payload.enrolledTop);
    const enrolledP1 = toWholeNumber(payload.enrolledP1);
    const enrolledP2 = toWholeNumber(payload.enrolledP2);
    const enrolledP3 = toWholeNumber(payload.enrolledP3);
    if (
      [enrolledBaby, enrolledMiddle, enrolledTop, enrolledP1, enrolledP2, enrolledP3].some((value) =>
        Number.isNaN(value),
      )
    ) {
      setCreateFeedback({
        kind: "error",
        message: "New enrollment counts must be whole numbers greater than or equal to 0.",
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
    const enrollmentTotal = enrolledBoys + enrolledGirls;

    try {
      const response = await fetch("/api/portal/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          yearFounded: payload.yearFounded.trim() ? Number(payload.yearFounded) : undefined,
          accountRecordType: "School",
          schoolType: "School",
          parentAccountLabel: payload.country.trim() || "Uganda",
          schoolRelationshipStatus: payload.currentPartnerType.trim() ? "Pre-partner" : undefined,
          schoolRelationshipStatusDate: payload.schoolStatusDate.trim() || undefined,
          clientSchoolNumber: 0,
          metricCount: 0,
          runningTotalMaxEnrollment: enrollmentTotal,
          enrollmentTotal,
          enrolledBoys,
          enrolledGirls,
          enrolledBaby,
          enrolledMiddle,
          enrolledTop,
          enrolledP1,
          enrolledP2,
          enrolledP3,
          enrolledP4: 0,
          enrolledP5: 0,
          enrolledP6: 0,
          enrolledP7: 0,
          proprietor: {
            fullName: payload.contactName.trim(),
            gender: payload.proprietorGender as "Male" | "Female" | "Other",
            phone: payload.contactPhone.trim() || undefined,
            email: payload.proprietorEmail.trim() || undefined,
            whatsapp: payload.proprietorWhatsapp.trim() || undefined,
            category: payload.primaryContactRole as PrimaryContactRole,
            roleTitle: payload.primaryContactRole as PrimaryContactRole,
          },
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
      setCreateContactGender("");
      setCreateContactEmail("");
      setCreateContactWhatsapp("");
      setCreateContactRoleTitle("Proprietor");
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
      country: String(formData.get("country") ?? "Uganda"),
      district: String(formData.get("district") ?? ""),
      subCounty: String(formData.get("subCounty") ?? ""),
      parish: String(formData.get("parish") ?? ""),
      village: String(formData.get("village") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      alternateSchoolNames: String(formData.get("alternateSchoolNames") ?? ""),
      schoolStatus: String(formData.get("schoolStatus") ?? "Open"),
      schoolStatusDate: String(formData.get("schoolStatusDate") ?? ""),
      currentPartnerType: String(formData.get("currentPartnerType") ?? "NA"),
      yearFounded: String(formData.get("yearFounded") ?? ""),
      denomination: String(formData.get("denomination") ?? ""),
      protestantDenomination: String(formData.get("protestantDenomination") ?? ""),
      accountRecordType: String(formData.get("accountRecordType") ?? "School"),
      schoolType: String(formData.get("schoolType") ?? "School"),
      parentAccountLabel: String(formData.get("parentAccountLabel") ?? "Uganda"),
      schoolRelationshipStatus: String(formData.get("schoolRelationshipStatus") ?? ""),
      schoolRelationshipStatusDate: String(formData.get("schoolRelationshipStatusDate") ?? ""),
      clientSchoolNumber: Number(formData.get("clientSchoolNumber")) || 0,
      firstMetricDate: String(formData.get("firstMetricDate") ?? ""),
      website: String(formData.get("website") ?? ""),
      description: String(formData.get("description") ?? ""),
      partnerType: String(formData.get("partnerType") ?? ""),
      currentPartnerSchool: formData.get("currentPartnerSchool") === "on",
      schoolActive: formData.get("schoolActive") !== null ? formData.get("schoolActive") === "on" : true,
      enrolledBoys: String(formData.get("enrolledBoys") ?? "0"),
      enrolledGirls: String(formData.get("enrolledGirls") ?? "0"),
      enrolledBaby: String(formData.get("enrolledBaby") ?? "0"),
      enrolledMiddle: String(formData.get("enrolledMiddle") ?? "0"),
      enrolledTop: String(formData.get("enrolledTop") ?? "0"),
      enrolledP1: String(formData.get("enrolledP1") ?? "0"),
      enrolledP2: String(formData.get("enrolledP2") ?? "0"),
      enrolledP3: String(formData.get("enrolledP3") ?? "0"),
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
    const enrolledBaby = toWholeNumber(payload.enrolledBaby);
    const enrolledMiddle = toWholeNumber(payload.enrolledMiddle);
    const enrolledTop = toWholeNumber(payload.enrolledTop);
    const enrolledP1 = toWholeNumber(payload.enrolledP1);
    const enrolledP2 = toWholeNumber(payload.enrolledP2);
    const enrolledP3 = toWholeNumber(payload.enrolledP3);
    if (Number.isNaN(enrolledBoys) || Number.isNaN(enrolledGirls)) {
      setProfileFeedback({
        kind: "error",
        message: "Enrollment values must be whole numbers greater than or equal to 0.",
      });
      setSavingProfile(false);
      return;
    }
    if (
      [enrolledBaby, enrolledMiddle, enrolledTop, enrolledP1, enrolledP2, enrolledP3].some((value) =>
        Number.isNaN(value),
      )
    ) {
      setProfileFeedback({
        kind: "error",
        message: "New enrollment counts must be whole numbers greater than or equal to 0.",
      });
      setSavingProfile(false);
      return;
    }
    const enrollmentTotal = enrolledBoys + enrolledGirls;

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
          notes: payload.notes.trim() || null,
          alternateSchoolNames: payload.alternateSchoolNames.trim() || null,
          schoolStatus: payload.schoolStatus.trim() || "Open",
          schoolStatusDate: payload.schoolStatusDate.trim() || null,
          currentPartnerType: payload.currentPartnerType.trim() || "NA",
          yearFounded: payload.yearFounded.trim() ? Number(payload.yearFounded) : null,
          accountRecordType: selectedSchool.accountRecordType,
          schoolType: selectedSchool.schoolType,
          parentAccountLabel: selectedSchool.parentAccountLabel,
          schoolRelationshipStatus: selectedSchool.schoolRelationshipStatus,
          schoolRelationshipStatusDate: selectedSchool.schoolRelationshipStatusDate,
          denomination: payload.denomination.trim() || null,
          clientSchoolNumber: selectedSchool.clientSchoolNumber,
          metricCount: selectedSchool.metricCount,
          runningTotalMaxEnrollment: Math.max(selectedSchool.runningTotalMaxEnrollment, enrollmentTotal),
          partnerType: payload.partnerType.trim() || null,
          currentPartnerSchool: payload.currentPartnerSchool,
          schoolActive: payload.schoolActive,
          website: payload.website.trim() || null,
          description: payload.description.trim() || null,
          enrollmentTotal,
          enrolledBoys,
          enrolledGirls,
          enrolledBaby,
          enrolledMiddle,
          enrolledTop,
          enrolledP1,
          enrolledP2,
          enrolledP3,
          enrolledP4: selectedSchool.enrolledP4 ?? 0,
          enrolledP5: selectedSchool.enrolledP5 ?? 0,
          enrolledP6: selectedSchool.enrolledP6 ?? 0,
          enrolledP7: selectedSchool.enrolledP7 ?? 0,
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
              setIsCreateFormOpen(true);
              setCreateFeedback({ kind: "idle", message: "" });
            }}
          >
            + New School
          </button>
        </div>
        <p className="portal-muted">Create school records in a floating form without leaving this page.</p>
        {isCreateFormOpen ? (
          <FormModal
            open={isCreateFormOpen}
            onClose={() => setIsCreateFormOpen(false)}
            title="New School Entry"
            description="Add a new school account and baseline metadata."
            closeLabel="Close"
            maxWidth="1080px"
          >
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
              <label>
                <span className="portal-field-label">Alternate School Names</span>
                <input name="alternateSchoolNames" placeholder="Optional aliases or former names" />
              </label>
              <label>
                <span className="portal-field-label">Denomination</span>
                <input name="denomination" placeholder="e.g. Catholic" />
              </label>
              <label>
                <span className="portal-field-label">Protestant Denomination</span>
                <input name="protestantDenomination" placeholder="e.g. Anglican" />
              </label>
              <label>
                <span className="portal-field-label">Account Record Type</span>
                <input name="accountRecordType" defaultValue="School" />
              </label>
              <label>
                <span className="portal-field-label">School Type</span>
                <input name="schoolType" defaultValue="School" />
              </label>
              <label>
                <span className="portal-field-label">Parent Account Label</span>
                <input name="parentAccountLabel" defaultValue="Uganda" />
              </label>
              <label>
                <span className="portal-field-label">Relationship Status</span>
                <input name="schoolRelationshipStatus" placeholder="e.g. Active" />
              </label>
              <label>
                <span className="portal-field-label">Relationship Status Date</span>
                <input name="schoolRelationshipStatusDate" type="date" />
              </label>
              <label>
                <span className="portal-field-label">Client School Number</span>
                <input name="clientSchoolNumber" type="number" defaultValue={0} />
              </label>
              <label>
                <span className="portal-field-label">First Metric Date</span>
                <input name="firstMetricDate" type="date" />
              </label>
              <label>
                <span className="portal-field-label">Partner Type</span>
                <input name="partnerType" placeholder="Optional internal partner label" />
              </label>
              <label>
                <span className="portal-field-label">Website</span>
                <input name="website" placeholder="school.example.org" />
              </label>
              <label className="portal-inline-check">
                <input name="currentPartnerSchool" type="checkbox" />
                <span>Current partner school</span>
              </label>
              <label className="portal-inline-check">
                <input name="schoolActive" type="checkbox" defaultChecked />
                <span>School is active</span>
              </label>
              <label className="full-width">
                <span className="portal-field-label">Description</span>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Short account summary for this school profile."
                />
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
                <legend>New Enrollment (Immediate Ozeki Impact)</legend>
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
                </div>
              </fieldset>
              <p className="full-width portal-muted">
                Directly impacted learners are auto-calculated as Baby + Middle + Top + P1 + P2 + P3.
              </p>
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
              <p className="full-width portal-muted">
                General enrollment impact is auto-calculated from Total Boys + Total Girls.
              </p>
              <label>
                <span className="portal-field-label">GPS Latitude (optional)</span>
                <input name="gpsLat" placeholder="e.g. 2.7746" inputMode="decimal" />
              </label>
              <label>
                <span className="portal-field-label">GPS Longitude (optional)</span>
                <input name="gpsLng" placeholder="e.g. 32.2990" inputMode="decimal" />
              </label>
              <label>
                <span className="portal-field-label">
                  <span>Primary Contact Name</span>
                  <span className="portal-required-indicator">
                    *<span className="visually-hidden">required</span>
                  </span>
                </span>
                <input
                  name="contactName"
                  placeholder="e.g. Sarah Akello"
                  autoComplete="name"
                  value={createContactName}
                  onChange={(event) => setCreateContactName(event.target.value)}
                  required
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
              <label>
                <span className="portal-field-label">
                  <span>Primary Contact Gender</span>
                  <span className="portal-required-indicator">
                    *<span className="visually-hidden">required</span>
                  </span>
                </span>
                <select
                  name="proprietorGender"
                  value={createContactGender}
                  onChange={(event) =>
                    setCreateContactGender(event.target.value as "Male" | "Female" | "Other" | "")
                  }
                  required
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                <span className="portal-field-label">Primary Contact Email (optional)</span>
                <input
                  name="proprietorEmail"
                  type="email"
                  placeholder="name@school.org"
                  autoComplete="email"
                  value={createContactEmail}
                  onChange={(event) => setCreateContactEmail(event.target.value)}
                />
              </label>
              <label>
                <span className="portal-field-label">Primary Contact WhatsApp (optional)</span>
                <input
                  name="proprietorWhatsapp"
                  placeholder="+2567xxxxxxxx"
                  inputMode="tel"
                  value={createContactWhatsapp}
                  onChange={(event) => setCreateContactWhatsapp(event.target.value)}
                />
              </label>
              <label>
                <span className="portal-field-label">Primary Contact Role</span>
                <select
                  name="primaryContactRole"
                  value={createContactRoleTitle}
                  onChange={(event) =>
                    setCreateContactRoleTitle(event.target.value as PrimaryContactRole)
                  }
                >
                  {primaryContactRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
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
          </FormModal>
        ) : null}
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
                  {selectedSchool.country} • {selectedSchool.region || selectedSchool.district} • {selectedSchool.district}
                  {selectedSchool.village ? ` • ${selectedSchool.village}` : ""}
                </p>
                {selectedSchool.notes ? (
                  <p className="portal-muted">{selectedSchool.notes}</p>
                ) : null}
              </div>
              <div className="portal-school-profile-actions">
                <button
                  type="button"
                  className="button button-compact"
                  onClick={() => setEditingProfile(true)}
                >
                  New Enrollment
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
                <strong>
                  {selectedSchool.gpsLat && selectedSchool.gpsLng
                    ? `${selectedSchool.gpsLat}, ${selectedSchool.gpsLng}`
                    : "Not logged"}
                </strong>
                <span>School GPS</span>
              </article>
            </div>

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
                  className="form-grid portal-form-grid"
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
                    <legend>New Enrollment (Immediate Ozeki Impact)</legend>
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
                    </div>
                  </fieldset>
                  <p className="full-width portal-muted">
                    Directly impacted learners are auto-calculated as Baby + Middle + Top + P1 + P2 + P3.
                  </p>

                  <div className="form-grid-2 full-width">
                    <label>
                      <span className="portal-field-label">Total Boys</span>
                      <input name="enrolledBoys" type="number" defaultValue={selectedSchool.enrolledBoys ?? 0} />
                    </label>
                    <label>
                      <span className="portal-field-label">Total Girls</span>
                      <input name="enrolledGirls" type="number" defaultValue={selectedSchool.enrolledGirls ?? 0} />
                    </label>
                  </div>
                  <p className="full-width portal-muted">
                    General enrollment impact is auto-calculated from Total Boys + Total Girls.
                  </p>
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
                  <label>
                    <span className="portal-field-label">Denomination</span>
                    <input name="denomination" defaultValue={selectedSchool.denomination ?? ""} />
                  </label>
                  <label>
                    <span className="portal-field-label">Protestant Denomination</span>
                    <input name="protestantDenomination" defaultValue={selectedSchool.protestantDenomination ?? ""} />
                  </label>
                  <label>
                    <span className="portal-field-label">Account Record Type</span>
                    <input name="accountRecordType" defaultValue={selectedSchool.accountRecordType ?? "School"} />
                  </label>
                  <label>
                    <span className="portal-field-label">School Type</span>
                    <input name="schoolType" defaultValue={selectedSchool.schoolType ?? "School"} />
                  </label>
                  <label>
                    <span className="portal-field-label">Parent Account Label</span>
                    <input name="parentAccountLabel" defaultValue={selectedSchool.parentAccountLabel ?? "Uganda"} />
                  </label>
                  <label>
                    <span className="portal-field-label">Relationship Status</span>
                    <input name="schoolRelationshipStatus" defaultValue={selectedSchool.schoolRelationshipStatus ?? ""} />
                  </label>
                  <label>
                    <span className="portal-field-label">Relationship Status Date</span>
                    <input name="schoolRelationshipStatusDate" type="date" defaultValue={selectedSchool.schoolRelationshipStatusDate?.slice(0, 10) ?? ""} />
                  </label>
                  <label>
                    <span className="portal-field-label">Client School Number</span>
                    <input name="clientSchoolNumber" type="number" defaultValue={selectedSchool.clientSchoolNumber ?? 0} />
                  </label>
                  <label>
                    <span className="portal-field-label">First Metric Date</span>
                    <input name="firstMetricDate" type="date" defaultValue={selectedSchool.firstMetricDate?.slice(0, 10) ?? ""} />
                  </label>
                  <label>
                    <span className="portal-field-label">Partner Type</span>
                    <input name="partnerType" defaultValue={selectedSchool.partnerType ?? ""} />
                  </label>
                  <label>
                    <span className="portal-field-label">Website</span>
                    <input name="website" defaultValue={selectedSchool.website ?? ""} />
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
                  <label className="full-width">
                    <span className="portal-field-label">Description</span>
                    <textarea
                      name="description"
                      rows={2}
                      defaultValue={selectedSchool.description ?? ""}
                    />
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

        <div className="table-wrap portal-table-compact portal-schools-directory-table">
          <table>
            <thead>
              <tr>
                <th>Account Name</th>
                <th>School ID</th>
                <th>Current Partner Type</th>
                <th>Country</th>
                <th>Account Record Type</th>
                <th>Type</th>
                <th>Primary Contact</th>
                <th>Phone</th>
                <th>School Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={10}>No schools available.</td>
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
                    <td title={school.accountRecordType}>
                      <span className="portal-table-cell-ellipsis">{school.accountRecordType}</span>
                    </td>
                    <td title={school.schoolType}>
                      <span className="portal-table-cell-ellipsis">{school.schoolType}</span>
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
    </div >
  );
}
