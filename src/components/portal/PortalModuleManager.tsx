"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  PortalFieldConfig,
  PortalModuleConfig,
  portalStatusOptions,
} from "@/lib/portal-config";
import {
  allUgandaDistricts,
  getDistrictsByRegion,
  inferRegionFromDistrict,
  ugandaRegions,
} from "@/lib/uganda-locations";
import {
  PortalRecord,
  PortalRecordStatus,
  SchoolDirectoryRecord,
  PortalUser,
} from "@/lib/types";

type FilterState = {
  region: string;
  dateFrom: string;
  dateTo: string;
  district: string;
  school: string;
  status: string;
  createdBy: string;
  programType: string;
};

type FormPayloadState = Record<string, string | string[]>;

type FormState = {
  id: number | null;
  date: string;
  region: string;
  district: string;
  schoolId: string;
  schoolName: string;
  programType: string;
  followUpDate: string;
  status: PortalRecordStatus;
  reviewNote: string;
  payload: FormPayloadState;
};

type FeedbackState = {
  kind: "success" | "error" | "idle";
  message: string;
};

type BrowserCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

type EvidenceItem = {
  id: number;
  fileName: string;
  createdAt: string;
  downloadUrl: string;
};

type OfflineQueueItem = {
  action: "create" | "update";
  id?: number;
  body: {
    module: string;
    date: string;
    district: string;
    schoolId: number;
    schoolName: string;
    programType?: string;
    followUpDate?: string;
    status: PortalRecordStatus;
    payload: Record<string, string | number | boolean | string[] | null | undefined>;
  };
};

type EgraMetricKey =
  | "letterNames"
  | "letterSounds"
  | "realWords"
  | "madeUpWords"
  | "storyReading"
  | "readingComp";

type EgraLearnerRow = {
  no: number;
  learnerId: string;
  sex: "" | "M" | "F";
  age: string;
  letterNames: string;
  letterSounds: string;
  realWords: string;
  madeUpWords: string;
  storyReading: string;
  readingComp: string;
  fluencyLevel: string;
};

type EgraSummary = {
  learnersAssessed: number;
  averages: {
    boys: Record<EgraMetricKey, number>;
    girls: Record<EgraMetricKey, number>;
    class: Record<EgraMetricKey, number>;
  };
  profile: {
    nonReaders: number;
    emerging: number;
    developing: number;
    transitional: number;
    fluent: number;
    percentages: {
      nonReaders: number;
      emerging: number;
      developing: number;
      transitional: number;
      fluent: number;
    };
  };
  rowsForPayload: Array<{
    no: number;
    learnerId: string;
    sex: "M" | "F" | "";
    age: number | null;
    letterNames: number | null;
    letterSounds: number | null;
    realWords: number | null;
    madeUpWords: number | null;
    storyReading: number | null;
    readingComp: number | null;
    fluencyLevel: string;
  }>;
};

type TrainingParticipantRole = "" | "Teacher" | "Leader";
type TrainingParticipantGender = "" | "Male" | "Female";

type TrainingParticipantRow = {
  participantName: string;
  schoolAccountId: string;
  schoolAttachedTo: string;
  role: TrainingParticipantRole;
  gender: TrainingParticipantGender;
  phoneContact: string;
};

interface PortalModuleManagerProps {
  config: PortalModuleConfig;
  initialRecords: PortalRecord[];
  initialSchools: SchoolDirectoryRecord[];
  initialUsers: Array<{ id: number; fullName: string }>;
  currentUser: PortalUser;
}

const queueStorageKey = "portal-offline-queue";
const defaultRegion = ugandaRegions[0]?.region ?? "";
const EGRA_ROW_COUNT = 20;
const egraMetricLabels: Array<{ key: EgraMetricKey; label: string }> = [
  { key: "letterNames", label: "Letter Names (letters/min)" },
  { key: "letterSounds", label: "Letter Sounds (sounds/min)" },
  { key: "realWords", label: "Real Words (words/min)" },
  { key: "madeUpWords", label: "Made-up Words (words/min)" },
  { key: "storyReading", label: "Story Reading (words/min)" },
  { key: "readingComp", label: "Reading Comprehension (correct Qs)" },
];

const egraLevelLabels = [
  "Non-Reader",
  "Emerging Reader",
  "Developing Reader",
  "Transitional Reader",
  "Fluent Reader",
] as const;

const visitObservationScoreByRating: Record<string, number> = {
  "Very Good": 5,
  Good: 3,
  Fair: 1,
  "Can Improve": 0,
};

async function requestBrowserCoordinates(): Promise<BrowserCoordinates> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not available on this device.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude),
          longitude: Number(position.coords.longitude),
          accuracy: Number.isFinite(position.coords.accuracy)
            ? Number(position.coords.accuracy)
            : null,
        });
      },
      (error) => {
        reject(new Error(error.message || "Could not get current GPS coordinates."));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}

function isVisitObservationField(key: string) {
  return (
    key.startsWith("general_") ||
    key.startsWith("newSound_") ||
    key.startsWith("readingActivities_") ||
    key.startsWith("trickyWords_")
  );
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToDate(dateValue: string, days: number) {
  if (!dateValue) {
    return getToday();
  }
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return getToday();
  }
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function sanitizeForInput(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function renderLabel(label: string, required?: boolean) {
  return (
    <span className="portal-field-label">
      <span>{label}</span>
      {required ? (
        <span className="portal-required-indicator">
          *<span className="visually-hidden">required</span>
        </span>
      ) : null}
    </span>
  );
}

function inferInputType(field: PortalFieldConfig) {
  if (field.type !== "text") {
    return field.type;
  }

  const normalizedKey = field.key.toLowerCase();
  if (normalizedKey.includes("email")) {
    return "email";
  }
  if (normalizedKey.includes("phone")) {
    return "tel";
  }
  return "text";
}

function inferInputMode(field: PortalFieldConfig) {
  if (field.type === "number") {
    return field.step && !Number.isInteger(field.step) ? "decimal" : "numeric";
  }

  if (field.type === "text") {
    const normalizedKey = field.key.toLowerCase();
    if (normalizedKey.includes("phone")) {
      return "tel";
    }
    if (normalizedKey.includes("email")) {
      return "email";
    }
  }

  return undefined;
}

function inferAutoComplete(field: PortalFieldConfig) {
  const normalizedKey = field.key.toLowerCase();
  if (normalizedKey.includes("school")) return "organization";
  if (normalizedKey.includes("district")) return "address-level1";
  if (normalizedKey.includes("subcounty")) return "address-level2";
  if (normalizedKey.includes("parish")) return "address-level3";
  if (normalizedKey.includes("village")) return "address-level4";
  if (normalizedKey.includes("email")) return "email";
  if (normalizedKey.includes("phone")) return "tel";
  return "off";
}

function inferPlaceholder(field: PortalFieldConfig) {
  if (field.placeholder) {
    return field.placeholder;
  }

  const normalizedKey = field.key.toLowerCase();
  if (normalizedKey.includes("district")) return "e.g. Oyam";
  if (normalizedKey.includes("school")) return "e.g. Bright Future Primary";
  if (normalizedKey.includes("subcounty")) return "e.g. Loro";
  if (normalizedKey.includes("parish")) return "e.g. Corner Parish";
  if (normalizedKey.includes("village")) return "e.g. Agurur";
  if (normalizedKey.includes("email")) return "name@school.org";
  if (normalizedKey.includes("phone")) return "+2567xxxxxxxx";
  if (normalizedKey.includes("facilitator")) return "e.g. Ruth Nakato, Peter Okello";
  return undefined;
}

function normalizeParticipantRole(value: unknown): TrainingParticipantRole {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "teacher") {
    return "Teacher";
  }
  if (normalized === "leader") {
    return "Leader";
  }
  return "";
}

function normalizeParticipantGender(value: unknown): TrainingParticipantGender {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "male" || normalized === "m") {
    return "Male";
  }
  if (normalized === "female" || normalized === "f") {
    return "Female";
  }
  return "";
}

function createEmptyTrainingParticipant(defaultSchoolId = "", defaultSchoolName = ""): TrainingParticipantRow {
  return {
    participantName: "",
    schoolAccountId: defaultSchoolId,
    schoolAttachedTo: defaultSchoolName,
    role: "",
    gender: "",
    phoneContact: "",
  };
}

function rowHasTrainingParticipantData(row: TrainingParticipantRow) {
  return (
    row.participantName.trim() ||
    row.schoolAccountId.trim() ||
    row.schoolAttachedTo.trim() ||
    row.role ||
    row.gender ||
    row.phoneContact.trim()
  );
}

function parseTrainingParticipants(
  raw: unknown,
  options?: {
    defaultSchoolId?: string;
    defaultSchoolName?: string;
    schoolsById?: Map<number, SchoolDirectoryRecord>;
    schoolsByName?: Map<string, SchoolDirectoryRecord>;
  },
): TrainingParticipantRow[] {
  const fallback = [
    createEmptyTrainingParticipant(options?.defaultSchoolId ?? "", options?.defaultSchoolName ?? ""),
  ];
  if (!raw) {
    return fallback;
  }

  let source: unknown = raw;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      return fallback;
    }
  }

  if (!Array.isArray(source)) {
    return fallback;
  }

  const rows = source
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const entry = item as Record<string, unknown>;
      const schoolAccountIdRaw = sanitizeForInput(entry.schoolAccountId).trim();
      const schoolAttachedToRaw = sanitizeForInput(entry.schoolAttachedTo).trim();
      const schoolFromId =
        schoolAccountIdRaw && options?.schoolsById
          ? options.schoolsById.get(Number(schoolAccountIdRaw))
          : null;
      const schoolFromName =
        !schoolFromId && schoolAttachedToRaw && options?.schoolsByName
          ? options.schoolsByName.get(schoolAttachedToRaw.toLowerCase())
          : null;
      const linkedSchool = schoolFromId ?? schoolFromName ?? null;

      return {
        participantName: sanitizeForInput(entry.participantName),
        schoolAccountId: linkedSchool ? String(linkedSchool.id) : schoolAccountIdRaw,
        schoolAttachedTo:
          linkedSchool?.name ||
          schoolAttachedToRaw ||
          options?.defaultSchoolName ||
          "",
        role: normalizeParticipantRole(entry.role),
        gender: normalizeParticipantGender(entry.gender),
        phoneContact: sanitizeForInput(entry.phoneContact),
      } as TrainingParticipantRow;
    })
    .filter((row) => rowHasTrainingParticipantData(row));

  return rows.length > 0 ? rows : fallback;
}

function buildDefaultPayload(config: PortalModuleConfig): FormPayloadState {
  const payload: FormPayloadState = {};
  config.sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === "multiselect") {
        payload[field.key] = [];
      } else if (
        field.type === "participants" ||
        field.type === "egraLearners" ||
        field.type === "egraSummary" ||
        field.type === "egraProfile"
      ) {
        payload[field.key] = "";
      } else if (field.type === "select") {
        payload[field.key] = field.options?.[0]?.value ?? "";
      } else {
        payload[field.key] = "";
      }
    });
  });
  return payload;
}

function isNumberField(field: PortalFieldConfig) {
  return field.type === "number";
}

function findField(config: PortalModuleConfig, key: string) {
  for (const section of config.sections) {
    const field = section.fields.find((entry) => entry.key === key);
    if (field) {
      return field;
    }
  }
  return undefined;
}

function readQueue() {
  if (typeof window === "undefined") {
    return [] as OfflineQueueItem[];
  }

  try {
    const raw = window.localStorage.getItem(queueStorageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as OfflineQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: OfflineQueueItem[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(queueStorageKey, JSON.stringify(items));
}

function createEmptyEgraMetricRecord(): Record<EgraMetricKey, number> {
  return {
    letterNames: 0,
    letterSounds: 0,
    realWords: 0,
    madeUpWords: 0,
    storyReading: 0,
    readingComp: 0,
  };
}

function createEmptyEgraLearnerRow(no: number): EgraLearnerRow {
  return {
    no,
    learnerId: "",
    sex: "",
    age: "",
    letterNames: "",
    letterSounds: "",
    realWords: "",
    madeUpWords: "",
    storyReading: "",
    readingComp: "",
    fluencyLevel: "",
  };
}

function createDefaultEgraRows() {
  return Array.from({ length: EGRA_ROW_COUNT }, (_, index) => createEmptyEgraLearnerRow(index + 1));
}

function toNumberOrNull(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function roundOne(value: number) {
  return Number(value.toFixed(1));
}

function determineFluencyLevel(storyReadingValue: string) {
  const storyReading = toNumberOrNull(storyReadingValue);
  if (storyReading === null) {
    return "";
  }

  if (storyReading <= 10) {
    return "Non-Reader";
  }
  if (storyReading <= 25) {
    return "Emerging Reader";
  }
  if (storyReading <= 45) {
    return "Developing Reader";
  }
  if (storyReading <= 60) {
    return "Transitional Reader";
  }
  return "Fluent Reader";
}

function rowHasAssessmentData(row: EgraLearnerRow) {
  if (row.learnerId.trim() || row.sex || row.age.trim()) {
    return true;
  }

  return egraMetricLabels.some((metric) => String(row[metric.key]).trim() !== "");
}

function averageMetric(rows: EgraLearnerRow[], metric: EgraMetricKey) {
  const values = rows
    .map((row) => toNumberOrNull(row[metric]))
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return 0;
  }
  return roundOne(values.reduce((total, value) => total + value, 0) / values.length);
}

function computeEgraSummary(rows: EgraLearnerRow[]): EgraSummary {
  const activeRows = rows.filter((row) => rowHasAssessmentData(row));
  const boys = activeRows.filter((row) => row.sex === "M");
  const girls = activeRows.filter((row) => row.sex === "F");

  const boysAverages = createEmptyEgraMetricRecord();
  const girlsAverages = createEmptyEgraMetricRecord();
  const classAverages = createEmptyEgraMetricRecord();

  egraMetricLabels.forEach((metric) => {
    boysAverages[metric.key] = averageMetric(boys, metric.key);
    girlsAverages[metric.key] = averageMetric(girls, metric.key);
    classAverages[metric.key] = averageMetric(activeRows, metric.key);
  });

  const profileCounts = {
    nonReaders: 0,
    emerging: 0,
    developing: 0,
    transitional: 0,
    fluent: 0,
  };

  activeRows.forEach((row) => {
    const level = row.fluencyLevel || determineFluencyLevel(row.storyReading);
    if (level === "Non-Reader") profileCounts.nonReaders += 1;
    if (level === "Emerging Reader") profileCounts.emerging += 1;
    if (level === "Developing Reader") profileCounts.developing += 1;
    if (level === "Transitional Reader") profileCounts.transitional += 1;
    if (level === "Fluent Reader") profileCounts.fluent += 1;
  });

  const total = activeRows.length || 1;
  const percentages = {
    nonReaders: roundOne((profileCounts.nonReaders / total) * 100),
    emerging: roundOne((profileCounts.emerging / total) * 100),
    developing: roundOne((profileCounts.developing / total) * 100),
    transitional: roundOne((profileCounts.transitional / total) * 100),
    fluent: roundOne((profileCounts.fluent / total) * 100),
  };

  return {
    learnersAssessed: activeRows.length,
    averages: {
      boys: boysAverages,
      girls: girlsAverages,
      class: classAverages,
    },
    profile: {
      ...profileCounts,
      percentages,
    },
    rowsForPayload: activeRows.map((row) => ({
      no: row.no,
      learnerId: row.learnerId.trim(),
      sex: row.sex,
      age: toNumberOrNull(row.age),
      letterNames: toNumberOrNull(row.letterNames),
      letterSounds: toNumberOrNull(row.letterSounds),
      realWords: toNumberOrNull(row.realWords),
      madeUpWords: toNumberOrNull(row.madeUpWords),
      storyReading: toNumberOrNull(row.storyReading),
      readingComp: toNumberOrNull(row.readingComp),
      fluencyLevel: row.fluencyLevel || determineFluencyLevel(row.storyReading),
    })),
  };
}

function normalizeSex(value: unknown): "" | "M" | "F" {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "M" || normalized === "F") {
    return normalized;
  }
  return "";
}

function parseEgraRows(raw: unknown): EgraLearnerRow[] {
  const defaults = createDefaultEgraRows();
  if (!Array.isArray(raw)) {
    return defaults;
  }

  return defaults.map((template, index) => {
    const source = raw[index];
    if (!source || typeof source !== "object") {
      return template;
    }
    const entry = source as Record<string, unknown>;
    const storyReading = sanitizeForInput(entry.storyReading);
    const fluencyLevel = sanitizeForInput(entry.fluencyLevel) || determineFluencyLevel(storyReading);

    return {
      no: Number(entry.no ?? template.no) || template.no,
      learnerId: sanitizeForInput(entry.learnerId),
      sex: normalizeSex(entry.sex),
      age: sanitizeForInput(entry.age),
      letterNames: sanitizeForInput(entry.letterNames),
      letterSounds: sanitizeForInput(entry.letterSounds),
      realWords: sanitizeForInput(entry.realWords),
      madeUpWords: sanitizeForInput(entry.madeUpWords),
      storyReading,
      readingComp: sanitizeForInput(entry.readingComp),
      fluencyLevel,
    };
  });
}

export function PortalModuleManager({
  config,
  initialRecords,
  initialSchools,
  initialUsers,
  currentUser,
}: PortalModuleManagerProps) {
  const searchParams = useSearchParams();
  const canReview =
    currentUser.isSupervisor || currentUser.isME || currentUser.isAdmin || currentUser.isSuperAdmin;
  const canExport =
    currentUser.isSupervisor || currentUser.isME || currentUser.isAdmin || currentUser.isSuperAdmin;
  const draftStorageKey = `portal-form-draft-${config.module}`;
  const participantField = useMemo(
    () =>
      config.sections
        .flatMap((section) => section.fields)
        .find((field) => field.type === "participants"),
    [config.sections],
  );

  const [records, setRecords] = useState(initialRecords);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: "idle", message: "" });
  const [filters, setFilters] = useState<FilterState>({
    region: "",
    dateFrom: "",
    dateTo: "",
    district: "",
    school: "",
    status: "",
    createdBy: "",
    programType: "",
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [urlInitialized, setUrlInitialized] = useState(false);
  const [autosaveAt, setAutosaveAt] = useState("");
  const [offlineCount, setOfflineCount] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [gpsSeededSchoolIds, setGpsSeededSchoolIds] = useState<number[]>([]);
  const [egraLearners, setEgraLearners] = useState<EgraLearnerRow[]>(() => createDefaultEgraRows());
  const [trainingParticipants, setTrainingParticipants] = useState<TrainingParticipantRow[]>(
    () => [createEmptyTrainingParticipant()],
  );

  const [formState, setFormState] = useState<FormState>(() => ({
    id: null,
    date: getToday(),
    region: defaultRegion,
    district: "",
    schoolId: "",
    schoolName: "",
    programType: config.programTypeOptions[0]?.value ?? "",
    followUpDate: "",
    status: "Draft",
    reviewNote: "",
    payload: buildDefaultPayload(config),
  }));

  const egraSummary = useMemo(() => computeEgraSummary(egraLearners), [egraLearners]);
  const formDistrictOptions = useMemo(() => {
    if (formState.region) {
      return getDistrictsByRegion(formState.region);
    }
    return allUgandaDistricts;
  }, [formState.region]);
  const filterDistrictOptions = useMemo(() => {
    if (filters.region) {
      return getDistrictsByRegion(filters.region);
    }
    return allUgandaDistricts;
  }, [filters.region]);
  const schoolsById = useMemo(
    () => new Map(initialSchools.map((school) => [school.id, school])),
    [initialSchools],
  );
  const schoolsByName = useMemo(
    () =>
      new Map(
        initialSchools.map((school) => [school.name.trim().toLowerCase(), school]),
      ),
    [initialSchools],
  );
  const formSchoolOptions = useMemo(() => {
    const region = formState.region.trim();
    const district = formState.district.trim().toLowerCase();
    const list = initialSchools.filter((school) => {
      if (district && school.district.trim().toLowerCase() !== district) {
        return false;
      }
      if (!region) {
        return true;
      }
      return inferRegionFromDistrict(school.district) === region;
    });

    return list.sort((left, right) => left.name.localeCompare(right.name));
  }, [formState.district, formState.region, initialSchools]);
  const participantSchoolOptions = useMemo(
    () => [...initialSchools].sort((left, right) => left.name.localeCompare(right.name)),
    [initialSchools],
  );
  const trainingParticipantStats = useMemo(() => {
    const activeRows = trainingParticipants.filter((row) => rowHasTrainingParticipantData(row));
    return {
      total: activeRows.length,
      teachers: activeRows.filter((row) => row.role === "Teacher").length,
      leaders: activeRows.filter((row) => row.role === "Leader").length,
      male: activeRows.filter((row) => row.gender === "Male").length,
      female: activeRows.filter((row) => row.gender === "Female").length,
    };
  }, [trainingParticipants]);
  const followUpMinDate = useMemo(
    () =>
      config.module === "training"
        ? addDaysToDate(formState.date || getToday(), 14)
        : formState.date || getToday(),
    [config.module, formState.date],
  );

  const refreshOfflineCount = useCallback(() => {
    setOfflineCount(readQueue().length);
  }, []);

  const loadEvidence = useCallback(async (recordId: number) => {
    try {
      const params = new URLSearchParams({
        recordId: String(recordId),
        module: config.module,
      });
      const response = await fetch(`/api/portal/evidence?${params.toString()}`);
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { evidence?: EvidenceItem[] };
      setEvidenceItems(data.evidence ?? []);
    } catch {
      // No-op: evidence listing is auxiliary.
    }
  }, [config.module]);

  const getSchoolScopeDefaults = useCallback(
    (schoolId?: number | null) => {
      const school =
        typeof schoolId === "number" && Number.isInteger(schoolId) && schoolId > 0
          ? schoolsById.get(schoolId) ?? null
          : null;

      if (!school) {
        return {
          region: defaultRegion,
          district: "",
          schoolId: "",
          schoolName: "",
        };
      }

      return {
        region: inferRegionFromDistrict(school.district) ?? defaultRegion,
        district: school.district,
        schoolId: String(school.id),
        schoolName: school.name,
      };
    },
    [schoolsById],
  );

  const newFormState = useCallback(
    (options?: { schoolId?: number | null; programType?: string }): FormState => {
      const defaults = buildDefaultPayload(config);
      const schoolDefaults = getSchoolScopeDefaults(options?.schoolId);

      return {
        id: null,
        date: getToday(),
        region: schoolDefaults.region,
        district: schoolDefaults.district,
        schoolId: schoolDefaults.schoolId,
        schoolName: schoolDefaults.schoolName,
        programType:
          options?.programType?.trim() ||
          config.programTypeOptions[0]?.value ||
          "",
        followUpDate: config.module === "training" ? addDaysToDate(getToday(), 14) : "",
        status: "Draft",
        reviewNote: "",
        payload: defaults,
      };
    },
    [config, getSchoolScopeDefaults],
  );

  const openNewForm = useCallback((options?: { schoolId?: number | null; programType?: string }) => {
    const nextForm = newFormState(options);
    setFormState(nextForm);
    setEgraLearners(createDefaultEgraRows());
    setTrainingParticipants([
      createEmptyTrainingParticipant(nextForm.schoolId, nextForm.schoolName),
    ]);
    setIsFormOpen(true);
    setSelectedFiles([]);
    setFileInputKey((value) => value + 1);
    setEvidenceItems([]);
    setFeedback({ kind: "idle", message: "" });
  }, [newFormState]);

  const openRecordForm = useCallback((record: PortalRecord) => {
    const defaultPayload = buildDefaultPayload(config);
    const nextPayload = { ...defaultPayload };
    const matchedSchool =
      (record.schoolId ? schoolsById.get(record.schoolId) : undefined) ??
      initialSchools.find(
        (school) =>
          school.name.trim().toLowerCase() === record.schoolName.trim().toLowerCase() &&
          school.district.trim().toLowerCase() === record.district.trim().toLowerCase(),
      ) ??
      initialSchools.find(
        (school) => school.name.trim().toLowerCase() === record.schoolName.trim().toLowerCase(),
      ) ??
      null;
    const linkedSchoolName = matchedSchool?.name ?? record.schoolName;

    setEgraLearners(createDefaultEgraRows());
    setTrainingParticipants([
      createEmptyTrainingParticipant(
        matchedSchool ? String(matchedSchool.id) : "",
        linkedSchoolName,
      ),
    ]);

    Object.entries(record.payload).forEach(([key, value]) => {
      const field = findField(config, key);
      if (field?.type === "participants") {
        setTrainingParticipants(
          parseTrainingParticipants(value, {
            defaultSchoolId: matchedSchool ? String(matchedSchool.id) : "",
            defaultSchoolName: linkedSchoolName,
            schoolsById,
            schoolsByName,
          }),
        );
        return;
      }

      if (key === "egraLearnersData") {
        if (typeof value === "string" && value.trim()) {
          try {
            setEgraLearners(parseEgraRows(JSON.parse(value)));
          } catch {
            setEgraLearners(createDefaultEgraRows());
          }
        } else {
          setEgraLearners(createDefaultEgraRows());
        }
        return;
      }

      if (Array.isArray(value)) {
        nextPayload[key] = value.map((item) => String(item));
      } else if (value && typeof value === "object") {
        return;
      } else {
        nextPayload[key] = sanitizeForInput(value);
      }
    });

    setFormState({
      id: record.id,
      date: record.date,
      region:
        inferRegionFromDistrict(matchedSchool?.district ?? record.district) ??
        (sanitizeForInput(record.payload.region) || defaultRegion),
      district: matchedSchool?.district ?? record.district,
      schoolId: matchedSchool ? String(matchedSchool.id) : "",
      schoolName: linkedSchoolName,
      programType: record.programType ?? config.programTypeOptions[0]?.value ?? "",
      followUpDate: record.followUpDate ?? "",
      status: record.status,
      reviewNote: record.reviewNote ?? "",
      payload: nextPayload,
    });
    setIsFormOpen(true);
    setSelectedFiles([]);
    setFileInputKey((value) => value + 1);
    setFeedback({ kind: "idle", message: "" });
  }, [config, initialSchools, schoolsById, schoolsByName]);

  const fetchRecords = useCallback(async (nextFilters: FilterState) => {
    setLoadingRecords(true);
    try {
      const params = new URLSearchParams({
        module: config.module,
      });
      if (nextFilters.dateFrom) params.set("dateFrom", nextFilters.dateFrom);
      if (nextFilters.dateTo) params.set("dateTo", nextFilters.dateTo);
      if (nextFilters.district) params.set("district", nextFilters.district);
      if (nextFilters.school) params.set("school", nextFilters.school);
      if (nextFilters.status) params.set("status", nextFilters.status);
      if (nextFilters.createdBy) params.set("createdBy", nextFilters.createdBy);
      if (nextFilters.programType) params.set("programType", nextFilters.programType);

      const response = await fetch(`/api/portal/records?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { error?: string; records?: PortalRecord[] };
      if (!response.ok || !data.records) {
        throw new Error(data.error ?? "Could not load records.");
      }
      setRecords(data.records);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load records.";
      setFeedback({ kind: "error", message });
    } finally {
      setLoadingRecords(false);
    }
  }, [config.module]);

  const syncOfflineQueue = useCallback(async () => {
    const queue = readQueue();
    if (queue.length === 0) {
      setFeedback({ kind: "success", message: "No offline records waiting to sync." });
      return;
    }

    setSyncing(true);
    const pending: OfflineQueueItem[] = [];
    let synced = 0;

    for (const item of queue) {
      try {
        const syncedBody = { ...item.body };
        if (!Number.isInteger(syncedBody.schoolId) || syncedBody.schoolId <= 0) {
          const matchedSchool =
            initialSchools.find(
              (school) =>
                school.name.trim().toLowerCase() ===
                  String(syncedBody.schoolName ?? "")
                    .trim()
                    .toLowerCase() &&
                school.district.trim().toLowerCase() ===
                  String(syncedBody.district ?? "")
                    .trim()
                    .toLowerCase(),
            ) ??
            initialSchools.find(
              (school) =>
                school.name.trim().toLowerCase() ===
                String(syncedBody.schoolName ?? "")
                  .trim()
                  .toLowerCase(),
            ) ??
            null;
          if (matchedSchool) {
            syncedBody.schoolId = matchedSchool.id;
            syncedBody.schoolName = matchedSchool.name;
            syncedBody.district = matchedSchool.district;
          }
        }

        const url =
          item.action === "update" && item.id
            ? `/api/portal/records/${item.id}`
            : "/api/portal/records";
        const method = item.action === "update" ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(syncedBody),
        });

        if (!response.ok) {
          pending.push(item);
          continue;
        }
        synced += 1;
      } catch {
        pending.push(item);
      }
    }

    writeQueue(pending);
    refreshOfflineCount();
    setSyncing(false);

    if (synced > 0) {
      await fetchRecords(filters);
    }

    if (pending.length > 0) {
      setFeedback({
        kind: "error",
        message: `${synced} item(s) synced. ${pending.length} item(s) still queued.`,
      });
      return;
    }

    setFeedback({ kind: "success", message: `Offline queue synced (${synced} item(s)).` });
  }, [fetchRecords, filters, initialSchools, refreshOfflineCount]);

  useEffect(() => {
    refreshOfflineCount();
  }, [refreshOfflineCount]);

  useEffect(() => {
    const onOnline = () => {
      void syncOfflineQueue();
    };
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [syncOfflineQueue]);

  useEffect(() => {
    if (!isFormOpen) {
      return;
    }

    const interval = window.setInterval(() => {
      const snapshot = {
        ...formState,
        egraLearners,
        trainingParticipants,
        module: config.module,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(draftStorageKey, JSON.stringify(snapshot));
      setAutosaveAt(snapshot.savedAt);
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, [config.module, draftStorageKey, formState, egraLearners, isFormOpen, trainingParticipants]);

  useEffect(() => {
    if (config.module !== "training") {
      return;
    }
    if (!formState.schoolId.trim()) {
      return;
    }
    const school = schoolsById.get(Number(formState.schoolId));
    if (!school) {
      return;
    }
    setTrainingParticipants((prev) =>
      prev.map((row) => {
        if (row.schoolAccountId.trim()) {
          return row;
        }
        return {
          ...row,
          schoolAccountId: String(school.id),
          schoolAttachedTo: school.name,
        };
      }),
    );
  }, [config.module, formState.schoolId, schoolsById]);

  useEffect(() => {
    if (urlInitialized) {
      return;
    }

    const recordQuery = searchParams.get("record");
    const isNew = searchParams.get("new") === "1";
    const schoolIdQueryRaw = searchParams.get("schoolId");
    const schoolIdQuery = schoolIdQueryRaw ? Number(schoolIdQueryRaw) : Number.NaN;
    const prefillSchoolId =
      Number.isInteger(schoolIdQuery) && schoolIdQuery > 0 && schoolsById.has(schoolIdQuery)
        ? schoolIdQuery
        : null;
    const prefillProgramType = searchParams.get("programType")?.trim() || undefined;

    if (recordQuery) {
      const targetId = Number(recordQuery);
      if (Number.isInteger(targetId)) {
        const existing = records.find((row) => row.id === targetId);
        if (existing) {
          openRecordForm(existing);
          void loadEvidence(existing.id);
          setUrlInitialized(true);
          return;
        }

        void (async () => {
          try {
            const response = await fetch(`/api/portal/records/${targetId}`, { cache: "no-store" });
            const data = (await response.json()) as { record?: PortalRecord };
            if (response.ok && data.record) {
              openRecordForm(data.record);
              await loadEvidence(data.record.id);
              setUrlInitialized(true);
            }
          } catch {
            // No-op
          }
        })();
      }
      setUrlInitialized(true);
      return;
    }

    if (!isNew) {
      setUrlInitialized(true);
      return;
    }

    const rawDraft = window.localStorage.getItem(draftStorageKey);
    if (rawDraft) {
      try {
        const parsed = JSON.parse(rawDraft) as FormState & {
          module?: string;
          schoolId?: unknown;
          egraLearners?: unknown;
          trainingParticipants?: unknown;
        };
        if (parsed.module === config.module || !parsed.module) {
          const draftSchoolIdValue =
            typeof parsed.schoolId === "number" || typeof parsed.schoolId === "string"
              ? String(parsed.schoolId)
              : "";
          const draftSchoolId =
            draftSchoolIdValue && schoolsById.has(Number(draftSchoolIdValue))
              ? draftSchoolIdValue
              : "";
          const draftSchool =
            (draftSchoolId ? schoolsById.get(Number(draftSchoolId)) : undefined) ??
            initialSchools.find(
              (school) =>
                school.name.trim().toLowerCase() ===
                  String(parsed.schoolName ?? "")
                    .trim()
                    .toLowerCase() &&
                school.district.trim().toLowerCase() ===
                  String(parsed.district ?? "")
                    .trim()
                    .toLowerCase(),
            ) ??
            initialSchools.find(
              (school) =>
                school.name.trim().toLowerCase() ===
                String(parsed.schoolName ?? "")
                  .trim()
                  .toLowerCase(),
            ) ??
            null;
          const schoolPrefill = prefillSchoolId ? schoolsById.get(prefillSchoolId) : null;
          const enforcedSchool = schoolPrefill ?? draftSchool;
          const resolvedProgramType =
            prefillProgramType ||
            parsed.programType ||
            config.programTypeOptions[0]?.value ||
            "";

          setFormState({
            id: parsed.id ?? null,
            date: parsed.date ?? getToday(),
            region:
              parsed.region && getDistrictsByRegion(parsed.region).length > 0
                ? parsed.region
                : inferRegionFromDistrict(
                    enforcedSchool?.district ?? parsed.district ?? "",
                  ) ??
                  defaultRegion,
            district: enforcedSchool?.district ?? parsed.district ?? "",
            schoolId: enforcedSchool ? String(enforcedSchool.id) : draftSchoolId,
            schoolName: enforcedSchool?.name ?? parsed.schoolName ?? "",
            programType: resolvedProgramType,
            followUpDate: parsed.followUpDate ?? "",
            status: parsed.status ?? "Draft",
            reviewNote: parsed.reviewNote ?? "",
            payload: { ...buildDefaultPayload(config), ...(parsed.payload ?? {}) },
          });
          setEgraLearners(parseEgraRows(parsed.egraLearners));
          setTrainingParticipants(
            parseTrainingParticipants(
              parsed.trainingParticipants,
              {
                defaultSchoolId: enforcedSchool ? String(enforcedSchool.id) : draftSchoolId,
                defaultSchoolName: enforcedSchool?.name ?? parsed.schoolName ?? "",
                schoolsById,
                schoolsByName,
              },
            ),
          );
          setIsFormOpen(true);
          setUrlInitialized(true);
          return;
        }
      } catch {
        // No-op
      }
    }

    openNewForm({
      schoolId: prefillSchoolId,
      programType: prefillProgramType,
    });
    setUrlInitialized(true);
  }, [
    config,
    draftStorageKey,
    initialSchools,
    loadEvidence,
    openNewForm,
    openRecordForm,
    records,
    searchParams,
    schoolsById,
    schoolsByName,
    urlInitialized,
  ]);

  const updatePayloadField = useCallback((key: string, value: string | string[]) => {
    setFormState((prev) => ({
      ...prev,
      payload: {
        ...prev.payload,
        [key]: value,
      },
    }));
  }, []);

  const updateEgraLearner = useCallback(
    (index: number, key: keyof Omit<EgraLearnerRow, "no">, value: string) => {
      setEgraLearners((prev) =>
        prev.map((row, rowIndex) => {
          if (rowIndex !== index) {
            return row;
          }

          const updated = {
            ...row,
            [key]:
              key === "sex"
                ? normalizeSex(value)
                : value,
          } as EgraLearnerRow;

          if (key === "storyReading") {
            updated.fluencyLevel = determineFluencyLevel(value);
          }

          return updated;
        }),
      );
    },
    [],
  );

  const updateTrainingParticipant = useCallback(
    (index: number, key: keyof TrainingParticipantRow, value: string) => {
      const schoolForSelection =
        key === "schoolAccountId" && value ? schoolsById.get(Number(value)) ?? null : null;
      if (config.module === "training" && schoolForSelection) {
        setFormState((prev) => ({
          ...prev,
          schoolId: String(schoolForSelection.id),
          schoolName: schoolForSelection.name,
          district: schoolForSelection.district,
          region: inferRegionFromDistrict(schoolForSelection.district) ?? prev.region,
        }));
      }
      setTrainingParticipants((prev) =>
        prev.map((row, rowIndex) => {
          if (rowIndex !== index) {
            return row;
          }
          if (key === "schoolAccountId") {
            return {
              ...row,
              schoolAccountId: value,
              schoolAttachedTo: schoolForSelection?.name ?? "",
            };
          }
          if (key === "role") {
            return { ...row, role: normalizeParticipantRole(value) };
          }
          if (key === "gender") {
            return { ...row, gender: normalizeParticipantGender(value) };
          }
          return { ...row, [key]: value };
        }),
      );
    },
    [config.module, schoolsById],
  );

  const addTrainingParticipant = useCallback(() => {
    const fallbackSchool =
      formState.schoolId && schoolsById.has(Number(formState.schoolId))
        ? schoolsById.get(Number(formState.schoolId))
        : null;
    setTrainingParticipants((prev) => [
      ...prev,
      createEmptyTrainingParticipant(
        fallbackSchool ? String(fallbackSchool.id) : "",
        fallbackSchool?.name ?? "",
      ),
    ]);
  }, [formState.schoolId, schoolsById]);

  const removeTrainingParticipant = useCallback((index: number) => {
    const fallbackSchool =
      formState.schoolId && schoolsById.has(Number(formState.schoolId))
        ? schoolsById.get(Number(formState.schoolId))
        : null;
    setTrainingParticipants((prev) => {
      if (prev.length <= 1) {
        return [
          createEmptyTrainingParticipant(
            fallbackSchool ? String(fallbackSchool.id) : "",
            fallbackSchool?.name ?? "",
          ),
        ];
      }
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  }, [formState.schoolId, schoolsById]);

  const validateForm = useCallback(() => {
    const requiresDistrict = config.module !== "training";
    if (!formState.date || !formState.region.trim() || (requiresDistrict && !formState.district.trim())) {
      return requiresDistrict
        ? "Date, region, and district are required."
        : "Date and region are required.";
    }
    if (!formState.programType.trim()) {
      return `${config.programTypeLabel} is required.`;
    }

    const selectedSchoolId = Number(formState.schoolId);
    const hasSelectedSchool =
      Number.isInteger(selectedSchoolId) && selectedSchoolId > 0 && schoolsById.has(selectedSchoolId);

    if (config.module !== "training") {
      if (!hasSelectedSchool) {
        return "Select a valid school account.";
      }
    }

    if (config.module === "training") {
      const activeRows = trainingParticipants.filter((row) => rowHasTrainingParticipantData(row));
      if (activeRows.length === 0) {
        return "Add at least one participant.";
      }

      const hasLinkedSchool = activeRows.some((row) => {
        if (!row.schoolAccountId.trim()) {
          return false;
        }
        const schoolId = Number(row.schoolAccountId);
        return Number.isInteger(schoolId) && schoolId > 0 && schoolsById.has(schoolId);
      });

      if (!hasLinkedSchool && !hasSelectedSchool) {
        return "At least one participant must be linked to a school account.";
      }

      if (!formState.followUpDate) {
        return "Next follow-up date is required and must be at least 2 weeks after training.";
      }
    }

    if (formState.followUpDate) {
      const minimumDate = config.module === "training" ? addDaysToDate(formState.date, 14) : formState.date;
      if (formState.followUpDate < minimumDate) {
        if (config.module === "training") {
          return "Next follow-up date must be at least 2 weeks after the training date.";
        }
        return "Follow-up date cannot be earlier than the main record date.";
      }
    }

    const startTimeValue = String(formState.payload.startTime ?? "").trim();
    const endTimeValue = String(formState.payload.endTime ?? "").trim();
    if (startTimeValue && endTimeValue && endTimeValue <= startTimeValue) {
      return "End time must be later than start time.";
    }

    const attendedValue =
      config.module === "training"
        ? trainingParticipantStats.total
        : Number(String(formState.payload.numberAttended ?? "").trim() || 0);
    const femaleValue =
      config.module === "training"
        ? trainingParticipantStats.female
        : Number(String(formState.payload.femaleCount ?? "").trim() || 0);
    const maleValue =
      config.module === "training"
        ? trainingParticipantStats.male
        : Number(String(formState.payload.maleCount ?? "").trim() || 0);

    if (attendedValue > 0 && femaleValue + maleValue > attendedValue) {
      return "Female + male attendance cannot exceed total number attended.";
    }

    for (const section of config.sections) {
      for (const field of section.fields) {
        if (!field.required) {
          continue;
        }
        const value = formState.payload[field.key];
        if (field.type === "multiselect") {
          if (!Array.isArray(value) || value.length === 0) {
            return `${field.label} is required.`;
          }
          continue;
        }
        if (field.type === "participants") {
          const activeRows = trainingParticipants.filter((row) =>
            rowHasTrainingParticipantData(row),
          );
          if (activeRows.length === 0) {
            return "Add at least one participant.";
          }

          const validPhone = /^[+0-9()\s-]{7,20}$/;
          for (let index = 0; index < activeRows.length; index += 1) {
            const participant = activeRows[index];
            if (!participant.participantName.trim()) {
              return `Participant ${index + 1}: participant name is required.`;
            }
            if (!participant.schoolAccountId.trim()) {
              return `Participant ${index + 1}: school account is required.`;
            }
            const participantSchoolId = Number(participant.schoolAccountId);
            if (!Number.isInteger(participantSchoolId) || participantSchoolId <= 0 || !schoolsById.has(participantSchoolId)) {
              return `Participant ${index + 1}: select a valid school account.`;
            }
            if (!participant.role) {
              return `Participant ${index + 1}: role is required.`;
            }
            if (!participant.gender) {
              return `Participant ${index + 1}: gender is required.`;
            }
            if (!participant.phoneContact.trim()) {
              return `Participant ${index + 1}: phone contact is required.`;
            }
            if (!validPhone.test(participant.phoneContact.trim())) {
              return `Participant ${index + 1}: phone contact format is invalid.`;
            }
          }
          continue;
        }
        if (field.type === "egraLearners") {
          if (egraSummary.learnersAssessed <= 0) {
            return "Enter at least one learner in the EGRA learner table.";
          }
          continue;
        }
        if (field.type === "egraSummary" || field.type === "egraProfile") {
          continue;
        }
        if (
          config.module === "training" &&
          (field.key === "numberAttended" ||
            field.key === "femaleCount" ||
            field.key === "maleCount")
        ) {
          continue;
        }
        if (!String(value ?? "").trim()) {
          return `${field.label} is required.`;
        }
      }
    }

    return "";
  }, [
    config,
    egraSummary.learnersAssessed,
    formState,
    schoolsById,
    trainingParticipantStats.female,
    trainingParticipantStats.male,
    trainingParticipantStats.total,
    trainingParticipants,
  ]);

  const buildRequestBody = useCallback(
    (nextStatus: PortalRecordStatus) => {
      const selectedSchoolId = Number(formState.schoolId);
      const selectedSchool =
        Number.isInteger(selectedSchoolId) && selectedSchoolId > 0
          ? schoolsById.get(selectedSchoolId) ?? null
          : null;

      const payload: Record<string, string | number | boolean | string[] | null | undefined> = {};

      Object.entries(formState.payload).forEach(([key, value]) => {
        const field = findField(config, key);
        if (!field) {
          return;
        }

        if (
          field.type === "participants" ||
          field.type === "egraLearners" ||
          field.type === "egraSummary" ||
          field.type === "egraProfile"
        ) {
          return;
        }

        if (field.type === "multiselect") {
          payload[key] = Array.isArray(value) ? value : [];
          return;
        }

        if (field.type === "number") {
          const raw = String(value ?? "").trim();
          payload[key] = raw ? Number(raw) : 0;
          return;
        }

        payload[key] = String(value ?? "").trim();
      });

      if (formState.region.trim()) {
        payload.region = formState.region.trim();
      }

      if (participantField) {
        const participantRows = trainingParticipants
          .filter((row) => rowHasTrainingParticipantData(row))
          .map((row) => {
            const mappedSchool =
              (row.schoolAccountId.trim()
                ? schoolsById.get(Number(row.schoolAccountId.trim()))
                : null) ??
              selectedSchool ??
              null;
            return {
              participantName: row.participantName.trim(),
              schoolAttachedTo: mappedSchool?.name ?? row.schoolAttachedTo.trim(),
              schoolAccountId: mappedSchool?.id ?? null,
              schoolAccountCode: mappedSchool?.schoolCode ?? null,
              role: row.role,
              gender: row.gender,
              phoneContact: row.phoneContact.trim(),
            };
          });

        const primaryParticipantSchool =
          participantRows
            .map((row) =>
              typeof row.schoolAccountId === "number" && Number.isInteger(row.schoolAccountId)
                ? schoolsById.get(row.schoolAccountId) ?? null
                : null,
            )
            .find((school) => Boolean(school)) ?? null;
        const resolvedPrimarySchool =
          config.module === "training"
            ? primaryParticipantSchool ?? selectedSchool
            : selectedSchool;

        const resolvedSchoolName =
          resolvedPrimarySchool?.name ??
          (formState.schoolName.trim() || "Training Cluster");
        const resolvedDistrict =
          resolvedPrimarySchool?.district ?? formState.district.trim();

        payload[participantField.key] = JSON.stringify(participantRows);
        payload.participantsTotal = participantRows.length;
        payload.classroomTeachers = participantRows.filter((row) => row.role === "Teacher").length;
        payload.schoolLeaders = participantRows.filter((row) => row.role === "Leader").length;
        payload.femaleCount = participantRows.filter((row) => row.gender === "Female").length;
        payload.maleCount = participantRows.filter((row) => row.gender === "Male").length;
        payload.numberAttended = participantRows.length;

        return {
          module: config.module,
          date: formState.date,
          district: resolvedDistrict,
          schoolId:
            resolvedPrimarySchool?.id ??
            (Number.isInteger(selectedSchoolId) ? selectedSchoolId : 0),
          schoolName: resolvedSchoolName,
          programType: formState.programType.trim(),
          followUpDate: formState.followUpDate.trim() || undefined,
          status: nextStatus,
          payload,
        };
      }

      if (config.module === "assessment") {
        payload.egraLearnersData = JSON.stringify(egraSummary.rowsForPayload);
        payload.egraSummaryData = JSON.stringify(egraSummary.averages);
        payload.egraProfileData = JSON.stringify(egraSummary.profile);
        payload.learnersAssessed = egraSummary.learnersAssessed;
        payload.nonReaders = egraSummary.profile.nonReaders;
        payload.emergingReaders = egraSummary.profile.emerging;
        payload.developingReaders = egraSummary.profile.developing;
        payload.transitionalReaders = egraSummary.profile.transitional;
        payload.fluentReaders = egraSummary.profile.fluent;
        payload.wcpmAverage = egraSummary.averages.class.storyReading;
        payload.comprehensionAverage = egraSummary.averages.class.readingComp;
        if (typeof payload.storiesPublished !== "number") {
          payload.storiesPublished = 0;
        }
      }

      if (config.module === "visit") {
        if (selectedSchool?.gpsLat?.trim() && selectedSchool?.gpsLng?.trim()) {
          payload.schoolGpsLat = selectedSchool.gpsLat.trim();
          payload.schoolGpsLng = selectedSchool.gpsLng.trim();
          payload.schoolGpsSource = "school_profile";
        }

        const observationRatings = Object.entries(payload).filter(
          ([key, value]) => isVisitObservationField(key) && typeof value === "string" && value,
        );
        const observationItemsScored = observationRatings.length;
        const observationScore = observationRatings.reduce(
          (total, [, rating]) =>
            total + (visitObservationScoreByRating[String(rating)] ?? 0),
          0,
        );
        const observationMaxScore = observationItemsScored * 5;
        const observationScorePercent =
          observationMaxScore > 0
            ? roundOne((observationScore / observationMaxScore) * 100)
            : 0;

        payload.observationItemsScored = observationItemsScored;
        payload.observationScore = observationScore;
        payload.observationMaxScore = observationMaxScore;
        payload.observationScorePercent = observationScorePercent;
        payload.observationSatisfactory = observationScorePercent >= 60;
        payload.observationScoreGuide = "Very Good=5, Good=3, Fair=1, Can Improve=0";
      }

      const resolvedSchoolName = selectedSchool?.name ?? formState.schoolName.trim();
      const resolvedDistrict = selectedSchool?.district ?? formState.district.trim();

      return {
        module: config.module,
        date: formState.date,
        district: resolvedDistrict,
        schoolId: selectedSchool?.id ?? (Number.isInteger(selectedSchoolId) ? selectedSchoolId : 0),
        schoolName: resolvedSchoolName,
        programType: formState.programType.trim(),
        followUpDate: formState.followUpDate.trim() || undefined,
        status: nextStatus,
        payload,
      };
    },
    [config, egraSummary, formState, participantField, schoolsById, trainingParticipants],
  );

  const enrichVisitGps = useCallback(
    async (inputBody: ReturnType<typeof buildRequestBody>) => {
      if (config.module !== "visit") {
        return inputBody;
      }

      const schoolId = Number(inputBody.schoolId);
      if (!Number.isInteger(schoolId) || schoolId <= 0) {
        return inputBody;
      }

      const selectedSchool = schoolsById.get(schoolId);
      if (!selectedSchool) {
        return inputBody;
      }

      const payload = { ...inputBody.payload };
      const schoolHasGps = Boolean(
        selectedSchool.gpsLat?.trim() && selectedSchool.gpsLng?.trim(),
      );

      if (schoolHasGps) {
        payload.schoolGpsLat = selectedSchool.gpsLat?.trim() || "";
        payload.schoolGpsLng = selectedSchool.gpsLng?.trim() || "";
        payload.schoolGpsSource = "school_profile";
        return {
          ...inputBody,
          payload,
        };
      }

      if (gpsSeededSchoolIds.includes(schoolId)) {
        return {
          ...inputBody,
          payload,
        };
      }

      try {
        const coordinates = await requestBrowserCoordinates();
        const latitude = coordinates.latitude.toFixed(6);
        const longitude = coordinates.longitude.toFixed(6);

        payload.visitGpsLat = latitude;
        payload.visitGpsLng = longitude;
        payload.visitGpsAccuracyMeters =
          coordinates.accuracy !== null ? Number(coordinates.accuracy.toFixed(1)) : null;
        payload.visitGpsCapturedAt = new Date().toISOString();
        payload.visitGpsSource = "browser_geolocation";
        payload.schoolGpsLat = latitude;
        payload.schoolGpsLng = longitude;
        payload.schoolGpsSource = "visit_auto_capture";

        const response = await fetch("/api/portal/schools", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId,
            gpsLat: latitude,
            gpsLng: longitude,
          }),
        });

        if (response.ok) {
          setGpsSeededSchoolIds((prev) =>
            prev.includes(schoolId) ? prev : [...prev, schoolId],
          );
        }
      } catch {
        // Keep submission moving even if GPS permission is denied.
      }

      return {
        ...inputBody,
        payload,
      };
    },
    [config.module, gpsSeededSchoolIds, schoolsById],
  );

  const uploadEvidence = useCallback(
    async (recordId: number, body: ReturnType<typeof buildRequestBody>) => {
      if (selectedFiles.length === 0) {
        return;
      }

      for (const file of selectedFiles) {
        const evidenceForm = new FormData();
        evidenceForm.append("file", file);
        evidenceForm.append("module", config.module);
        evidenceForm.append("date", body.date);
        evidenceForm.append("schoolName", body.schoolName);
        evidenceForm.append("recordId", String(recordId));

        const response = await fetch("/api/portal/evidence", {
          method: "POST",
          body: evidenceForm,
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Evidence upload failed.");
        }
      }

      setSelectedFiles([]);
      setFileInputKey((value) => value + 1);
      await loadEvidence(recordId);
    },
    [buildRequestBody, config.module, loadEvidence, selectedFiles],
  );

  const submitRecord = useCallback(
    async (nextStatus: PortalRecordStatus) => {
      const validationError = validateForm();
      if (validationError) {
        setFeedback({ kind: "error", message: validationError });
        return;
      }

      const draftBody = buildRequestBody(nextStatus);
      setSaving(true);
      setFeedback({
        kind: "success",
        message: nextStatus === "Draft" ? "Saving draft..." : "Submitting record...",
      });

      try {
        const body = await enrichVisitGps(draftBody);
        const endpoint = formState.id ? `/api/portal/records/${formState.id}` : "/api/portal/records";
        const method = formState.id ? "PUT" : "POST";
        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await response.json()) as { error?: string; record?: PortalRecord };

        if (!response.ok || !data.record) {
          throw new Error(data.error ?? "Could not save record.");
        }

        const saved = data.record;
        setRecords((prev) => {
          const exists = prev.some((item) => item.id === saved.id);
          if (exists) {
            return prev.map((item) => (item.id === saved.id ? saved : item));
          }
          return [saved, ...prev];
        });
        setFormState((prev) => ({
          ...prev,
          id: saved.id,
          status: saved.status,
          reviewNote: saved.reviewNote ?? prev.reviewNote,
        }));
        window.localStorage.removeItem(draftStorageKey);

        await uploadEvidence(saved.id, body);

        setFeedback({
          kind: "success",
          message:
            nextStatus === "Draft"
              ? `Draft saved as ${saved.recordCode}.`
              : `Record submitted as ${saved.recordCode}.`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save record.";
        const offline = typeof navigator !== "undefined" && !navigator.onLine;

        if (offline) {
          const queue = readQueue();
          queue.push({
            action: formState.id ? "update" : "create",
            id: formState.id ?? undefined,
            body: draftBody,
          });
          writeQueue(queue);
          refreshOfflineCount();
          setFeedback({
            kind: "error",
            message: "No network connection. Record stored in offline queue for sync.",
          });
        } else {
          setFeedback({ kind: "error", message });
        }
      } finally {
        setSaving(false);
      }
    },
    [
      buildRequestBody,
      draftStorageKey,
      enrichVisitGps,
      formState.id,
      refreshOfflineCount,
      uploadEvidence,
      validateForm,
    ],
  );

  const submitReviewStatus = useCallback(
    async (nextStatus: PortalRecordStatus) => {
      if (!formState.id) {
        return;
      }
      setSaving(true);
      try {
        const response = await fetch(`/api/portal/records/${formState.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            reviewNote: formState.reviewNote,
          }),
        });
        const data = (await response.json()) as { error?: string; record?: PortalRecord };
        if (!response.ok || !data.record) {
          throw new Error(data.error ?? "Could not update status.");
        }

        setRecords((prev) => prev.map((item) => (item.id === data.record?.id ? data.record : item)));
        setFormState((prev) => ({
          ...prev,
          status: data.record?.status ?? prev.status,
        }));
        setFeedback({
          kind: "success",
          message: `Record ${data.record.recordCode} marked ${data.record.status}.`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update status.";
        setFeedback({ kind: "error", message });
      } finally {
        setSaving(false);
      }
    },
    [formState.id, formState.reviewNote],
  );

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams({
      module: config.module,
    });
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.district) params.set("district", filters.district);
    if (filters.school) params.set("school", filters.school);
    if (filters.status) params.set("status", filters.status);
    if (filters.createdBy) params.set("createdBy", filters.createdBy);
    if (filters.programType) params.set("programType", filters.programType);
    return `/api/portal/records/export?${params.toString()}`;
  }, [config.module, filters]);

  const handleFiltersSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await fetchRecords(filters);
    },
    [fetchRecords, filters],
  );

  const resetFilters = useCallback(async () => {
    const empty: FilterState = {
      region: "",
      dateFrom: "",
      dateTo: "",
      district: "",
      school: "",
      status: "",
      createdBy: "",
      programType: "",
    };
    setFilters(empty);
    await fetchRecords(empty);
  }, [fetchRecords]);

  return (
    <>
      <section className="card portal-module-header">
        <div>
          <h2>{config.pageTitle}</h2>
          <p>{config.description}</p>
          <p className="portal-muted">Fields marked with * are required.</p>
        </div>
        <div className="action-row">
          <button className="button" type="button" onClick={() => openNewForm()}>
            {config.newLabel}
          </button>
          <button className="button button-ghost" type="button" onClick={() => void syncOfflineQueue()} disabled={syncing}>
            {syncing ? "Syncing..." : `Sync Offline (${offlineCount})`}
          </button>
        </div>
      </section>

      <section className="card portal-filter-card">
        <form className="portal-filter-grid portal-filter-grid-pretty" onSubmit={handleFiltersSubmit}>
          <label className="portal-filter-field">
            <span className="portal-filter-field-label">Date from</span>
            <span className="portal-filter-field-hint">dd/mm/yyyy</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
            />
          </label>
          <label className="portal-filter-field">
            <span className="portal-filter-field-label">Date to</span>
            <span className="portal-filter-field-hint">dd/mm/yyyy</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
            />
          </label>
          <label className="portal-filter-field">
            <span className="portal-filter-field-label">Region</span>
            <select
              value={filters.region}
              onChange={(event) =>
                setFilters((prev) => {
                  const nextRegion = event.target.value;
                  const nextDistrictOptions = nextRegion
                    ? getDistrictsByRegion(nextRegion)
                    : allUgandaDistricts;
                  return {
                    ...prev,
                    region: nextRegion,
                    district: nextDistrictOptions.includes(prev.district) ? prev.district : "",
                  };
                })
              }
            >
              <option value="">All regions</option>
              {ugandaRegions.map((entry) => (
                <option key={entry.region} value={entry.region}>
                  {entry.region}
                </option>
              ))}
            </select>
          </label>
          <label className="portal-filter-field">
            <span className="portal-filter-field-label">District</span>
            <select
              value={filters.district}
              onChange={(event) => setFilters((prev) => ({ ...prev, district: event.target.value }))}
            >
              <option value="">All districts</option>
              {filterDistrictOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>
          <label className="portal-filter-field">
            <span className="portal-filter-field-label">School</span>
            <input
              placeholder="School name"
              value={filters.school}
              onChange={(event) => setFilters((prev) => ({ ...prev, school: event.target.value }))}
            />
          </label>
          <label className="portal-filter-field">
            <span className="portal-filter-field-label">Status</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">All</option>
              {portalStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="portal-filter-field">
            <span className="portal-filter-field-label">Created by</span>
            <select
              value={filters.createdBy}
              onChange={(event) => setFilters((prev) => ({ ...prev, createdBy: event.target.value }))}
              disabled={!canReview}
            >
              <option value="">All</option>
              {initialUsers.map((user) => (
                <option key={user.id} value={String(user.id)}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="portal-filter-field">
            <span className="portal-filter-field-label">Program type</span>
            <input
              placeholder="e.g. Coaching"
              value={filters.programType}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, programType: event.target.value }))
              }
            />
          </label>

          <div className="action-row portal-filter-actions">
            <button className="button" type="submit" disabled={loadingRecords}>
              {loadingRecords ? "Applying..." : "Apply"}
            </button>
            <button className="button button-ghost" type="button" onClick={() => void resetFilters()}>
              Reset
            </button>
            {canExport ? (
              <a href={exportUrl} className="button button-ghost">
                Export
              </a>
            ) : null}
          </div>
        </form>
      </section>

      {feedback.message ? (
        <p
          role="status"
          className={`form-message ${feedback.kind === "error" ? "error" : "success"}`}
        >
          {feedback.message}
        </p>
      ) : null}

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>District</th>
                <th>School</th>
                <th>Type</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8}>No records found for this module.</td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.recordCode}</td>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                    <td>{record.district}</td>
                    <td>{record.schoolName}</td>
                    <td>{record.programType ?? "-"}</td>
                    <td>{record.status}</td>
                    <td>{new Date(record.updatedAt).toLocaleString()}</td>
                    <td>
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => {
                          openRecordForm(record);
                          void loadEvidence(record.id);
                        }}
                      >
                        View/Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isFormOpen ? (
        <section className="card portal-form-card">
          <div className="portal-form-header">
            <div>
              <h2>
                {config.pageTitle} Form {formState.id ? `(${records.find((row) => row.id === formState.id)?.recordCode ?? `#${formState.id}`})` : ""}
              </h2>
              <p>Status: {formState.status}</p>
              {autosaveAt ? (
                <p className="portal-muted">
                  Autosaved at {new Date(autosaveAt).toLocaleTimeString()}
                </p>
              ) : null}
            </div>
            <button className="button button-ghost" type="button" onClick={() => setIsFormOpen(false)}>
              Close form
            </button>
          </div>

          <form className="form-grid portal-form-grid" onSubmit={(event) => event.preventDefault()}>
            <label>
              {renderLabel("Date", true)}
              <input
                type="date"
                value={formState.date}
                onChange={(event) =>
                  setFormState((prev) => {
                    const nextDate = event.target.value;
                    if (!nextDate) {
                      return { ...prev, date: nextDate };
                    }

                    if (config.module === "training") {
                      const minimumFollowUp = addDaysToDate(nextDate, 14);
                      const nextFollowUp =
                        prev.followUpDate && prev.followUpDate >= minimumFollowUp
                          ? prev.followUpDate
                          : minimumFollowUp;
                      return {
                        ...prev,
                        date: nextDate,
                        followUpDate: nextFollowUp,
                      };
                    }

                    if (prev.followUpDate && prev.followUpDate < nextDate) {
                      return { ...prev, date: nextDate, followUpDate: nextDate };
                    }

                    return { ...prev, date: nextDate };
                  })
                }
                required
              />
            </label>
            <label>
              {renderLabel("Region", true)}
              <select
                value={formState.region}
                onChange={(event) =>
                  setFormState((prev) => {
                    const nextRegion = event.target.value;
                    const options = getDistrictsByRegion(nextRegion);
                    const nextDistrict = options.includes(prev.district) ? prev.district : "";
                    const selectedSchool = prev.schoolId
                      ? schoolsById.get(Number(prev.schoolId))
                      : undefined;
                    const keepSchool = Boolean(
                      selectedSchool &&
                        (!nextRegion ||
                          inferRegionFromDistrict(selectedSchool.district) === nextRegion) &&
                        (!nextDistrict || selectedSchool.district === nextDistrict),
                    );
                    return {
                      ...prev,
                      region: nextRegion,
                      district: nextDistrict,
                      schoolId: keepSchool ? prev.schoolId : "",
                      schoolName: keepSchool ? selectedSchool?.name ?? prev.schoolName : "",
                    };
                  })
                }
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
              {renderLabel("District", true)}
              <select
                value={formState.district}
                onChange={(event) =>
                  setFormState((prev) => {
                    const nextDistrict = event.target.value;
                    const selectedSchool = prev.schoolId
                      ? schoolsById.get(Number(prev.schoolId))
                      : undefined;
                    const keepSchool = Boolean(
                      selectedSchool &&
                        (!nextDistrict || selectedSchool.district === nextDistrict),
                    );
                    return {
                      ...prev,
                      district: nextDistrict,
                      schoolId: keepSchool ? prev.schoolId : "",
                      schoolName: keepSchool ? selectedSchool?.name ?? prev.schoolName : "",
                    };
                  })
                }
                required
              >
                <option value="">Select district</option>
                {formDistrictOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
            {config.module !== "training" ? (
              <label>
                {renderLabel("School Account", true)}
                <select
                  value={formState.schoolId}
                  onChange={(event) =>
                    setFormState((prev) => {
                      const nextSchoolId = event.target.value;
                      const selectedSchool = nextSchoolId
                        ? schoolsById.get(Number(nextSchoolId))
                        : undefined;

                      return {
                        ...prev,
                        schoolId: nextSchoolId,
                        schoolName: selectedSchool?.name ?? "",
                        district: selectedSchool?.district ?? prev.district,
                        region: selectedSchool
                          ? inferRegionFromDistrict(selectedSchool.district) ?? prev.region
                          : prev.region,
                      };
                    })
                  }
                  required
                >
                  <option value="">Select school account</option>
                  {formSchoolOptions.map((school) => (
                    <option key={school.id} value={String(school.id)}>
                      {school.name} ({school.schoolCode})
                    </option>
                  ))}
                </select>
                {formSchoolOptions.length === 0 ? (
                  <span className="portal-muted">
                    No school account matches the selected region/district.
                  </span>
                ) : null}
              </label>
            ) : null}
            <label>
              {renderLabel(config.programTypeLabel, true)}
              <select
                value={formState.programType}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, programType: event.target.value }))
                }
                required
              >
                <option value="">Select</option>
                {config.programTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {renderLabel(
                config.module === "training"
                  ? "Next follow-up date (minimum 2 weeks)"
                  : "Follow-up date",
              )}
              <input
                type="date"
                value={formState.followUpDate}
                min={followUpMinDate}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, followUpDate: event.target.value }))
                }
                required={config.module === "training"}
              />
            </label>
            <label>
              {renderLabel("Workflow status")}
              <input value={formState.status} readOnly />
            </label>

            {config.sections.map((section) => (
              <fieldset key={section.id} className="card full-width portal-form-section">
                <legend>{section.title}</legend>
                <div className="form-grid">
                  {section.fields.map((field) => {
                    const value = formState.payload[field.key];
                    if (field.type === "egraLearners") {
                      return (
                        <div key={field.key} className="full-width">
                          <p>
                            Enter learner-level scores exactly as captured on the EGRA baseline sheet.
                          </p>
                          <div className="table-wrap egra-table-wrap">
                            <table className="egra-table">
                              <thead>
                                <tr>
                                  <th>No</th>
                                  <th>Learner ID</th>
                                  <th>Sex (M/F)</th>
                                  <th>Age</th>
                                  <th>Letter Names</th>
                                  <th>Letter Sounds</th>
                                  <th>Real Words</th>
                                  <th>Made-up Words</th>
                                  <th>Story Reading</th>
                                  <th>Reading Comp.</th>
                                  <th>Fluency Level</th>
                                </tr>
                              </thead>
                              <tbody>
                                {egraLearners.map((row, index) => (
                                  <tr key={row.no}>
                                    <td>{row.no}</td>
                                    <td>
                                      <input
                                        value={row.learnerId}
                                        onChange={(event) =>
                                          updateEgraLearner(index, "learnerId", event.target.value)
                                        }
                                      />
                                    </td>
                                    <td>
                                      <select
                                        value={row.sex}
                                        onChange={(event) =>
                                          updateEgraLearner(index, "sex", event.target.value)
                                        }
                                      >
                                        <option value="">-</option>
                                        <option value="M">M</option>
                                        <option value="F">F</option>
                                      </select>
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        value={row.age}
                                        onChange={(event) =>
                                          updateEgraLearner(index, "age", event.target.value)
                                        }
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        value={row.letterNames}
                                        onChange={(event) =>
                                          updateEgraLearner(index, "letterNames", event.target.value)
                                        }
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        value={row.letterSounds}
                                        onChange={(event) =>
                                          updateEgraLearner(index, "letterSounds", event.target.value)
                                        }
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        value={row.realWords}
                                        onChange={(event) =>
                                          updateEgraLearner(index, "realWords", event.target.value)
                                        }
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        value={row.madeUpWords}
                                        onChange={(event) =>
                                          updateEgraLearner(index, "madeUpWords", event.target.value)
                                        }
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        value={row.storyReading}
                                        onChange={(event) =>
                                          updateEgraLearner(index, "storyReading", event.target.value)
                                        }
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        value={row.readingComp}
                                        onChange={(event) =>
                                          updateEgraLearner(index, "readingComp", event.target.value)
                                        }
                                      />
                                    </td>
                                    <td>{row.fluencyLevel || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="portal-egra-legend">
                            <span>Non-Reader: 0-10 CWPM</span>
                            <span>Emerging: 11-25 CWPM</span>
                            <span>Developing: 26-45 CWPM</span>
                            <span>Transitional: 46-60 CWPM</span>
                            <span>Fluent: 61+ CWPM</span>
                          </div>
                          {field.helperText ? <small>{field.helperText}</small> : null}
                        </div>
                      );
                    }

                    if (field.type === "egraSummary") {
                      return (
                        <div key={field.key} className="full-width table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Baseline Snapshot</th>
                                <th>Boys Avg</th>
                                <th>Girls Avg</th>
                                <th>Class Avg</th>
                              </tr>
                            </thead>
                            <tbody>
                              {egraMetricLabels.map((metric) => (
                                <tr key={metric.key}>
                                  <td>{metric.label}</td>
                                  <td>{egraSummary.averages.boys[metric.key].toFixed(1)}</td>
                                  <td>{egraSummary.averages.girls[metric.key].toFixed(1)}</td>
                                  <td>{egraSummary.averages.class[metric.key].toFixed(1)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    }

                    if (field.type === "egraProfile") {
                      return (
                        <div key={field.key} className="full-width table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Reading Level</th>
                                <th>No. Learners</th>
                                <th>% Class</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>{egraLevelLabels[0]}</td>
                                <td>{egraSummary.profile.nonReaders}</td>
                                <td>{egraSummary.profile.percentages.nonReaders.toFixed(1)}%</td>
                              </tr>
                              <tr>
                                <td>{egraLevelLabels[1]}</td>
                                <td>{egraSummary.profile.emerging}</td>
                                <td>{egraSummary.profile.percentages.emerging.toFixed(1)}%</td>
                              </tr>
                              <tr>
                                <td>{egraLevelLabels[2]}</td>
                                <td>{egraSummary.profile.developing}</td>
                                <td>{egraSummary.profile.percentages.developing.toFixed(1)}%</td>
                              </tr>
                              <tr>
                                <td>{egraLevelLabels[3]}</td>
                                <td>{egraSummary.profile.transitional}</td>
                                <td>{egraSummary.profile.percentages.transitional.toFixed(1)}%</td>
                              </tr>
                              <tr>
                                <td>{egraLevelLabels[4]}</td>
                                <td>{egraSummary.profile.fluent}</td>
                                <td>{egraSummary.profile.percentages.fluent.toFixed(1)}%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    }

                    if (field.type === "participants") {
                      return (
                        <div key={field.key} className="full-width portal-participants-block">
                          <div className="portal-participants-header">
                            {renderLabel(field.label, field.required)}
                            <button
                              className="button button-ghost"
                              type="button"
                              onClick={addTrainingParticipant}
                            >
                              + Add participant
                            </button>
                          </div>
                          <div className="table-wrap">
                            <table className="portal-participants-table">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Participant Name</th>
                                  <th>School ID</th>
                                  <th>School Attached To</th>
                                  <th>Role</th>
                                  <th>Gender</th>
                                  <th>Phone Contact</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {trainingParticipants.map((row, index) => (
                                  <tr key={`participant-${index + 1}`}>
                                    <td>{index + 1}</td>
                                    <td>
                                      <input
                                        value={row.participantName}
                                        placeholder="Full name"
                                        onChange={(event) =>
                                          updateTrainingParticipant(
                                            index,
                                            "participantName",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </td>
                                    <td>
                                      {row.schoolAccountId
                                        ? schoolsById.get(Number(row.schoolAccountId))?.schoolCode ?? "-"
                                        : "-"}
                                    </td>
                                    <td>
                                      <select
                                        value={row.schoolAccountId}
                                        onChange={(event) =>
                                          updateTrainingParticipant(
                                            index,
                                            "schoolAccountId",
                                            event.target.value,
                                          )
                                        }
                                      >
                                        <option value="">Select school account</option>
                                        {participantSchoolOptions.map((school) => (
                                          <option key={school.id} value={String(school.id)}>
                                            {school.name} ({school.schoolCode})
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td>
                                      <select
                                        value={row.role}
                                        onChange={(event) =>
                                          updateTrainingParticipant(index, "role", event.target.value)
                                        }
                                      >
                                        <option value="">Select role</option>
                                        <option value="Teacher">Teacher</option>
                                        <option value="Leader">Leader</option>
                                      </select>
                                    </td>
                                    <td>
                                      <select
                                        value={row.gender}
                                        onChange={(event) =>
                                          updateTrainingParticipant(index, "gender", event.target.value)
                                        }
                                      >
                                        <option value="">Select gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                      </select>
                                    </td>
                                    <td>
                                      <input
                                        value={row.phoneContact}
                                        placeholder="+2567xxxxxxxx"
                                        inputMode="tel"
                                        onChange={(event) =>
                                          updateTrainingParticipant(
                                            index,
                                            "phoneContact",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </td>
                                    <td>
                                      <button
                                        className="button button-ghost"
                                        type="button"
                                        onClick={() => removeTrainingParticipant(index)}
                                      >
                                        Remove
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {field.helperText ? (
                            <small className="portal-field-help">{field.helperText}</small>
                          ) : null}
                        </div>
                      );
                    }

                    if (field.type === "textarea") {
                      return (
                        <label key={field.key} className="full-width">
                          {renderLabel(field.label, field.required)}
                          <textarea
                            rows={4}
                            value={Array.isArray(value) ? value.join(", ") : sanitizeForInput(value)}
                            placeholder={inferPlaceholder(field)}
                            onChange={(event) => updatePayloadField(field.key, event.target.value)}
                            required={field.required}
                          />
                          {field.helperText ? (
                            <small className="portal-field-help">{field.helperText}</small>
                          ) : null}
                        </label>
                      );
                    }

                    if (field.type === "select") {
                      return (
                        <label key={field.key}>
                          {renderLabel(field.label, field.required)}
                          <select
                            value={Array.isArray(value) ? value[0] ?? "" : sanitizeForInput(value)}
                            onChange={(event) => updatePayloadField(field.key, event.target.value)}
                            required={field.required}
                          >
                            <option value="">Select</option>
                            {(field.options ?? []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    }

                    if (field.type === "multiselect") {
                      const selected = Array.isArray(value) ? value : [];
                      return (
                        <fieldset key={field.key} className="card full-width portal-form-options">
                          <legend>
                            {field.label}
                            {field.required ? " *" : ""}
                          </legend>
                          <div className="portal-multiselect">
                            {(field.options ?? []).map((option) => {
                              const checked = selected.includes(option.value);
                              return (
                                <label key={option.value}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => {
                                      const next = new Set(selected);
                                      if (event.target.checked) {
                                        next.add(option.value);
                                      } else {
                                        next.delete(option.value);
                                      }
                                      updatePayloadField(field.key, Array.from(next));
                                    }}
                                  />
                                  <span>{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                      );
                    }

                    return (
                      <label key={field.key}>
                        {renderLabel(field.label, field.required)}
                        {(() => {
                          const isTrainingAutoAttendanceField =
                            config.module === "training" &&
                            (field.key === "numberAttended" ||
                              field.key === "femaleCount" ||
                              field.key === "maleCount");
                          const computedValue =
                            field.key === "numberAttended"
                              ? String(trainingParticipantStats.total)
                              : field.key === "femaleCount"
                                ? String(trainingParticipantStats.female)
                                : field.key === "maleCount"
                                  ? String(trainingParticipantStats.male)
                                  : Array.isArray(value)
                                    ? value.join(", ")
                                    : sanitizeForInput(value);

                          return (
                            <input
                              type={inferInputType(field)}
                              min={isNumberField(field) ? field.min : undefined}
                              max={isNumberField(field) ? field.max : undefined}
                              step={isNumberField(field) ? field.step ?? 1 : undefined}
                              inputMode={inferInputMode(field)}
                              autoComplete={inferAutoComplete(field)}
                              value={computedValue}
                              placeholder={inferPlaceholder(field)}
                              onChange={(event) =>
                                updatePayloadField(field.key, event.target.value)
                              }
                              required={field.required}
                              readOnly={isTrainingAutoAttendanceField}
                            />
                          );
                        })()}
                        {field.helperText ? (
                          <small className="portal-field-help">{field.helperText}</small>
                        ) : null}
                        {config.module === "training" &&
                        (field.key === "numberAttended" ||
                          field.key === "femaleCount" ||
                          field.key === "maleCount") ? (
                          <small className="portal-field-help">
                            Auto-calculated from participant entries.
                          </small>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <fieldset className="card full-width portal-form-section">
              <legend>Evidence Locker</legend>
              <div className="form-grid">
                <label className="full-width">
                  {renderLabel("Attach files (photo/video/PDF/document)")}
                  <input
                    key={fileInputKey}
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    multiple
                    onChange={(event) =>
                      setSelectedFiles(event.target.files ? Array.from(event.target.files) : [])
                    }
                  />
                  <small className="portal-field-help">
                    Files are uploaded after Save Draft or Submit.
                  </small>
                </label>
                <div className="full-width">
                  {selectedFiles.length > 0 ? (
                    <div>
                      <p>{selectedFiles.length} file(s) selected.</p>
                      <ul className="portal-file-list">
                        {selectedFiles.map((file) => (
                          <li key={`${file.name}-${file.size}`}>
                            {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p>No new files selected.</p>
                  )}
                </div>
                {evidenceItems.length > 0 ? (
                  <div className="full-width table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>File</th>
                          <th>Uploaded</th>
                          <th>Download</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evidenceItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.fileName}</td>
                            <td>{new Date(item.createdAt).toLocaleString()}</td>
                            <td>
                              <a href={item.downloadUrl}>Download</a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </fieldset>

            {canReview && formState.id ? (
              <label className="full-width">
                {renderLabel("Supervisor review note")}
                <textarea
                  rows={2}
                  value={formState.reviewNote}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, reviewNote: event.target.value }))
                  }
                />
              </label>
            ) : null}

            <div className="full-width action-row portal-form-actions">
              <button className="button" type="button" disabled={saving} onClick={() => void submitRecord("Draft")}>
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                className="button button-ghost"
                type="button"
                disabled={saving}
                onClick={() => void submitRecord("Submitted")}
              >
                {saving ? "Saving..." : "Submit"}
              </button>
              {canReview && formState.id ? (
                <>
                  <button
                    className="button"
                    type="button"
                    disabled={saving}
                    onClick={() => void submitReviewStatus("Approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    disabled={saving}
                    onClick={() => void submitReviewStatus("Returned")}
                  >
                    Return
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
