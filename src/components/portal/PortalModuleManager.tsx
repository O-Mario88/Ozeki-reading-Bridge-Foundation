"use client";

import { FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import {
  PortalFieldConfig,
  PortalModuleConfig,
  portalStatusOptions,
} from "@/lib/portal-config";
import {
  allUgandaDistricts,
  getDistrictsByRegion,
  getSubRegionsByRegion,
  inferRegionFromDistrict,
  ugandaRegions,
} from "@/lib/uganda-locations";
import {
  PortalRecord,
  PortalRecordStatus,
  SchoolDirectoryRecord,
  PortalUser,
} from "@/lib/types";
import type { EgraLearner } from "./EgraLearnerInputModal";
import type { RosterEntry } from "./SchoolRosterPicker";

const EgraLearnerInputModal = lazy(() => import("./EgraLearnerInputModal").then(m => ({ default: m.EgraLearnerInputModal })));
const SchoolRosterPicker = lazy(() => import("./SchoolRosterPicker").then(m => ({ default: m.SchoolRosterPicker })));
const LessonEvaluationPanel = lazy(() => import("./LessonEvaluationPanel").then(m => ({ default: m.LessonEvaluationPanel })));
import { useOfflineReference } from "@/hooks/useOfflineReference";
import { EXTENDED_RECOMMENDATION_CATALOG } from "@/lib/recommendations";
import { LEARNING_DOMAIN_DICTIONARY } from "@/lib/domain-dictionary";
import {
  ASSESSMENT_MODEL_VERSION_UG_MASTERY_ONETEST_STYLE_V1,
  computeOneTestStyleMasteryAssessment,
  type MasteryDomainKey,
  type MasteryStatus,
} from "@/lib/mastery-assessment";

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
  id: number | string | null;
  date: string;
  region: string;
  district: string;
  schoolId: string;
  schoolName: string;
  programType: string;
  followUpDate: string;
  followUpType: string;
  followUpOwnerUserId: string;
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
    followUpType?: string;
    followUpOwnerUserId?: number;
    status: PortalRecordStatus;
    payload: Record<string, string | number | boolean | string[] | null | undefined>;
  };
};

type EgraMetricKey =
  | "letterIdentification"
  | "soundIdentification"
  | "decodableWords"
  | "undecodableWords"
  | "madeUpWords"
  | "storyReading"
  | "readingComprehension";

type EgraLearnerRow = {
  no: number;
  learnerUid: string;
  learnerId: string;
  learnerName: string;
  classGrade: string;
  sex: "" | "M" | "F";
  age: string;
  letterIdentification: string;
  soundIdentification: string;
  decodableWords: string;
  undecodableWords: string;
  madeUpWords: string;
  storyReading: string;
  readingComprehension: string;
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
    learnerUid: string;
    learnerId: string;
    learnerName: string;
    classGrade: string;
    sex: "M" | "F" | "";
    age: number | null;
    letterIdentification: number | null;
    soundIdentification: number | null;
    decodableWords: number | null;
    undecodableWords: number | null;
    madeUpWords: number | null;
    storyReading: number | null;
    readingComprehension: number | null;
    fluencyLevel: string;
  }>;
};

type TrainingParticipantRole = "" | "Teacher" | "Leader";
type TrainingParticipantGender = "" | "Male" | "Female";
type TrainingParticipantType = "" | "In Person" | "Online" | "Hybrid";

type TrainingParticipantRow = {
  contactId: string;
  contactUid: string;
  participantName: string;
  schoolAccountId: string;
  schoolAttachedTo: string;
  role: TrainingParticipantRole;
  gender: TrainingParticipantGender;
  phoneContact: string;
  email: string;
  participantType: TrainingParticipantType;
  invited: boolean;
  confirmed: boolean;
  attended: boolean;
};

type TrainingParticipantFeedbackRow = {
  id: string;
  contactId: string;
  contactUid: string;
  participantName: string;
  changedThinking: string;
  improveReading: string;
};

type TrainingFacilitatorRow = {
  id: string;
  fullName: string;
  phone: string;
};

type TrainingFeedbackBundle = {
  participants: Array<{
    contactId: number | null;
    contactUid: string | null;
    participantName: string;
    changedThinking: string;
    improveReading: string;
  }>;
  facilitators: Array<{
    id: string;
    fullName: string;
    phone: string;
  }>;
  selectedFacilitatorId: string;
  facilitatorFeedback: {
    generalObservation: string;
    whatWentWell: string;
    challenges: string;
    actionsRecommendations: string;
    nextStep: string;
    photoFileName: string;
  };
};

type VisitImplementationStatus = "started" | "not_started" | "partial";
type VisitPathway = "observation" | "demo_and_meeting" | "mixed";

type SchoolContactOption = {
  contactId: number;
  contactUid: string;
  fullName: string;
  category: string;
};

type VisitNextActionRow = {
  id: string;
  action: string;
  ownerContactId: string;
  dueDate: string;
};

type InsightRecommendationPriority = "high" | "medium" | "low";

type InsightRecommendationRow = {
  recId: string;
  priority: InsightRecommendationPriority;
  notes: string;
};

interface PortalModuleManagerProps {
  config: PortalModuleConfig;
  initialRecords: PortalRecord[];
  initialSchools: SchoolDirectoryRecord[];
  initialUsers: Array<{ id: number; fullName: string }>;
  initialFinanceContacts?: Array<{ id: number; fullName: string }>;
  currentUser: PortalUser;
}

const queueStorageKey = "portal-offline-queue";
const defaultRegion = ugandaRegions[0]?.region ?? "";
const EGRA_ROW_COUNT = 20;
const ASSESSMENT_IMPORT_TEMPLATE_HEADERS = [
  "no",
  "learnerName",
  "classGrade",
  "gender",
  "age",
  "phonemicAwareness",
  "graphemePhonemeCorrespondence",
  "blendingDecoding",
  "undecodableWords",
  "wordRecognitionFluency",
  "sentenceParagraphConstruction",
  "comprehension",
] as const;
const ASSESSMENT_IMPORT_TEMPLATE_ROWS: Array<Record<(typeof ASSESSMENT_IMPORT_TEMPLATE_HEADERS)[number], string | number>> = [
  {
    no: 1,
    learnerName: "Example Learner 1",
    classGrade: "P1",
    gender: "Female",
    age: 7,
    phonemicAwareness: 82,
    graphemePhonemeCorrespondence: 78,
    blendingDecoding: 74,
    undecodableWords: 69,
    wordRecognitionFluency: 72,
    sentenceParagraphConstruction: 70,
    comprehension: 66,
  },
  {
    no: 2,
    learnerName: "Example Learner 2",
    classGrade: "P2",
    gender: "Male",
    age: 8,
    phonemicAwareness: 91,
    graphemePhonemeCorrespondence: 87,
    blendingDecoding: 83,
    undecodableWords: 76,
    wordRecognitionFluency: 85,
    sentenceParagraphConstruction: 81,
    comprehension: 78,
  },
];
const ASSESSMENT_IMPORT_HEADER_ALIASES: Record<Exclude<keyof EgraLearnerRow, "no">, string[]> = {
  learnerUid: ["learneruid", "learner_uid", "uid"],
  learnerId: ["learnerid", "learner_id", "childid", "internalchildid", "id"],
  learnerName: ["learnername", "learner_name", "childname", "fullname", "name"],
  classGrade: ["classgrade", "class_grade", "class", "grade", "classlevel", "class_level"],
  sex: ["sex", "gender"],
  age: ["age"],
  letterIdentification: [
    "phonemicawareness",
    "phonemic_awareness",
    "letteridentification",
    "letter_identification",
    "pa",
  ],
  soundIdentification: [
    "graphemephonemecorrespondence",
    "grapheme_phoneme_correspondence",
    "soundidentification",
    "sound_identification",
    "gpc",
  ],
  decodableWords: [
    "blendingdecoding",
    "blending_decoding",
    "decodablewords",
    "decodable_words",
    "bd",
  ],
  undecodableWords: ["undecodablewords", "undecodable_words"],
  madeUpWords: [
    "wordrecognitionfluency",
    "word_recognition_fluency",
    "madeupwords",
    "made_up_words",
    "wrf",
  ],
  storyReading: [
    "sentenceparagraphconstruction",
    "sentence_paragraph_construction",
    "storyreading",
    "story_reading",
    "spc",
  ],
  readingComprehension: [
    "comprehension",
    "readingcomprehension",
    "reading_comprehension",
    "c",
  ],
  fluencyLevel: ["fluencylevel", "readingstage", "reading_stage", "readingstagelabel"],
};
const egraMetricLabels: Array<{ key: EgraMetricKey; label: string }> = [
  {
    key: "letterIdentification",
    label: `${LEARNING_DOMAIN_DICTIONARY.letter_names.label_full} (accuracy %)`,
  },
  {
    key: "soundIdentification",
    label: `${LEARNING_DOMAIN_DICTIONARY.letter_sounds.label_full} (accuracy %)`,
  },
  {
    key: "decodableWords",
    label: `${LEARNING_DOMAIN_DICTIONARY.real_words.label_full} (mastery score)`,
  },
  {
    key: "madeUpWords",
    label: `${LEARNING_DOMAIN_DICTIONARY.made_up_words.label_full} (mastery score)`,
  },
  {
    key: "storyReading",
    label: `${LEARNING_DOMAIN_DICTIONARY.story_reading.label_full} (mastery score)`,
  },
  {
    key: "readingComprehension",
    label: `${LEARNING_DOMAIN_DICTIONARY.comprehension.label_full} (mastery score)`,
  },
];

const egraLevelLabels = [
  "Pre-Reader",
  "Early Decoder",
  "Developing Reader",
  "Fluent Reader",
  "Comprehending Reader",
] as const;

type EgraMasterySignals = Pick<
  EgraLearnerRow,
  | "age"
  | "letterIdentification"
  | "soundIdentification"
  | "decodableWords"
  | "undecodableWords"
  | "madeUpWords"
  | "storyReading"
  | "readingComprehension"
>;

const masteryProfileLegend: Array<{ key: MasteryDomainKey; short: string }> = [
  { key: "phonemic_awareness", short: "PA" },
  { key: "grapheme_phoneme_correspondence", short: "GPC" },
  { key: "blending_decoding", short: "BD" },
  { key: "word_recognition_fluency", short: "WRF" },
  { key: "sentence_paragraph_construction", short: "SPC" },
  { key: "comprehension", short: "C" },
];

const visitObservationScoreByRating: Record<string, number> = {
  "Very Good": 5,
  Good: 3,
  Fair: 1,
  "Can Improve": 0,
};

const recCatalogById = new Map(
  EXTENDED_RECOMMENDATION_CATALOG.map((rec) => [rec.id, rec]),
);

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

const visitStepSectionIds = {
  context: new Set(["visitContext"]),
  implementation: new Set(["implementationGate"]),
  observation: new Set([
    "observationContext",
    "generalTeaching",
    "teacherNewSound",
    "readingActivities",
    "trickyWords",
    "observationCoaching",
  ]),
  demo: new Set(["lessonDemo", "implementationStartPlan", "leadershipMeeting"]),
  submit: new Set(["visitInsights"]),
} as const;

const visitObservationOnlyFieldKeys = new Set([
  "teacherObserved",
  "teacherContactId",
  "teacherContactUid",
  "teacherUid",
  "teacherGender",
  "classLevel",
  "classSize",
  "lessonFocusAreas",
  "learnerSpotCheckCount",
  "learnerSpotCheckNote",
  "strengthsObserved",
  "gapsIdentified",
  "coachingProvided",
  "teacherActions",
  "nextVisitFocus",
]);

const visitDemoMeetingFieldKeys = new Set([
  "demoDelivered",
  "demoClass",
  "demoFocus",
  "demoMinutes",
  "demoComponents",
  "demoMaterialsUsed",
  "demoTeachersPresentContactIds",
  "demoTakeawaysText",
  "implementationStartDate",
  "dailyReadingTimeMinutes",
  "classesToStartFirst",
  "implementationResponsibleContactId",
  "supportNeededFromOzeki",
  "leadershipMeetingHeld",
  "leadershipAttendeesContactIds",
  "leadershipSummary",
  "leadershipAgreements",
  "leadershipRisks",
  "leadershipNextActionsJson",
  "leadershipNextVisitDate",
]);

const autoLinkedGeoPayloadKeys = new Set([
  "region",
  "subRegion",
  "district",
  "subCounty",
  "parish",
]);

const trainingAutoAttendanceKeys = new Set([
  "numberAttended",
  "femaleCount",
  "maleCount",
  "teachersFemale",
  "teachersMale",
  "schoolLeadersFemale",
  "schoolLeadersMale",
]);

const trainingPhysicalFieldKeys = new Set([
  "trainingVenue",
  "clusterName",
  "village",
  "gpsLocation",
  "subRegion",
  "subCounty",
  "parish",
]);

const trainingScheduleEditableFieldKeys = new Set([
  "trainingStatus",
  "trainingName",
  "deliveryMode",
  "startTime",
  "endTime",
  "trainingVenue",
  "clusterName",
  "village",
  "gpsLocation",
  "sponsorshipType",
  "sponsoredBy",
]);

function applySchoolGeoPayload(
  payload: FormPayloadState,
  school: SchoolDirectoryRecord | null,
): FormPayloadState {
  if (!school) {
    return payload;
  }

  return {
    ...payload,
    region: school.region,
    subRegion: school.subRegion,
    district: school.district,
    subCounty: school.subCounty,
    parish: school.parish,
  };
}

function normalizeVisitImplementationStatus(value: unknown): VisitImplementationStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "not_started" || normalized === "not started" || normalized === "no") {
    return "not_started";
  }
  if (normalized === "partial" || normalized === "partially") {
    return "partial";
  }
  return "started";
}

function deriveVisitPathway(status: VisitImplementationStatus): VisitPathway {
  if (status === "not_started") return "demo_and_meeting";
  if (status === "partial") return "mixed";
  return "observation";
}

function isOnlineTrainingDeliveryMode(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized.includes("online") || normalized.includes("virtual");
}

function parseVisitNextActions(value: unknown): VisitNextActionRow[] {
  let rows: Array<Record<string, unknown>> = [];

  if (Array.isArray(value)) {
    rows = value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
  } else if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        rows = parsed.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
      }
    } catch {
      rows = [];
    }
  }

  const parsedRows = rows
    .map((row, index) => ({
      id: `${Date.now()}-${index}`,
      action: String(row.action ?? "").trim(),
      ownerContactId: String(row.ownerContactId ?? row.owner_contact_id ?? "").trim(),
      dueDate: String(row.dueDate ?? row.due_date ?? "").trim().slice(0, 10),
    }))
    .filter((row) => row.action || row.ownerContactId || row.dueDate);

  if (parsedRows.length > 0) {
    return parsedRows;
  }

  return [{ id: `${Date.now()}-0`, action: "", ownerContactId: "", dueDate: "" }];
}

function sanitizeContactIds(values: string[]) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function normalizeInsightRecommendationPriority(value: unknown): InsightRecommendationPriority {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "medium";
}

function parseInsightRecommendationRows(value: unknown): InsightRecommendationRow[] {
  let source: unknown = value;
  if (typeof source === "string" && source.trim()) {
    try {
      source = JSON.parse(source);
    } catch {
      source = [];
    }
  }
  if (!Array.isArray(source)) {
    return [];
  }

  const rows = source
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const row = entry as Record<string, unknown>;
      return {
        recId: String(row.recId ?? row.rec_id ?? "").trim(),
        priority: normalizeInsightRecommendationPriority(row.priority),
        notes: String(row.notes ?? "").trim(),
      } as InsightRecommendationRow;
    })
    .filter((row) => row.recId);

  return rows;
}

function applySuggestedInsightRecIds(
  module: PortalModuleConfig["module"],
  payload: FormPayloadState,
): string[] {
  const recIds = new Set<string>();
  if (module === "assessment") {
    let masteryInputs: Record<string, unknown> = {};
    const rawMastery = payload.masteryDomainInputs;
    if (typeof rawMastery === "string" && rawMastery.trim()) {
      try {
        const parsed = JSON.parse(rawMastery);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          masteryInputs = parsed as Record<string, unknown>;
        }
      } catch {
        masteryInputs = {};
      }
    }

    const readMasteryStatus = (key: string) => {
      const row = masteryInputs[key];
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        return "";
      }
      return String((row as Record<string, unknown>).domainMasteryStatus ?? "")
        .trim()
        .toLowerCase();
    };

    const pa = readMasteryStatus("phonemic_awareness");
    const gpc = readMasteryStatus("grapheme_phoneme_correspondence");
    const blend = readMasteryStatus("blending_decoding");
    const fluency = readMasteryStatus("word_recognition_fluency");
    const comprehension = readMasteryStatus("comprehension");

    if (pa === "red" || gpc === "red" || blend === "red") {
      recIds.add("REC-01");
      recIds.add("REC-09");
    }
    if (fluency === "amber") {
      recIds.add("REC-10");
    }
    if (blend === "green" && (comprehension === "amber" || comprehension === "red")) {
      recIds.add("REC-11");
    }
    if (pa === "green" && gpc === "green" && blend === "green" && comprehension === "green") {
      recIds.add("REC-13");
    }

    if (recIds.size === 0) {
      const nonReaders = Number(payload.nonReaders ?? 0);
      const learnersAssessed = Number(payload.learnersAssessed ?? 0);
      if (learnersAssessed > 0 && nonReaders / learnersAssessed >= 0.3) {
        recIds.add("REC-01");
        recIds.add("REC-09");
      }
      const fluencyScore = Number(payload.storyReadingScore ?? 0);
      if (Number.isFinite(fluencyScore) && fluencyScore < 20) {
        recIds.add("REC-10");
      }
    }
  }
  if (module === "visit") {
    const implementationStatus = String(payload.implementationStatus ?? "").trim().toLowerCase();
    if (implementationStatus === "not_started") {
      recIds.add("REC-03");
      recIds.add("REC-04");
    } else if (implementationStatus === "partial") {
      recIds.add("REC-04");
      recIds.add("REC-17");
    }
  }
  if (module === "training") {
    recIds.add("REC-04");
    recIds.add("REC-17");
  }
  if (module === "story" || module === "story_activity") {
    recIds.add("REC-18");
    recIds.add("REC-20");
  }
  return [...recIds];
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function evaluateVisitCompletionEligibility(dateValue: string, startTimeValue: string) {
  const visitDate = String(dateValue ?? "").trim();
  const visitTime = String(startTimeValue ?? "").trim();
  if (!visitDate) {
    return {
      canComplete: false,
      reason: "Set a visit date first.",
    };
  }

  const todayLocal = getTodayLocal();
  if (visitDate > todayLocal) {
    return {
      canComplete: false,
      reason: "Future visits remain Scheduled until the visit happens.",
    };
  }
  if (visitDate < todayLocal) {
    return { canComplete: true, reason: "" };
  }

  if (!visitTime) {
    return {
      canComplete: false,
      reason: "Set visit start time to unlock Completed status.",
    };
  }

  const startDateTime = new Date(`${visitDate}T${visitTime}:00`);
  if (Number.isNaN(startDateTime.getTime())) {
    return {
      canComplete: false,
      reason: "Visit start time is invalid.",
    };
  }

  const now = new Date();
  const hoursSinceStart = (now.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
  if (hoursSinceStart < 0) {
    return {
      canComplete: false,
      reason: "Visit is still upcoming today, so status must stay Scheduled.",
    };
  }
  if (hoursSinceStart <= 5) {
    return { canComplete: true, reason: "" };
  }
  return {
    canComplete: false,
    reason: "Completed is only available within 5 hours after today's visit start time.",
  };
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
  if (normalizedKey.includes("subregion")) return "address-level1";
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
  if (normalizedKey.includes("subregion")) return "e.g. Acholi";
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
  if (normalized === "teacher" || normalized === "classroom teacher") {
    return "Teacher";
  }
  if (
    normalized === "leader" ||
    normalized === "school leader" ||
    normalized === "head teacher" ||
    normalized === "deputy head teacher" ||
    normalized === "dos" ||
    normalized === "proprietor"
  ) {
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

function normalizeParticipantType(value: unknown): TrainingParticipantType {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "in person" || normalized === "in-person" || normalized === "onsite") {
    return "In Person";
  }
  if (normalized === "online" || normalized === "virtual") {
    return "Online";
  }
  if (normalized === "hybrid") {
    return "Hybrid";
  }
  return "";
}

function normalizeBooleanFlag(value: unknown, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (["true", "1", "yes", "y", "confirmed", "attended", "invited"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function createEmptyTrainingParticipant(defaultSchoolId = "", defaultSchoolName = ""): TrainingParticipantRow {
  return {
    contactId: "",
    contactUid: "",
    participantName: "",
    schoolAccountId: defaultSchoolId,
    schoolAttachedTo: defaultSchoolName,
    role: "",
    gender: "",
    phoneContact: "",
    email: "",
    participantType: "In Person",
    invited: true,
    confirmed: true,
    attended: true,
  };
}

function rowHasTrainingParticipantData(row: TrainingParticipantRow) {
  return (
    row.contactId.trim() ||
    row.contactUid.trim() ||
    row.participantName.trim() ||
    row.schoolAccountId.trim() ||
    row.schoolAttachedTo.trim() ||
    row.role ||
    row.gender ||
    row.phoneContact.trim() ||
    row.email.trim()
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
        contactId: sanitizeForInput(entry.contactId),
        contactUid: sanitizeForInput(entry.contactUid ?? entry.teacherUid),
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
        email: sanitizeForInput(entry.email),
        participantType:
          normalizeParticipantType(entry.participantType) ||
          normalizeParticipantType(entry.deliveryMode) ||
          "In Person",
        invited: normalizeBooleanFlag(entry.invited, true),
        confirmed: normalizeBooleanFlag(entry.confirmed, true),
        attended: normalizeBooleanFlag(entry.attended, true),
      } as TrainingParticipantRow;
    })
    .filter((row) => rowHasTrainingParticipantData(row));

  return rows.length > 0 ? rows : fallback;
}

function createEmptyTrainingParticipantFeedbackRow(): TrainingParticipantFeedbackRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    contactId: "",
    contactUid: "",
    participantName: "",
    changedThinking: "",
    improveReading: "",
  };
}

function createEmptyTrainingFacilitatorRow(): TrainingFacilitatorRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fullName: "",
    phone: "",
  };
}

function parseTrainingFeedbackBundle(raw: unknown): TrainingFeedbackBundle | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TrainingFeedbackBundle>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const participants = Array.isArray(parsed.participants)
      ? parsed.participants.map((row) => ({
          contactId:
            row && typeof row === "object" && Number.isInteger((row as { contactId?: number }).contactId)
              ? Number((row as { contactId?: number }).contactId)
              : null,
          contactUid:
            row && typeof row === "object" && typeof (row as { contactUid?: unknown }).contactUid === "string"
              ? String((row as { contactUid?: unknown }).contactUid).trim() || null
              : null,
          participantName:
            row && typeof row === "object"
              ? String((row as { participantName?: unknown }).participantName ?? "").trim()
              : "",
          changedThinking:
            row && typeof row === "object"
              ? String((row as { changedThinking?: unknown }).changedThinking ?? "").trim()
              : "",
          improveReading:
            row && typeof row === "object"
              ? String((row as { improveReading?: unknown }).improveReading ?? "").trim()
              : "",
        }))
      : [];

    const facilitators = Array.isArray(parsed.facilitators)
      ? parsed.facilitators.map((row) => ({
          id:
            row && typeof row === "object"
              ? String((row as { id?: unknown }).id ?? "").trim() ||
                `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
              : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fullName:
            row && typeof row === "object"
              ? String((row as { fullName?: unknown }).fullName ?? "").trim()
              : "",
          phone:
            row && typeof row === "object"
              ? String((row as { phone?: unknown }).phone ?? "").trim()
              : "",
        }))
      : [];

    const facilitatorFeedback =
      parsed.facilitatorFeedback && typeof parsed.facilitatorFeedback === "object"
        ? {
            generalObservation: String(
              (parsed.facilitatorFeedback as { generalObservation?: unknown }).generalObservation ?? "",
            ).trim(),
            whatWentWell: String(
              (parsed.facilitatorFeedback as { whatWentWell?: unknown }).whatWentWell ?? "",
            ).trim(),
            challenges: String(
              (parsed.facilitatorFeedback as { challenges?: unknown }).challenges ?? "",
            ).trim(),
            actionsRecommendations: String(
              (parsed.facilitatorFeedback as { actionsRecommendations?: unknown }).actionsRecommendations ??
                "",
            ).trim(),
            nextStep: String(
              (parsed.facilitatorFeedback as { nextStep?: unknown }).nextStep ?? "",
            ).trim(),
            photoFileName: String(
              (parsed.facilitatorFeedback as { photoFileName?: unknown }).photoFileName ?? "",
            ).trim(),
          }
        : {
            generalObservation: "",
            whatWentWell: "",
            challenges: "",
            actionsRecommendations: "",
            nextStep: "",
            photoFileName: "",
          };

    return {
      participants,
      facilitators,
      selectedFacilitatorId: String(parsed.selectedFacilitatorId ?? "").trim(),
      facilitatorFeedback,
    };
  } catch {
    return null;
  }
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
    letterIdentification: 0,
    soundIdentification: 0,
    decodableWords: 0,
    undecodableWords: 0,
    madeUpWords: 0,
    storyReading: 0,
    readingComprehension: 0,
  };
}

function createEmptyEgraLearnerRow(no: number): EgraLearnerRow {
  return {
    no,
    learnerUid: "",
    learnerId: "",
    learnerName: "",
    classGrade: "",
    sex: "",
    age: "",
    letterIdentification: "",
    soundIdentification: "",
    decodableWords: "",
    undecodableWords: "",
    madeUpWords: "",
    storyReading: "",
    readingComprehension: "",
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

function computeLearnerMasteryFromSignals(row: EgraMasterySignals, classGrade = "P1") {
  const computed = computeOneTestStyleMasteryAssessment({
    grade: classGrade,
    age: toNumberOrNull(row.age),
    legacyScores: {
      letterIdentificationScore: toNumberOrNull(row.letterIdentification),
      soundIdentificationScore: toNumberOrNull(row.soundIdentification),
      decodableWordsScore: toNumberOrNull(row.decodableWords),
      undecodableWordsScore: toNumberOrNull(row.undecodableWords),
      madeUpWordsScore: toNumberOrNull(row.madeUpWords),
      storyReadingScore: toNumberOrNull(row.storyReading),
      readingComprehensionScore: toNumberOrNull(row.readingComprehension),
    },
  });
  return computed;
}

function determineFluencyLevel(row: EgraMasterySignals, classGrade = "P1") {
  const computed = computeLearnerMasteryFromSignals(row, classGrade);
  return computed.readingStageLabel;
}

function normalizeEgraLevelLabel(
  value: string,
  row: EgraMasterySignals,
  classGrade = "P1",
) {
  const normalized = value.trim();
  if (
    normalized === "Pre-Reader" ||
    normalized === "Early Decoder" ||
    normalized === "Developing Reader" ||
    normalized === "Fluent Reader" ||
    normalized === "Comprehending Reader"
  ) {
    return normalized;
  }
  return determineFluencyLevel(row, classGrade);
}

function masteryStatusShortLabel(status: MasteryStatus) {
  if (status === "green") return "G";
  if (status === "amber") return "A";
  return "R";
}

function formatMasteryProfileCompact(
  mastery: ReturnType<typeof computeOneTestStyleMasteryAssessment>,
) {
  return masteryProfileLegend
    .map(({ key, short }) => `${short}:${masteryStatusShortLabel(mastery.domains[key].domainMasteryStatus)}`)
    .join(" | ");
}

function rowHasAssessmentData(row: EgraLearnerRow) {
  if (
    row.learnerId.trim() ||
    row.learnerName.trim() ||
    row.sex ||
    row.age.trim()
  ) {
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
    const level = normalizeEgraLevelLabel(row.fluencyLevel, row);
    if (level === "Pre-Reader") profileCounts.nonReaders += 1;
    if (level === "Early Decoder") profileCounts.emerging += 1;
    if (level === "Developing Reader") profileCounts.developing += 1;
    if (level === "Fluent Reader") profileCounts.transitional += 1;
    if (level === "Comprehending Reader") profileCounts.fluent += 1;
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
      learnerUid: row.learnerUid.trim(),
      learnerId: row.learnerId.trim(),
      learnerName: row.learnerName.trim(),
      classGrade: row.classGrade.trim(),
      sex: row.sex,
      age: toNumberOrNull(row.age),
      letterIdentification: toNumberOrNull(row.letterIdentification),
      soundIdentification: toNumberOrNull(row.soundIdentification),
      decodableWords: toNumberOrNull(row.decodableWords),
      undecodableWords: toNumberOrNull(row.undecodableWords),
      madeUpWords: toNumberOrNull(row.madeUpWords),
      storyReading: toNumberOrNull(row.storyReading),
      readingComprehension: toNumberOrNull(row.readingComprehension),
      fluencyLevel: normalizeEgraLevelLabel(row.fluencyLevel, row),
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

function normalizeAssessmentImportHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeAssessmentImportSex(value: unknown): "" | "M" | "F" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized === "m" || normalized === "male" || normalized === "boy") {
    return "M";
  }
  if (normalized === "f" || normalized === "female" || normalized === "girl") {
    return "F";
  }
  return "";
}

function normalizeAssessmentImportNumeric(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    return "";
  }
  return String(parsed);
}

function normalizeAssessmentImportAge(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return "";
  }
  return String(Math.round(parsed));
}

type AssessmentImportRosterLearner = {
  learnerId: number;
  learnerUid: string;
  fullName: string;
  gender: "Boy" | "Girl" | "Other";
  age: number;
  classGrade: string;
};

function normalizeAssessmentImportName(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeAssessmentImportClassGrade(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeAssessmentLookupText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function toRosterGender(sex: "" | "M" | "F"): "Boy" | "Girl" | "Other" {
  if (sex === "M") {
    return "Boy";
  }
  if (sex === "F") {
    return "Girl";
  }
  return "Other";
}

function fromRosterGender(value: string): "" | "M" | "F" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "boy" || normalized === "male" || normalized === "m") {
    return "M";
  }
  if (normalized === "girl" || normalized === "female" || normalized === "f") {
    return "F";
  }
  return "";
}

function getAssessmentImportLearnerKey(input: {
  learnerName: string;
  classGrade: string;
  age: string;
  sex: "" | "M" | "F";
}) {
  return [
    normalizeAssessmentLookupText(input.learnerName),
    normalizeAssessmentLookupText(input.classGrade),
    input.age.trim(),
    input.sex || "-",
  ].join("|");
}

function getAssessmentImportValue(
  normalizedRow: Map<string, string>,
  aliases: string[],
) {
  for (const alias of aliases) {
    const value = normalizedRow.get(alias);
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function ensureAssessmentTemplateRowLimit(rows: EgraLearnerRow[]) {
  if (rows.length > EGRA_ROW_COUNT) {
    throw new Error(
      `Upload has ${rows.length} learner rows. Maximum supported per upload is ${EGRA_ROW_COUNT}. Split into smaller files.`,
    );
  }
}

function replaceWithImportedLearners(rows: EgraLearnerRow[]) {
  const mergedRows = createDefaultEgraRows();
  rows.forEach((row, index) => {
    mergedRows[index] = {
      ...row,
      no: index + 1,
    };
  });
  return mergedRows;
}

function buildAssessmentTemplateCsv() {
  const escapeCell = (value: string | number) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  const lines = [
    ASSESSMENT_IMPORT_TEMPLATE_HEADERS.join(","),
    ...ASSESSMENT_IMPORT_TEMPLATE_ROWS.map((row) =>
      ASSESSMENT_IMPORT_TEMPLATE_HEADERS.map((header) => escapeCell(row[header])).join(","),
    ),
  ];
  return lines.join("\n");
}

async function parseAssessmentImportWorkbookRows(file: File) {
  const fileName = file.name.trim().toLowerCase();
  if (
    !fileName.endsWith(".csv") &&
    !fileName.endsWith(".xlsx") &&
    !fileName.endsWith(".xls")
  ) {
    throw new Error("Use a CSV or Excel file (.csv, .xlsx, .xls).");
  }
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No worksheet found in file.");
  }
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
    raw: false,
  });
}

function mapAssessmentImportRows(
  sourceRows: Array<Record<string, unknown>>,
  classGrade: string,
) {
  const mappedRows = sourceRows
    .map((sourceRow, index) => {
      const normalizedRow = new Map<string, string>();
      Object.entries(sourceRow).forEach(([key, value]) => {
        const normalizedKey = normalizeAssessmentImportHeader(key);
        if (!normalizedKey) {
          return;
        }
        normalizedRow.set(normalizedKey, String(value ?? "").trim());
      });

      const learnerUid = getAssessmentImportValue(
        normalizedRow,
        ASSESSMENT_IMPORT_HEADER_ALIASES.learnerUid,
      );
      const learnerId = getAssessmentImportValue(
        normalizedRow,
        ASSESSMENT_IMPORT_HEADER_ALIASES.learnerId,
      );
      const learnerName = normalizeAssessmentImportName(
        getAssessmentImportValue(normalizedRow, ASSESSMENT_IMPORT_HEADER_ALIASES.learnerName),
      );
      const rowClassGrade = normalizeAssessmentImportClassGrade(
        getAssessmentImportValue(normalizedRow, ASSESSMENT_IMPORT_HEADER_ALIASES.classGrade),
      );
      const resolvedClassGrade = rowClassGrade || classGrade;
      const sex = normalizeAssessmentImportSex(
        getAssessmentImportValue(normalizedRow, ASSESSMENT_IMPORT_HEADER_ALIASES.sex),
      );
      const age = normalizeAssessmentImportAge(
        getAssessmentImportValue(normalizedRow, ASSESSMENT_IMPORT_HEADER_ALIASES.age),
      );
      const letterIdentification = normalizeAssessmentImportNumeric(
        getAssessmentImportValue(
          normalizedRow,
          ASSESSMENT_IMPORT_HEADER_ALIASES.letterIdentification,
        ),
      );
      const soundIdentification = normalizeAssessmentImportNumeric(
        getAssessmentImportValue(
          normalizedRow,
          ASSESSMENT_IMPORT_HEADER_ALIASES.soundIdentification,
        ),
      );
      const decodableWords = normalizeAssessmentImportNumeric(
        getAssessmentImportValue(
          normalizedRow,
          ASSESSMENT_IMPORT_HEADER_ALIASES.decodableWords,
        ),
      );
      const undecodableWords = normalizeAssessmentImportNumeric(
        getAssessmentImportValue(
          normalizedRow,
          ASSESSMENT_IMPORT_HEADER_ALIASES.undecodableWords,
        ),
      );
      const madeUpWords = normalizeAssessmentImportNumeric(
        getAssessmentImportValue(
          normalizedRow,
          ASSESSMENT_IMPORT_HEADER_ALIASES.madeUpWords,
        ),
      );
      const storyReading = normalizeAssessmentImportNumeric(
        getAssessmentImportValue(
          normalizedRow,
          ASSESSMENT_IMPORT_HEADER_ALIASES.storyReading,
        ),
      );
      const readingComprehension = normalizeAssessmentImportNumeric(
        getAssessmentImportValue(
          normalizedRow,
          ASSESSMENT_IMPORT_HEADER_ALIASES.readingComprehension,
        ),
      );

      const rowSignals: EgraMasterySignals = {
        age,
        letterIdentification,
        soundIdentification,
        decodableWords,
        undecodableWords,
        madeUpWords,
        storyReading,
        readingComprehension,
      };
      const rawFluencyLevel = getAssessmentImportValue(
        normalizedRow,
        ASSESSMENT_IMPORT_HEADER_ALIASES.fluencyLevel,
      );
      const fluencyLevel = normalizeEgraLevelLabel(
        rawFluencyLevel,
        rowSignals,
        resolvedClassGrade || classGrade,
      );

      return {
        no: index + 1,
        learnerUid,
        learnerId,
        learnerName,
        classGrade: resolvedClassGrade,
        sex,
        age,
        letterIdentification,
        soundIdentification,
        decodableWords,
        undecodableWords,
        madeUpWords,
        storyReading,
        readingComprehension,
        fluencyLevel,
      } as EgraLearnerRow;
    })
    .filter((row) => rowHasAssessmentData(row));

  if (mappedRows.length === 0) {
    throw new Error("No learner rows were detected. Use the provided template.");
  }

  ensureAssessmentTemplateRowLimit(mappedRows);
  return mappedRows.map((row, index) => ({ ...row, no: index + 1 }));
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
    const letterIdentification = sanitizeForInput(entry.letterIdentification);
    const soundIdentification = sanitizeForInput(entry.soundIdentification);
    const decodableWords = sanitizeForInput(entry.decodableWords);
    const undecodableWords = sanitizeForInput(entry.undecodableWords);
    const madeUpWords = sanitizeForInput(entry.madeUpWords);
    const storyReading = sanitizeForInput(entry.storyReading);
    const readingComprehension = sanitizeForInput(entry.readingComprehension);
    const age = sanitizeForInput(entry.age);
    const rowSignals: EgraMasterySignals = {
      age,
      letterIdentification,
      soundIdentification,
      decodableWords,
      undecodableWords,
      madeUpWords,
      storyReading,
      readingComprehension,
    };
    const fluencyLevel = normalizeEgraLevelLabel(
      sanitizeForInput(entry.fluencyLevel),
      rowSignals,
    );

    return {
      no: Number(entry.no ?? template.no) || template.no,
      learnerUid: sanitizeForInput(entry.learnerUid),
      learnerId: sanitizeForInput(entry.learnerId),
      learnerName: sanitizeForInput(entry.learnerName),
      classGrade: sanitizeForInput(entry.classGrade ?? entry.class ?? entry.grade),
      sex: normalizeSex(entry.sex),
      age,
      letterIdentification,
      soundIdentification,
      decodableWords,
      undecodableWords,
      madeUpWords,
      storyReading,
      readingComprehension,
      fluencyLevel,
    };
  });
}

export function PortalModuleManager({
  config,
  initialRecords,
  initialSchools,
  initialUsers,
  initialFinanceContacts,
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
  const [filters, setFilters] = useState<FilterState>(() => {
    let initialRegion = "";
    let initialDistrict = "";

    if (currentUser.geographyScope && !canReview) {
      const [scopeType, scopeValue] = currentUser.geographyScope.split(":");
      if (scopeType === "district") {
        initialDistrict = scopeValue;
        initialRegion = inferRegionFromDistrict(scopeValue) ?? "";
      } else if (scopeType === "region") {
        initialRegion = scopeValue;
      }
    }

    return {
      region: initialRegion,
      dateFrom: "",
      dateTo: "",
      district: initialDistrict,
      school: "",
      status: "",
      createdBy: "",
      programType: "",
    };
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [urlInitialized, setUrlInitialized] = useState(false);
  const [autosaveAt, setAutosaveAt] = useState("");
  const [offlineCount, setOfflineCount] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const assessmentImportInputRef = useRef<HTMLInputElement | null>(null);
  const [importingAssessmentFile, setImportingAssessmentFile] = useState(false);
  const [gpsSeededSchoolIds, setGpsSeededSchoolIds] = useState<number[]>([]);
  const [egraLearners, setEgraLearners] = useState<EgraLearnerRow[]>(() => createDefaultEgraRows());
  const [trainingParticipants, setTrainingParticipants] = useState<TrainingParticipantRow[]>(
    () => [createEmptyTrainingParticipant()],
  );
  const [isTrainingFeedbackFormOpen, setIsTrainingFeedbackFormOpen] = useState(false);
  const [trainingParticipantFeedbackRows, setTrainingParticipantFeedbackRows] = useState<
    TrainingParticipantFeedbackRow[]
  >([]);
  const [trainingFacilitatorRows, setTrainingFacilitatorRows] = useState<TrainingFacilitatorRow[]>([
    createEmptyTrainingFacilitatorRow(),
  ]);
  const [selectedTrainingFacilitatorId, setSelectedTrainingFacilitatorId] = useState("");
  const [facilitatorGeneralObservation, setFacilitatorGeneralObservation] = useState("");
  const [facilitatorWhatWentWell, setFacilitatorWhatWentWell] = useState("");
  const [facilitatorChallenges, setFacilitatorChallenges] = useState("");
  const [facilitatorActionsRecommendations, setFacilitatorActionsRecommendations] = useState("");
  const [facilitatorNextStep, setFacilitatorNextStep] = useState("");
  const [facilitatorFeedbackPhotoFileName, setFacilitatorFeedbackPhotoFileName] = useState("");
  const [visitStep, setVisitStep] = useState<1 | 2 | 3 | 4>(1);
  const [schoolContacts, setSchoolContacts] = useState<SchoolContactOption[]>([]);

  const [visitNextActions, setVisitNextActions] = useState<VisitNextActionRow[]>(() => [
    { id: `${Date.now()}-0`, action: "", ownerContactId: "", dueDate: "" },
  ]);
  const [insightRecommendationRows, setInsightRecommendationRows] = useState<
    InsightRecommendationRow[]
  >([]);

  const [isEgraModalOpen, setIsEgraModalOpen] = useState(false);
  const [modalLearnerNo, setModalLearnerNo] = useState(1);
  const [modalLearnerId, setModalLearnerId] = useState("");

  const [formState, setFormState] = useState<FormState>(() => ({
    id: null,
    date: getToday(),
    region: defaultRegion,
    district: "",
    schoolId: "",
    schoolName: "",
    programType: config.programTypeOptions[0]?.value ?? "",
    followUpDate: "",
    followUpType: "school_visit",
    followUpOwnerUserId: "",
    status: "Draft",
    reviewNote: "",
    payload: buildDefaultPayload(config),
  }));

  const isVisitModule = config.module === "visit";
  const isTrainingModule = config.module === "training";
  const trainingStatusValue = String(formState.payload.trainingStatus ?? "")
    .trim()
    .toLowerCase();
  const isTrainingScheduled = isTrainingModule && trainingStatusValue === "scheduled";
  const visitStatusValue = String(formState.payload.visitStatus ?? "")
    .trim()
    .toLowerCase();
  const visitStatus = visitStatusValue === "completed" ? "completed" : "scheduled";
  const visitCompletionGate = useMemo(
    () =>
      evaluateVisitCompletionEligibility(
        formState.date,
        String(formState.payload.startTime ?? ""),
      ),
    [formState.date, formState.payload.startTime],
  );
  const isVisitCompleted = isVisitModule && visitStatus === "completed";
  const isVisitFollowUpLocked = isVisitModule && !isVisitCompleted;
  const visitImplementationUnlocked = !isVisitModule || isVisitCompleted;
  const visitImplementationStatus = useMemo(
    () =>
      normalizeVisitImplementationStatus(
        formState.payload.implementationStatus,
      ),
    [formState.payload.implementationStatus],
  );
  const visitPathway = useMemo(
    () => deriveVisitPathway(visitImplementationStatus),
    [visitImplementationStatus],
  );
  const visitAllowsObservation =
    visitImplementationStatus === "started" || visitImplementationStatus === "partial";
  const visitRequiresDemoMeeting =
    visitImplementationStatus === "not_started" || visitImplementationStatus === "partial";

  const egraSummary = useMemo(() => computeEgraSummary(egraLearners), [egraLearners]);
  const egraLearnerMasteryProfiles = useMemo(() => {
    const classGrade = String(formState.payload.classLevel ?? "").trim() || "P1";
    const profiles = new Map<number, ReturnType<typeof computeOneTestStyleMasteryAssessment>>();
    egraLearners.forEach((row) => {
      if (!rowHasAssessmentData(row)) {
        return;
      }
      profiles.set(row.no, computeLearnerMasteryFromSignals(row, classGrade));
    });
    return profiles;
  }, [egraLearners, formState.payload.classLevel]);
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
    if (config.module === "visit") {
      return [...initialSchools].sort((left, right) => left.name.localeCompare(right.name));
    }
    if (
      config.module === "training" &&
      isOnlineTrainingDeliveryMode(formState.payload.deliveryMode)
    ) {
      return [...initialSchools].sort((left, right) => left.name.localeCompare(right.name));
    }
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
  }, [config.module, formState.district, formState.payload.deliveryMode, formState.region, initialSchools]);
  const trainingParticipantStats = useMemo(() => {
    const activeRows = trainingParticipants.filter((row) => rowHasTrainingParticipantData(row));
    const attendedRows = activeRows.filter((row) => row.attended);
    const teacherRows = attendedRows.filter((row) => row.role === "Teacher");
    const leaderRows = attendedRows.filter((row) => row.role === "Leader");
    return {
      total: attendedRows.length,
      invited: activeRows.filter((row) => row.invited).length,
      confirmed: activeRows.filter((row) => row.confirmed).length,
      roster: activeRows.length,
      teachers: teacherRows.length,
      leaders: leaderRows.length,
      male: attendedRows.filter((row) => row.gender === "Male").length,
      female: attendedRows.filter((row) => row.gender === "Female").length,
      teacherFemale: teacherRows.filter((row) => row.gender === "Female").length,
      teacherMale: teacherRows.filter((row) => row.gender === "Male").length,
      leaderFemale: leaderRows.filter((row) => row.gender === "Female").length,
      leaderMale: leaderRows.filter((row) => row.gender === "Male").length,
    };
  }, [trainingParticipants]);
  const selectedFormSchool = useMemo(
    () =>
      formState.schoolId && schoolsById.has(Number(formState.schoolId))
        ? schoolsById.get(Number(formState.schoolId)) ?? null
        : null,
    [formState.schoolId, schoolsById],
  );
  const followUpMinDate = useMemo(
    () =>
      config.module === "training"
        ? addDaysToDate(formState.date || getToday(), 14)
        : formState.date || getToday(),
    [config.module, formState.date],
  );
  const isOnlineTrainingModeActive = useMemo(
    () =>
      config.module === "training" &&
      isOnlineTrainingDeliveryMode(formState.payload.deliveryMode),
    [config.module, formState.payload.deliveryMode],
  );
  const hideTrainingPhysicalLocationContext =
    config.module === "training" && isOnlineTrainingModeActive;
  const followUpOwnerOptions = useMemo(
    () => initialUsers.map((entry) => ({ id: entry.id, fullName: entry.fullName })),
    [initialUsers],
  );
  const defaultFollowUpOwnerId = useMemo(() => {
    const hasCurrentUser = followUpOwnerOptions.some((entry) => entry.id === currentUser.id);
    if (hasCurrentUser) {
      return String(currentUser.id);
    }
    return followUpOwnerOptions[0] ? String(followUpOwnerOptions[0].id) : "";
  }, [currentUser.id, followUpOwnerOptions]);

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
        let scopedRegion = defaultRegion;
        let scopedDistrict = "";

        if (currentUser.geographyScope && !canReview) {
          const [scopeType, scopeValue] = currentUser.geographyScope.split(":");
          if (scopeType === "district") {
            scopedDistrict = scopeValue;
            scopedRegion = inferRegionFromDistrict(scopeValue) ?? defaultRegion;
          } else if (scopeType === "region") {
            scopedRegion = scopeValue;
          }
        }

        return {
          region: scopedRegion,
          district: scopedDistrict,
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
    [schoolsById, currentUser.geographyScope, canReview],
  );

  const newFormState = useCallback(
    (options?: { schoolId?: number | null; programType?: string }): FormState => {
      const selectedSchool =
        typeof options?.schoolId === "number" && Number.isInteger(options.schoolId)
          ? schoolsById.get(options.schoolId) ?? null
          : null;
      const defaults = applySchoolGeoPayload(buildDefaultPayload(config), selectedSchool);
      if (config.module === "visit") {
        defaults.coachObserver = currentUser.fullName;
        defaults.visitStatus = "scheduled";
        defaults.implementationStatus = "";
        defaults.visitPathway = "observation";
        defaults.demoDelivered = "yes";
        defaults.leadershipMeetingHeld = "yes";
        defaults.leadershipNextActionsJson = "[]";
      }
      if (config.module === "training" && selectedSchool) {
        if (!String(defaults.trainingVenue ?? "").trim()) {
          defaults.trainingVenue = selectedSchool.name;
        }
      }
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
        followUpType: "school_visit",
        followUpOwnerUserId: config.module === "training" ? defaultFollowUpOwnerId : "",
        status: "Draft",
        reviewNote: "",
        payload: defaults,
      };
    },
    [config, currentUser.fullName, defaultFollowUpOwnerId, getSchoolScopeDefaults, schoolsById],
  );

  const openNewForm = useCallback((options?: { schoolId?: number | null; programType?: string }) => {
    const nextForm = newFormState(options);
    setFormState(nextForm);
    setEgraLearners(createDefaultEgraRows());
    setTrainingParticipants([
      createEmptyTrainingParticipant(nextForm.schoolId, nextForm.schoolName),
    ]);
    setIsTrainingFeedbackFormOpen(false);
    setTrainingParticipantFeedbackRows([]);
    const defaultFacilitator = createEmptyTrainingFacilitatorRow();
    setTrainingFacilitatorRows([defaultFacilitator]);
    setSelectedTrainingFacilitatorId(defaultFacilitator.id);
    setFacilitatorGeneralObservation("");
    setFacilitatorWhatWentWell("");
    setFacilitatorChallenges("");
    setFacilitatorActionsRecommendations("");
    setFacilitatorNextStep("");
    setFacilitatorFeedbackPhotoFileName("");
    setIsFormOpen(true);
    setVisitStep(1);
    setSelectedFiles([]);
    setFileInputKey((value) => value + 1);
    setEvidenceItems([]);
    setSchoolContacts([]);
    setVisitNextActions([{ id: `${Date.now()}-0`, action: "", ownerContactId: "", dueDate: "" }]);
    setInsightRecommendationRows([]);
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
    const hydratedPayload = applySchoolGeoPayload(nextPayload, matchedSchool);

    if (config.module === "visit") {
      if (!String(nextPayload.coachObserver ?? "").trim()) {
        nextPayload.coachObserver = record.createdByName;
      }
      if (!String(nextPayload.visitStatus ?? "").trim()) {
        nextPayload.visitStatus = "completed";
      }
      if (!String(nextPayload.implementationStatus ?? "").trim()) {
        nextPayload.implementationStatus = "started";
      }
      if (!String(nextPayload.demoDelivered ?? "").trim()) {
        nextPayload.demoDelivered = "yes";
      }
      if (!String(nextPayload.leadershipMeetingHeld ?? "").trim()) {
        nextPayload.leadershipMeetingHeld = "yes";
      }
    }

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
      followUpType: record.followUpType ?? "school_visit",
      followUpOwnerUserId: record.followUpOwnerUserId ? String(record.followUpOwnerUserId) : defaultFollowUpOwnerId,
      status: record.status,
      reviewNote: record.reviewNote ?? "",
      payload: hydratedPayload,
    });
    if (config.module === "training") {
      const parsedBundle = parseTrainingFeedbackBundle(
        String(hydratedPayload.trainingFeedbackBundleJson ?? "").trim(),
      );
      if (parsedBundle) {
        setTrainingParticipantFeedbackRows(
          parsedBundle.participants.length > 0
            ? parsedBundle.participants.map((row) => ({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                contactId: row.contactId ? String(row.contactId) : "",
                contactUid: row.contactUid ?? "",
                participantName: row.participantName,
                changedThinking: row.changedThinking,
                improveReading: row.improveReading,
              }))
            : [],
        );
        const facilitators =
          parsedBundle.facilitators.length > 0
            ? parsedBundle.facilitators
            : [createEmptyTrainingFacilitatorRow()];
        setTrainingFacilitatorRows(facilitators);
        setSelectedTrainingFacilitatorId(
          parsedBundle.selectedFacilitatorId || facilitators[0]?.id || "",
        );
        setFacilitatorGeneralObservation(parsedBundle.facilitatorFeedback.generalObservation);
        setFacilitatorWhatWentWell(parsedBundle.facilitatorFeedback.whatWentWell);
        setFacilitatorChallenges(parsedBundle.facilitatorFeedback.challenges);
        setFacilitatorActionsRecommendations(
          parsedBundle.facilitatorFeedback.actionsRecommendations,
        );
        setFacilitatorNextStep(parsedBundle.facilitatorFeedback.nextStep);
        setFacilitatorFeedbackPhotoFileName(parsedBundle.facilitatorFeedback.photoFileName);
      } else {
        setTrainingParticipantFeedbackRows([]);
        const fallbackFacilitator = createEmptyTrainingFacilitatorRow();
        setTrainingFacilitatorRows([fallbackFacilitator]);
        setSelectedTrainingFacilitatorId(fallbackFacilitator.id);
        setFacilitatorGeneralObservation(
          String(hydratedPayload.facilitatorGeneralObservation ?? "").trim(),
        );
        setFacilitatorWhatWentWell(String(hydratedPayload.what_went_well_trainer ?? "").trim());
        setFacilitatorChallenges(String(hydratedPayload.challenges_trainer ?? "").trim());
        setFacilitatorActionsRecommendations(
          String(hydratedPayload.recommendations_next_training_trainer ?? "").trim(),
        );
        setFacilitatorNextStep(String(hydratedPayload.facilitatorNextStep ?? "").trim());
        setFacilitatorFeedbackPhotoFileName(
          String(hydratedPayload.feedbackPhotoFileName ?? "").trim(),
        );
      }
    }
    setIsTrainingFeedbackFormOpen(false);
    setIsFormOpen(true);
    setVisitStep(1);
    setVisitNextActions(parseVisitNextActions(nextPayload.leadershipNextActionsJson));
    const recIds = Array.isArray(hydratedPayload.insightsRecommendationsRecIds)
      ? hydratedPayload.insightsRecommendationsRecIds
      : [];
    const parsedRecRows = parseInsightRecommendationRows(
      hydratedPayload.insightsRecommendationsRecJson,
    );
    const recRowsById = new Map(parsedRecRows.map((row) => [row.recId, row]));
    const mergedRows: InsightRecommendationRow[] = recIds.map((recId) => {
      const existing = recRowsById.get(recId);
      return existing ?? {
        recId,
        priority: "medium" as InsightRecommendationPriority,
        notes: "",
      };
    });
    setInsightRecommendationRows(mergedRows);
    setSelectedFiles([]);
    setFileInputKey((value) => value + 1);
    setFeedback({ kind: "idle", message: "" });
  }, [config, defaultFollowUpOwnerId, initialSchools, schoolsById, schoolsByName]);

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
    if (!isFormOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFormOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFormOpen]);

  useEffect(() => {
    if (!isFormOpen) {
      return;
    }

    const interval = window.setInterval(() => {
      const snapshot = {
        ...formState,
        egraLearners,
        trainingParticipants,
        trainingParticipantFeedbackRows,
        trainingFacilitatorRows,
        selectedTrainingFacilitatorId,
        facilitatorGeneralObservation,
        facilitatorWhatWentWell,
        facilitatorChallenges,
        facilitatorActionsRecommendations,
        facilitatorNextStep,
        facilitatorFeedbackPhotoFileName,
        visitNextActions,
        insightRecommendationRows,
        module: config.module,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(draftStorageKey, JSON.stringify(snapshot));
      setAutosaveAt(snapshot.savedAt);
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    config.module,
    draftStorageKey,
    formState,
    egraLearners,
    isFormOpen,
    trainingParticipants,
    trainingParticipantFeedbackRows,
    trainingFacilitatorRows,
    selectedTrainingFacilitatorId,
    facilitatorGeneralObservation,
    facilitatorWhatWentWell,
    facilitatorChallenges,
    facilitatorActionsRecommendations,
    facilitatorNextStep,
    facilitatorFeedbackPhotoFileName,
    visitNextActions,
    insightRecommendationRows,
  ]);

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
    if (!isTrainingModule || trainingParticipantFeedbackRows.length > 0) {
      return;
    }
    const seededRows = trainingParticipants
      .filter((row) => row.contactId.trim() || row.contactUid.trim() || row.participantName.trim())
      .map((row) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        contactId: row.contactId.trim(),
        contactUid: row.contactUid.trim(),
        participantName: row.participantName.trim(),
        changedThinking: "",
        improveReading: "",
      }));
    if (seededRows.length > 0) {
      setTrainingParticipantFeedbackRows(seededRows);
    }
  }, [isTrainingModule, trainingParticipantFeedbackRows.length, trainingParticipants]);

  useEffect(() => {
    if (!isTrainingModule) {
      return;
    }
    if (trainingFacilitatorRows.length === 0) {
      const fallback = createEmptyTrainingFacilitatorRow();
      setTrainingFacilitatorRows([fallback]);
      setSelectedTrainingFacilitatorId(fallback.id);
      return;
    }
    if (
      !selectedTrainingFacilitatorId ||
      !trainingFacilitatorRows.some((entry) => entry.id === selectedTrainingFacilitatorId)
    ) {
      setSelectedTrainingFacilitatorId(trainingFacilitatorRows[0].id);
    }
  }, [isTrainingModule, selectedTrainingFacilitatorId, trainingFacilitatorRows]);

  useEffect(() => {
    if (isTrainingScheduled) {
      setIsTrainingFeedbackFormOpen(false);
    }
  }, [isTrainingScheduled]);

  const needsSchoolContacts = isFormOpen && (isVisitModule || isTrainingModule);
  const schoolIdNum = Number(formState.schoolId);
  const teacherRosterUrl = needsSchoolContacts && Number.isInteger(schoolIdNum) && schoolIdNum > 0
    ? `/api/portal/schools/roster?schoolId=${schoolIdNum}&type=teacher`
    : null;

  const { data: teacherRosterData, loading: loadingSchoolContacts } = useOfflineReference(
    teacherRosterUrl,
    async () => {
      const response = await fetch(teacherRosterUrl!);
      if (!response.ok) throw new Error("Failed to fetch teacher roster");
      return (await response.json()) as {
        roster?: Array<{
          contactId: number;
          contactUid: string;
          fullName: string;
          category: string;
        }>;
      };
    }
  );

  useEffect(() => {
    if (teacherRosterData?.roster) {
      const contacts = teacherRosterData.roster
        .filter((entry) => Number.isInteger(entry.contactId) && entry.contactId > 0)
        .map((entry) => ({
          contactId: Number(entry.contactId),
          contactUid: String(entry.contactUid ?? ""),
          fullName: String(entry.fullName ?? "").trim(),
          category: String(entry.category ?? "").trim(),
        }))
        .sort((left, right) => left.fullName.localeCompare(right.fullName));
      setSchoolContacts(contacts);
    } else if (!teacherRosterUrl) {
      setSchoolContacts([]);
    }
  }, [teacherRosterData, teacherRosterUrl]);

  useEffect(() => {
    if (!isVisitModule) {
      return;
    }
    if (!formState.schoolId.trim() && visitStep > 1) {
      setVisitStep(1);
    }
  }, [formState.schoolId, isVisitModule, visitStep]);

  useEffect(() => {
    if (!isVisitModule || visitCompletionGate.canComplete) {
      return;
    }
    setFormState((prev) => {
      const currentStatus = String(prev.payload.visitStatus ?? "")
        .trim()
        .toLowerCase();
      if (currentStatus === "scheduled") {
        return prev;
      }
      return {
        ...prev,
        payload: {
          ...prev.payload,
          visitStatus: "scheduled",
        },
      };
    });
  }, [isVisitModule, visitCompletionGate.canComplete]);

  useEffect(() => {
    if (!isVisitModule || visitImplementationUnlocked) {
      return;
    }
    if (visitStep > 1) {
      setVisitStep(1);
    }
  }, [isVisitModule, visitImplementationUnlocked, visitStep]);

  useEffect(() => {
    if (!isVisitModule) {
      return;
    }
    setFormState((prev) => {
      const currentPathway = String(prev.payload.visitPathway ?? "").trim();
      const nextPayload: FormPayloadState = { ...prev.payload };
      let changed = false;

      if (currentPathway !== visitPathway) {
        nextPayload.visitPathway = visitPathway;
        changed = true;
      }

      if (!String(prev.payload.coachObserver ?? "").trim()) {
        nextPayload.coachObserver = currentUser.fullName;
        changed = true;
      }

      if (!changed) {
        return prev;
      }

      return {
        ...prev,
        payload: nextPayload,
      };
    });
  }, [currentUser.fullName, isVisitModule, visitPathway]);

  useEffect(() => {
    const selectedRecIds = Array.isArray(formState.payload.insightsRecommendationsRecIds)
      ? sanitizeContactIds(formState.payload.insightsRecommendationsRecIds)
      : [];

    setInsightRecommendationRows((prev) => {
      const prevById = new Map(prev.map((row) => [row.recId, row]));
      return selectedRecIds.map((recId) => {
        const existing = prevById.get(recId);
        return existing ?? { recId, priority: "medium", notes: "" };
      });
    });
  }, [formState.payload.insightsRecommendationsRecIds]);

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
          trainingParticipantFeedbackRows?: unknown;
          trainingFacilitatorRows?: unknown;
          selectedTrainingFacilitatorId?: unknown;
          facilitatorGeneralObservation?: unknown;
          facilitatorWhatWentWell?: unknown;
          facilitatorChallenges?: unknown;
          facilitatorActionsRecommendations?: unknown;
          facilitatorNextStep?: unknown;
          facilitatorFeedbackPhotoFileName?: unknown;
          visitNextActions?: unknown;
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
          const mergedPayload = { ...buildDefaultPayload(config), ...(parsed.payload ?? {}) };
          if (config.module === "visit" && !String(mergedPayload.visitStatus ?? "").trim()) {
            mergedPayload.visitStatus = parsed.id ? "completed" : "scheduled";
          }

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
            followUpType: parsed.followUpType ?? "school_visit",
	            followUpOwnerUserId:
	              parsed.followUpOwnerUserId !== undefined && parsed.followUpOwnerUserId !== null
	                ? String(parsed.followUpOwnerUserId)
	                : defaultFollowUpOwnerId,
	            status: parsed.status ?? "Draft",
	            reviewNote: parsed.reviewNote ?? "",
	            payload: mergedPayload,
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
          if (config.module === "training") {
            const draftFeedbackRows = Array.isArray(parsed.trainingParticipantFeedbackRows)
              ? parsed.trainingParticipantFeedbackRows
                  .filter((row) => row && typeof row === "object")
                  .map((row) => {
                    const entry = row as Record<string, unknown>;
                    return {
                      id:
                        String(entry.id ?? "").trim() ||
                        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      contactId: String(entry.contactId ?? "").trim(),
                      contactUid: String(entry.contactUid ?? "").trim(),
                      participantName: String(entry.participantName ?? "").trim(),
                      changedThinking: String(entry.changedThinking ?? "").trim(),
                      improveReading: String(entry.improveReading ?? "").trim(),
                    } satisfies TrainingParticipantFeedbackRow;
                  })
              : [];
            setTrainingParticipantFeedbackRows(draftFeedbackRows);

            const draftFacilitators = Array.isArray(parsed.trainingFacilitatorRows)
              ? parsed.trainingFacilitatorRows
                  .filter((row) => row && typeof row === "object")
                  .map((row) => {
                    const entry = row as Record<string, unknown>;
                    return {
                      id:
                        String(entry.id ?? "").trim() ||
                        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      fullName: String(entry.fullName ?? "").trim(),
                      phone: String(entry.phone ?? "").trim(),
                    } satisfies TrainingFacilitatorRow;
                  })
              : [];
            const facilitators =
              draftFacilitators.length > 0
                ? draftFacilitators
                : [createEmptyTrainingFacilitatorRow()];
            setTrainingFacilitatorRows(facilitators);
            setSelectedTrainingFacilitatorId(
              String(parsed.selectedTrainingFacilitatorId ?? "").trim() || facilitators[0].id,
            );
            setFacilitatorGeneralObservation(
              String(parsed.facilitatorGeneralObservation ?? "").trim(),
            );
            setFacilitatorWhatWentWell(String(parsed.facilitatorWhatWentWell ?? "").trim());
            setFacilitatorChallenges(String(parsed.facilitatorChallenges ?? "").trim());
            setFacilitatorActionsRecommendations(
              String(parsed.facilitatorActionsRecommendations ?? "").trim(),
            );
            setFacilitatorNextStep(String(parsed.facilitatorNextStep ?? "").trim());
            setFacilitatorFeedbackPhotoFileName(
              String(parsed.facilitatorFeedbackPhotoFileName ?? "").trim(),
            );
            setIsTrainingFeedbackFormOpen(false);
          }
	          const payload = mergedPayload;
          const selectedRecIds = Array.isArray(payload.insightsRecommendationsRecIds)
            ? payload.insightsRecommendationsRecIds
            : [];
          const parsedRecRows = parseInsightRecommendationRows(
            payload.insightsRecommendationsRecJson,
          );
          const recRowsById = new Map(parsedRecRows.map((row) => [row.recId, row]));
          setInsightRecommendationRows(
            selectedRecIds.map((recId) => {
              const existing = recRowsById.get(recId);
              return existing ?? { recId, priority: "medium", notes: "" };
            }),
          );
          if (config.module === "visit") {
            setVisitNextActions(
              parseVisitNextActions(parsed.visitNextActions ?? payload.leadershipNextActionsJson),
            );
            setVisitStep(1);
          }
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
    defaultFollowUpOwnerId,
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
    setFormState((prev) => {
      let nextFollowUpDate = prev.followUpDate;
      let nextFollowUpType = prev.followUpType;
      let nextFollowUpOwnerUserId = prev.followUpOwnerUserId;

      if (key === "followUpDate") nextFollowUpDate = Array.isArray(value) ? value[0] ?? "" : value;
      if (key === "followUpType") nextFollowUpType = Array.isArray(value) ? value[0] ?? "school_visit" : (value as "school_visit" | "virtual_check_in");
      if (key === "followUpOwnerUserId") nextFollowUpOwnerUserId = Array.isArray(value) ? value[0] ?? "" : value;

      const nextPayload = { ...prev.payload, [key]: value };

      if (key === "trainingRegion" || key === "region") {
        if (typeof nextPayload.trainingSubRegion !== "undefined") nextPayload.trainingSubRegion = "";
        if (typeof nextPayload.subRegion !== "undefined") nextPayload.subRegion = "";
        if (typeof nextPayload.trainingDistrict !== "undefined") nextPayload.trainingDistrict = "";
        if (typeof nextPayload.district !== "undefined") nextPayload.district = "";
      }

      if (key === "trainingSubRegion" || key === "subRegion") {
        if (typeof nextPayload.trainingDistrict !== "undefined") nextPayload.trainingDistrict = "";
        if (typeof nextPayload.district !== "undefined") nextPayload.district = "";
      }

      return {
        ...prev,
        followUpDate: nextFollowUpDate,
        followUpType: nextFollowUpType,
        followUpOwnerUserId: nextFollowUpOwnerUserId,
        payload: nextPayload,
      };
    });
  }, []);

  const updateTrainingParticipant = useCallback(
    (index: number, key: keyof TrainingParticipantRow, value: string | boolean) => {
      const schoolForSelection =
        key === "schoolAccountId" && typeof value === "string" && value
          ? schoolsById.get(Number(value)) ?? null
          : null;
      if (config.module === "training" && schoolForSelection) {
        setFormState((prev) => ({
          ...prev,
          payload: applySchoolGeoPayload(prev.payload, schoolForSelection),
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
              schoolAccountId: String(value),
              schoolAttachedTo: schoolForSelection?.name ?? "",
            };
          }
          if (key === "role" && typeof value === "string") {
            return { ...row, role: normalizeParticipantRole(value) };
          }
          if (key === "gender" && typeof value === "string") {
            return { ...row, gender: normalizeParticipantGender(value) };
          }
          if (key === "participantType" && typeof value === "string") {
            return { ...row, participantType: normalizeParticipantType(value) || "In Person" };
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

  const nextLearnerShortId = useCallback((learnerNo: number) => {
    return `LR-${String(learnerNo).padStart(4, "0")}`;
  }, []);

  const handleOpenEgraModal = useCallback(() => {
    const nextIndex = egraLearners.findIndex((row) => !rowHasAssessmentData(row));
    const targetIndex = nextIndex === -1 ? egraLearners.length : nextIndex;
    const nextNo = targetIndex + 1;

    setModalLearnerNo(nextNo);
    setModalLearnerId(nextLearnerShortId(nextNo));
    setIsEgraModalOpen(true);
  }, [egraLearners, nextLearnerShortId]);

  const downloadAssessmentTemplate = useCallback(async (format: "csv" | "xlsx") => {
    try {
      if (format === "csv") {
        const csvContent = buildAssessmentTemplateCsv();
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "assessment-upload-template.csv";
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(ASSESSMENT_IMPORT_TEMPLATE_ROWS, {
        header: [...ASSESSMENT_IMPORT_TEMPLATE_HEADERS],
      });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "AssessmentTemplate");
      const binary = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([binary], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "assessment-upload-template.xlsx";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not generate template file.";
      setFeedback({ kind: "error", message });
    }
  }, []);

  const openAssessmentImportPicker = useCallback(() => {
    assessmentImportInputRef.current?.click();
  }, []);

  const fetchAssessmentSchoolLearners = useCallback(
    async (schoolId: number): Promise<AssessmentImportRosterLearner[]> => {
      const url = `/api/portal/schools/roster?schoolId=${schoolId}&type=learner`;
      const { offlineDb } = await import("@/lib/offline-db");

      try {
        if (typeof navigator !== "undefined" && navigator.onLine) {
          const response = await fetch(url, { cache: "no-store" });
          const json = (await response.json().catch(() => ({}))) as {
            roster?: AssessmentImportRosterLearner[];
            error?: string;
          };
          if (!response.ok) {
            throw new Error(json.error ?? "Could not load school learner roster.");
          }
          const roster = Array.isArray(json.roster) ? json.roster : [];
          
          await offlineDb.referenceData.put({
            key: url,
            data: { roster },
            updatedAt: new Date().toISOString()
          }).catch(console.error);

          return roster;
        }
      } catch (err) {
        console.warn("Network fetch for assessment learners failed, attempting cache fallback", err);
      }

      // Offline fallback
      const cachedItem = await offlineDb.referenceData.get(url).catch(() => null);
      if (cachedItem?.data?.roster) {
        return cachedItem.data.roster as AssessmentImportRosterLearner[];
      }

      throw new Error("You are offline and no cached learner roster is available for this school.");
    },
    [],
  );

  const createAssessmentSchoolLearner = useCallback(
    async (
      schoolId: number,
      row: Pick<EgraLearnerRow, "learnerName" | "sex" | "age" | "classGrade">,
    ): Promise<AssessmentImportRosterLearner> => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
         throw new Error("Cannot create new learners during Excel import while offline. Please connect to the internet.");
      }
      
      const response = await fetch("/api/portal/schools/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          type: "learner",
          fullName: row.learnerName.trim(),
          gender: toRosterGender(row.sex),
          age: Number(row.age),
          classGrade: row.classGrade.trim(),
        }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        entry?: AssessmentImportRosterLearner;
        error?: string;
      };
      if (!response.ok || !json.entry) {
        throw new Error(json.error ?? "Could not create learner from import row.");
      }
      return json.entry;
    },
    [],
  );

  const assignImportedLearnerIdentifiers = useCallback(
    async (rows: EgraLearnerRow[], schoolId: number) => {
      const roster = await fetchAssessmentSchoolLearners(schoolId);
      const rosterByKey = new Map<string, AssessmentImportRosterLearner>();
      roster.forEach((entry) => {
        const key = getAssessmentImportLearnerKey({
          learnerName: entry.fullName,
          classGrade: entry.classGrade,
          age: String(entry.age),
          sex: fromRosterGender(entry.gender),
        });
        if (!rosterByKey.has(key)) {
          rosterByKey.set(key, entry);
        }
      });

      const missingRows: string[] = [];
      const resolvedRows: EgraLearnerRow[] = [];

      for (const row of rows) {
        const normalizedRow: EgraLearnerRow = {
          ...row,
          learnerName: row.learnerName.trim(),
          classGrade: row.classGrade.trim(),
          age: row.age.trim(),
        };
        const hasLearnerUid = normalizedRow.learnerUid.trim().length > 0;
        const learnerIdAsNumber = Number(normalizedRow.learnerId);
        const hasNumericLearnerId = Number.isInteger(learnerIdAsNumber) && learnerIdAsNumber > 0;
        if (hasLearnerUid || hasNumericLearnerId) {
          if (!normalizedRow.learnerId.trim() && hasLearnerUid) {
            normalizedRow.learnerId = normalizedRow.learnerUid.trim();
          }
          resolvedRows.push(normalizedRow);
          continue;
        }

        const missingFields: string[] = [];
        if (!normalizedRow.learnerName) {
          missingFields.push("learnerName");
        }
        if (!normalizedRow.classGrade) {
          missingFields.push("classGrade");
        }
        if (!normalizedRow.age || !Number.isFinite(Number(normalizedRow.age))) {
          missingFields.push("age");
        }
        if (!normalizedRow.sex) {
          missingFields.push("gender");
        }
        if (missingFields.length > 0) {
          missingRows.push(`row ${normalizedRow.no}: ${missingFields.join(", ")}`);
          resolvedRows.push(normalizedRow);
          continue;
        }

        const key = getAssessmentImportLearnerKey({
          learnerName: normalizedRow.learnerName,
          classGrade: normalizedRow.classGrade,
          age: normalizedRow.age,
          sex: normalizedRow.sex,
        });
        let matched = rosterByKey.get(key);
        if (!matched) {
          matched = await createAssessmentSchoolLearner(schoolId, normalizedRow);
          rosterByKey.set(key, matched);
        }
        resolvedRows.push({
          ...normalizedRow,
          learnerUid: matched.learnerUid,
          learnerId: matched.learnerUid,
          learnerName: matched.fullName,
          classGrade: matched.classGrade,
          sex: fromRosterGender(matched.gender) || normalizedRow.sex,
          age: String(matched.age),
        });
      }

      if (missingRows.length > 0) {
        throw new Error(
          `Auto-ID assignment needs learnerName, classGrade, gender, and age. Fix ${missingRows.join("; ")}.`,
        );
      }

      return resolvedRows;
    },
    [createAssessmentSchoolLearner, fetchAssessmentSchoolLearners],
  );

  const handleAssessmentImportFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) {
        return;
      }
      if (config.module !== "assessment") {
        event.target.value = "";
        return;
      }
      if (!formState.schoolId.trim()) {
        setFeedback({
          kind: "error",
          message: "Select a school account first before importing assessment rows.",
        });
        event.target.value = "";
        return;
      }

      setImportingAssessmentFile(true);
      try {
        const workbookRows = await parseAssessmentImportWorkbookRows(selectedFile);
        const classGrade = String(formState.payload.classLevel ?? "").trim() || "P1";
        const importedRows = mapAssessmentImportRows(workbookRows, classGrade);
        const schoolId = Number(formState.schoolId);
        const resolvedRows = await assignImportedLearnerIdentifiers(importedRows, schoolId);
        setEgraLearners(replaceWithImportedLearners(resolvedRows));
        setFeedback({
          kind: "success",
          message: `Imported ${resolvedRows.length} learner row(s) from ${selectedFile.name}. Learner IDs were auto-assigned from school roster records.`,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Assessment import failed. Use the system template and try again.";
        setFeedback({ kind: "error", message });
      } finally {
        setImportingAssessmentFile(false);
        event.target.value = "";
      }
    },
    [
      assignImportedLearnerIdentifiers,
      config.module,
      formState.payload.classLevel,
      formState.schoolId,
    ],
  );

  const upsertEgraLearnerRow = useCallback((learner: EgraLearner) => {
    setEgraLearners((prev) => {
      const newRows = [...prev];
      while (newRows.length < learner.no) {
        newRows.push(createEmptyEgraLearnerRow(newRows.length + 1));
      }

      const index = learner.no - 1;
      newRows[index] = {
        no: learner.no,
        learnerUid: learner.learnerUid ?? "",
        learnerId: learner.learnerId.trim() || learner.learnerUid || "",
        learnerName: learner.learnerName,
        classGrade: learner.classGrade,
        sex: learner.sex === "F" ? "F" : learner.sex === "M" ? "M" : "",
        age: String(learner.age),
        letterIdentification: String(learner.letterIdentification),
        soundIdentification: String(learner.soundIdentification),
        decodableWords: String(learner.decodableWords),
        undecodableWords: String(learner.undecodableWords),
        madeUpWords: String(learner.madeUpWords),
        storyReading: String(learner.storyReading),
        readingComprehension: String(learner.readingComprehension),
        fluencyLevel: learner.fluencyLevel,
      };
      return newRows;
    });
  }, []);

  const handleSaveLearner = useCallback(
    (learner: EgraLearner) => {
      upsertEgraLearnerRow(learner);
      const nextNo = learner.no + 1;
      if (nextNo <= EGRA_ROW_COUNT) {
        setModalLearnerNo(nextNo);
        setModalLearnerId(nextLearnerShortId(nextNo));
        return;
      }
      setIsEgraModalOpen(false);
    },
    [nextLearnerShortId, upsertEgraLearnerRow],
  );

  const handleSaveLearnerAndClose = useCallback(
    (learner: EgraLearner) => {
      upsertEgraLearnerRow(learner);
      setIsEgraModalOpen(false);
    },
    [upsertEgraLearnerRow],
  );

  const validateForm = useCallback((nextStatus: PortalRecordStatus) => {
    const enforceInsights = nextStatus !== "Draft";
    const requiresDistrict = config.module !== "training";
    const onlineTrainingMode =
      config.module === "training" &&
      isOnlineTrainingDeliveryMode(formState.payload.deliveryMode);
    const requiresRegion = !onlineTrainingMode;
    if (
      !formState.date ||
      (requiresRegion && !formState.region.trim()) ||
      (requiresDistrict && !formState.district.trim())
    ) {
      return requiresDistrict
        ? "Date, region, and district are required."
        : requiresRegion
          ? "Date and region are required."
          : "Date is required.";
    }
    if (!formState.programType.trim()) {
      return `${config.programTypeLabel} is required.`;
    }

    const selectedSchoolId = Number(formState.schoolId);
    const hasSelectedSchool =
      Number.isInteger(selectedSchoolId) && selectedSchoolId > 0 && schoolsById.has(selectedSchoolId);
    const normalizedVisitStatusForValidation =
      String(formState.payload.visitStatus ?? "").trim().toLowerCase() === "completed"
        ? "completed"
        : "scheduled";
    const isVisitScheduledDraft =
      config.module === "visit" &&
      nextStatus === "Draft" &&
      normalizedVisitStatusForValidation !== "completed";

    if (!hasSelectedSchool) {
      return "Select a valid school account.";
    }

    if (config.module === "training") {
      const deliveryMode = String(formState.payload.deliveryMode ?? "").trim().toLowerCase();
      if (!onlineTrainingMode && deliveryMode.includes("cluster")) {
        const clusterName = String(formState.payload.clusterName ?? "").trim();
        if (!clusterName) {
          return "Cluster name is required when delivery mode is Cluster-based.";
        }
      }

      if (!isTrainingScheduled) {
        const activeRows = trainingParticipants.filter((row) => rowHasTrainingParticipantData(row));
        if (activeRows.length === 0) {
          return "Add at least one participant.";
        }

        if (!formState.followUpDate) {
          return "Next follow-up date is required and must be at least 2 weeks after training.";
        }
        if (!formState.followUpType.trim()) {
          return "Follow-up type is required for training.";
        }
        if (!formState.followUpOwnerUserId.trim()) {
          return "Follow-up owner is required for training.";
        }
      }
    }

    if (formState.followUpDate && !isTrainingScheduled) {
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

    if (config.module === "visit") {
      if (nextStatus !== "Draft") {
        if (normalizedVisitStatusForValidation !== "completed") {
          return "Set visit status to Completed before submitting.";
        }
        if (!visitCompletionGate.canComplete) {
          return visitCompletionGate.reason || "Visit cannot be marked Completed yet.";
        }
      }

      if (!isVisitScheduledDraft) {
        const implementationStatusRaw = String(formState.payload.implementationStatus ?? "").trim();
        if (!implementationStatusRaw) {
          return "Implementation check is required.";
        }

        const classesImplementing = Array.isArray(formState.payload.classesImplementing)
          ? formState.payload.classesImplementing
          : [];
        const classesNotImplementing = Array.isArray(formState.payload.classesNotImplementing)
          ? formState.payload.classesNotImplementing
          : [];

        if (visitImplementationStatus === "partial") {
          if (classesImplementing.length === 0) {
            return "Select classes implementing for partial implementation.";
          }
          if (classesNotImplementing.length === 0) {
            return "Select classes not implementing for partial implementation.";
          }
          const overlap = classesImplementing.find((entry) => classesNotImplementing.includes(entry));
          if (overlap) {
            return `Class ${overlap} cannot be in both implementing and not implementing lists.`;
          }
        }

        if (visitRequiresDemoMeeting) {
          const validNextActions = visitNextActions.filter(
            (row) => row.action.trim() && row.ownerContactId.trim() && row.dueDate.trim(),
          );
          if (validNextActions.length === 0) {
            return "Add at least one next action with owner and due date.";
          }
        }
      }
    }

    for (const section of config.sections) {
      if (
        config.module === "visit" &&
        isVisitScheduledDraft &&
        !visitStepSectionIds.context.has(section.id)
      ) {
        continue;
      }
      for (const field of section.fields) {
        const isInsightField =
          field.key === "insightsKeyFindings" ||
          field.key === "insightsWhatWentWell" ||
          field.key === "insightsChallenges" ||
          field.key === "insightsRecommendationsRecIds" ||
          field.key === "insightsConclusionsNextSteps";

        if (!field.required || (!enforceInsights && isInsightField)) {
          continue;
        }

        if (config.module === "visit") {
          const isObservationField =
            visitObservationOnlyFieldKeys.has(field.key) || isVisitObservationField(field.key);
          const isDemoMeetingField = visitDemoMeetingFieldKeys.has(field.key);
          if (!visitAllowsObservation && isObservationField) {
            continue;
          }
          if (!visitRequiresDemoMeeting && isDemoMeetingField) {
            continue;
          }
          if (field.key === "leadershipNextActionsJson") {
            const validNextActions = visitNextActions.filter(
              (row) => row.action.trim() && row.ownerContactId.trim() && row.dueDate.trim(),
            );
            if (validNextActions.length === 0) {
              return "Add at least one next action with owner and due date.";
            }
            continue;
          }
        }
        if (
          config.module === "training" &&
          onlineTrainingMode &&
          trainingPhysicalFieldKeys.has(field.key)
        ) {
          continue;
        }
        if (
          config.module === "training" &&
          isTrainingScheduled &&
          !trainingScheduleEditableFieldKeys.has(field.key)
        ) {
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
            if (!participant.contactId.trim() && !participant.contactUid.trim()) {
              return `Participant ${index + 1}: select a participant from the school roster.`;
            }
            if (!participant.participantName.trim()) {
              return `Participant ${index + 1}: participant name is missing.`;
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
            if (participant.phoneContact.trim() && !validPhone.test(participant.phoneContact.trim())) {
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
          trainingAutoAttendanceKeys.has(field.key)
        ) {
          continue;
        }
        if (!String(value ?? "").trim()) {
          return `${field.label} is required.`;
        }
      }
    }

    if (enforceInsights) {
      const keyFindings = String(formState.payload.insightsKeyFindings ?? "").trim();
      const conclusions = String(formState.payload.insightsConclusionsNextSteps ?? "").trim();
      const selectedRecIds = Array.isArray(formState.payload.insightsRecommendationsRecIds)
        ? sanitizeContactIds(formState.payload.insightsRecommendationsRecIds)
        : [];

      if (!keyFindings) {
        return "Key findings are required for final submission.";
      }
      if (selectedRecIds.length === 0) {
        return "Select at least one REC recommendation for final submission.";
      }
      if (!conclusions) {
        return "Conclusions + next steps are required for final submission.";
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
    visitAllowsObservation,
    visitImplementationStatus,
    visitNextActions,
    visitRequiresDemoMeeting,
    visitCompletionGate,
    isTrainingScheduled,
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

      if (selectedSchool) {
        payload.region = selectedSchool.region;
        payload.subRegion = selectedSchool.subRegion;
        payload.district = selectedSchool.district;
        payload.subCounty = selectedSchool.subCounty;
        payload.parish = selectedSchool.parish;
        payload.schoolCode = selectedSchool.schoolCode;
      } else {
        if (formState.region.trim()) payload.region = formState.region.trim();
        if (formState.district.trim()) payload.district = formState.district.trim();
        const payloadSubRegion = String(formState.payload.subRegion ?? "").trim();
        const payloadSubCounty = String(formState.payload.subCounty ?? "").trim();
        const payloadParish = String(formState.payload.parish ?? "").trim();
        if (payloadSubRegion) payload.subRegion = payloadSubRegion;
        if (payloadSubCounty) payload.subCounty = payloadSubCounty;
        if (payloadParish) payload.parish = payloadParish;
      }

      const selectedInsightRecIds = sanitizeContactIds(
        Array.isArray(formState.payload.insightsRecommendationsRecIds)
          ? formState.payload.insightsRecommendationsRecIds
          : [],
      );
      const recommendationRowsById = new Map(
        insightRecommendationRows.map((row) => [row.recId, row]),
      );
      const serializedRecommendationRows = selectedInsightRecIds.map((recId) => {
        const existing = recommendationRowsById.get(recId);
        return {
          recId,
          priority: existing?.priority ?? "medium",
          notes: (existing?.notes ?? "").trim() || null,
        };
      });
      payload.insightsRecommendationsRecIds = selectedInsightRecIds;
      payload.insightsRecommendationsRecJson = JSON.stringify(serializedRecommendationRows);
      payload.insightsRecRecommendations = selectedInsightRecIds.join(", ");

      if (config.module === "visit") {
        payload.coachObserver = currentUser.fullName;
        payload.visitStatus = visitStatus;
        payload.implementationStatus = String(
          formState.payload.implementationStatus ?? "",
        ).trim();
        payload.visitPathway = visitPathway;
        payload.classesImplementing = sanitizeContactIds(
          Array.isArray(formState.payload.classesImplementing)
            ? formState.payload.classesImplementing
            : [],
        );
        payload.classesNotImplementing = sanitizeContactIds(
          Array.isArray(formState.payload.classesNotImplementing)
            ? formState.payload.classesNotImplementing
            : [],
        );

        const demoTeachersPresent = sanitizeContactIds(
          Array.isArray(formState.payload.demoTeachersPresentContactIds)
            ? formState.payload.demoTeachersPresentContactIds
            : [],
        );
        const leadershipAttendees = sanitizeContactIds(
          Array.isArray(formState.payload.leadershipAttendeesContactIds)
            ? formState.payload.leadershipAttendeesContactIds
            : [],
        );
        payload.demoTeachersPresentContactIds = demoTeachersPresent;
        payload.leadershipAttendeesContactIds = leadershipAttendees;
        payload.implementationResponsibleContactId = String(
          formState.payload.implementationResponsibleContactId ?? "",
        ).trim();

        const nextActions = visitNextActions
          .map((row) => ({
            action: row.action.trim(),
            ownerContactId: row.ownerContactId.trim(),
            dueDate: row.dueDate.trim(),
          }))
          .filter((row) => row.action && row.ownerContactId && row.dueDate);
        payload.leadershipNextActionsJson = JSON.stringify(nextActions);

        ["classSize", "learnerSpotCheckCount", "demoMinutes", "dailyReadingTimeMinutes"].forEach(
          (key) => {
            const raw = String(formState.payload[key] ?? "").trim();
            if (!raw) {
              delete payload[key];
            }
          },
        );

        const teacherContactId = String(formState.payload.teacherContactId ?? "").trim();
        const teacherContactUid = String(formState.payload.teacherContactUid ?? "").trim();
        const teacherUid = String(formState.payload.teacherUid ?? "").trim();
        const teacherGender = String(formState.payload.teacherGender ?? "").trim();
        if (visitAllowsObservation) {
          if (teacherContactId) {
            payload.teacherContactId = Number(teacherContactId);
          }
          if (teacherContactUid) {
            payload.teacherContactUid = teacherContactUid;
          }
          if (teacherUid) {
            payload.teacherUid = teacherUid;
          }
          if (teacherGender) {
            payload.teacherGender = teacherGender;
          }
        }

        if (!visitAllowsObservation) {
          Object.keys(payload).forEach((key) => {
            if (isVisitObservationField(key) || visitObservationOnlyFieldKeys.has(key)) {
              delete payload[key];
            }
          });
        }

      }

      if (config.module === "training") {
        payload.followUpType = isTrainingScheduled ? "" : formState.followUpType.trim();
        payload.followUpOwnerUserId =
          isTrainingScheduled || !formState.followUpOwnerUserId.trim()
            ? null
            : Number(formState.followUpOwnerUserId.trim());

        const participantFeedbackRows = trainingParticipantFeedbackRows
          .map((row) => ({
            contactId: row.contactId.trim() ? Number(row.contactId.trim()) : null,
            contactUid: row.contactUid.trim() || null,
            participantName: row.participantName.trim(),
            changedThinking: row.changedThinking.trim(),
            improveReading: row.improveReading.trim(),
          }))
          .filter(
            (row) =>
              row.contactId !== null ||
              row.contactUid ||
              row.participantName ||
              row.changedThinking ||
              row.improveReading,
          );
        const facilitatorRows = trainingFacilitatorRows
          .map((row) => ({
            id: row.id,
            fullName: row.fullName.trim(),
            phone: row.phone.trim(),
          }))
          .filter((row) => row.fullName || row.phone);
        const selectedFacilitator =
          facilitatorRows.find((row) => row.id === selectedTrainingFacilitatorId) ??
          facilitatorRows[0] ??
          null;
        payload.trainingFeedbackBundleJson = JSON.stringify({
          participants: participantFeedbackRows,
          facilitators: facilitatorRows,
          selectedFacilitatorId: selectedFacilitator?.id ?? "",
          facilitatorFeedback: {
            generalObservation: facilitatorGeneralObservation.trim(),
            whatWentWell: facilitatorWhatWentWell.trim(),
            challenges: facilitatorChallenges.trim(),
            actionsRecommendations: facilitatorActionsRecommendations.trim(),
            nextStep: facilitatorNextStep.trim(),
            photoFileName: facilitatorFeedbackPhotoFileName.trim(),
          },
        } satisfies TrainingFeedbackBundle);
        payload.how_training_changed_teaching =
          participantFeedbackRows.find((row) => row.changedThinking)?.changedThinking ?? "";
        payload.what_you_will_do_to_improve_reading_levels =
          participantFeedbackRows.find((row) => row.improveReading)?.improveReading ?? "";
        payload.what_went_well_trainer = facilitatorWhatWentWell.trim();
        payload.challenges_trainer = facilitatorChallenges.trim();
        payload.recommendations_next_training_trainer =
          facilitatorActionsRecommendations.trim();
        payload.facilitatorGeneralObservation = facilitatorGeneralObservation.trim();
        payload.facilitatorNextStep = facilitatorNextStep.trim();
        payload.facilitatorName = selectedFacilitator?.fullName ?? "";
        payload.facilitatorPhone = selectedFacilitator?.phone ?? "";
        payload.feedbackPhotoFileName = facilitatorFeedbackPhotoFileName.trim();
        payload.facilitators = facilitatorRows
          .map((row) => row.fullName)
          .filter(Boolean)
          .join(", ");
      }

      if (participantField) {
        const participantRows = trainingParticipants
          .filter((row) => rowHasTrainingParticipantData(row))
          .map((row) => {
            const participantSchoolId = Number(row.schoolAccountId);
            const mappedSchool =
              Number.isInteger(participantSchoolId) && participantSchoolId > 0
                ? schoolsById.get(participantSchoolId) ?? null
                : selectedSchool ?? null;
            return {
              contactId: row.contactId.trim() ? Number(row.contactId.trim()) : null,
              contactUid: row.contactUid.trim() || null,
              participantName: row.participantName.trim(),
              schoolAttachedTo: mappedSchool?.name ?? row.schoolAttachedTo.trim(),
              schoolAccountId: mappedSchool?.id ?? null,
              schoolAccountCode: mappedSchool?.schoolCode ?? null,
              role: row.role,
              gender: row.gender,
              phoneContact: row.phoneContact.trim(),
              email: row.email.trim(),
              participantType: row.participantType || "In Person",
              invited: row.invited,
              confirmed: row.confirmed,
              attended: row.attended,
            };
          });

        const primaryParticipantSchool =
          participantRows.length > 0 ? selectedSchool ?? null : null;
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
        payload.totalInvited = participantRows.filter((row) => row.invited).length;
        payload.confirmedTotal = participantRows.filter((row) => row.confirmed).length;
        payload.classroomTeachers = participantRows.filter((row) => row.role === "Teacher").length;
        payload.schoolLeaders = participantRows.filter((row) => row.role === "Leader").length;
        payload.femaleCount = participantRows.filter((row) => row.attended && row.gender === "Female").length;
        payload.maleCount = participantRows.filter((row) => row.attended && row.gender === "Male").length;
        payload.teachersFemale = participantRows.filter(
          (row) => row.attended && row.role === "Teacher" && row.gender === "Female",
        ).length;
        payload.teachersMale = participantRows.filter(
          (row) => row.attended && row.role === "Teacher" && row.gender === "Male",
        ).length;
        payload.schoolLeadersFemale = participantRows.filter(
          (row) => row.attended && row.role === "Leader" && row.gender === "Female",
        ).length;
        payload.schoolLeadersMale = participantRows.filter(
          (row) => row.attended && row.role === "Leader" && row.gender === "Male",
        ).length;
        payload.numberAttended = participantRows.filter((row) => row.attended).length;

        return {
          module: config.module,
          date: formState.date,
          district: resolvedDistrict,
          schoolId:
            resolvedPrimarySchool?.id ??
            (Number.isInteger(selectedSchoolId) ? selectedSchoolId : 0),
          schoolName: resolvedSchoolName,
          programType: formState.programType.trim(),
          followUpDate:
            config.module === "training" && isTrainingScheduled
              ? undefined
              : config.module === "visit" && !visitImplementationUnlocked
                ? undefined
                : formState.followUpDate.trim() || undefined,
          followUpType:
            config.module === "training"
              ? isTrainingScheduled
                ? undefined
                : formState.followUpType.trim() || undefined
              : config.module === "visit" && visitImplementationUnlocked
                ? (formState.followUpType.trim() as "school_visit" | "virtual_check_in") || undefined
                : undefined,
          followUpOwnerUserId:
            config.module === "training" &&
              !isTrainingScheduled &&
              formState.followUpOwnerUserId.trim()
              ? Number(formState.followUpOwnerUserId.trim())
              : undefined,
          status: nextStatus,
          payload,
        };
      }

      if (config.module === "assessment") {
        const classGrade = String(formState.payload.classLevel ?? "").trim() || "P1";
        const classMastery = computeOneTestStyleMasteryAssessment({
          grade: classGrade,
          legacyScores: {
            letterIdentificationScore: egraSummary.averages.class.letterIdentification,
            soundIdentificationScore: egraSummary.averages.class.soundIdentification,
            decodableWordsScore: egraSummary.averages.class.decodableWords,
            undecodableWordsScore: egraSummary.averages.class.undecodableWords,
            madeUpWordsScore: egraSummary.averages.class.madeUpWords,
            storyReadingScore: egraSummary.averages.class.storyReading,
            readingComprehensionScore: egraSummary.averages.class.readingComprehension,
          },
        });
        payload.egraLearnersData = JSON.stringify(egraSummary.rowsForPayload);
        payload.egraSummaryData = JSON.stringify(egraSummary.averages);
        payload.egraProfileData = JSON.stringify(egraSummary.profile);
        payload.assessmentModelVersion = ASSESSMENT_MODEL_VERSION_UG_MASTERY_ONETEST_STYLE_V1;
        payload.benchmarkVersion = "UG-MASTERY-BENCHMARK-v1";
        payload.scoringProfileVersion = "UG-MASTERY-SCORING-v1";
        payload.readingStageLabel = classMastery.readingStageLabel;
        payload.benchmarkGradeLevel = classMastery.benchmarkGradeLevel;
        payload.expectedVsActualStatus = classMastery.expectedVsActualStatus;
        payload.masteryProfileSummary = classMastery.masteryProfileSummary;
        payload.learnersAssessed = egraSummary.learnersAssessed;
        payload.nonReaders = egraSummary.profile.nonReaders;
        payload.emergingReaders = egraSummary.profile.emerging;
        payload.developingReaders = egraSummary.profile.developing;
        payload.transitionalReaders = egraSummary.profile.transitional;
        payload.fluentReaders = egraSummary.profile.fluent;
        payload.letterIdentificationScore = egraSummary.averages.class.letterIdentification;
        payload.soundIdentificationScore = egraSummary.averages.class.soundIdentification;
        payload.decodableWordsScore = egraSummary.averages.class.decodableWords;
        payload.undecodableWordsScore = egraSummary.averages.class.undecodableWords;
        payload.madeUpWordsScore = egraSummary.averages.class.madeUpWords;
        payload.storyReadingScore = egraSummary.averages.class.storyReading;
        payload.readingComprehensionScore = egraSummary.averages.class.readingComprehension;
        payload.masteryDomainInputs = JSON.stringify({
          phonemic_awareness: {
            domainScoreRaw: egraSummary.averages.class.letterIdentification,
            domainAccuracy: egraSummary.averages.class.letterIdentification,
            domainMasteryStatus: classMastery.domains.phonemic_awareness.domainMasteryStatus,
          },
          grapheme_phoneme_correspondence: {
            domainScoreRaw: egraSummary.averages.class.soundIdentification,
            domainAccuracy: egraSummary.averages.class.soundIdentification,
            domainMasteryStatus:
              classMastery.domains.grapheme_phoneme_correspondence.domainMasteryStatus,
          },
          blending_decoding: {
            domainScoreRaw: egraSummary.averages.class.decodableWords,
            domainAccuracy: egraSummary.averages.class.decodableWords,
            domainMasteryStatus: classMastery.domains.blending_decoding.domainMasteryStatus,
          },
          word_recognition_fluency: {
            domainScoreRaw: egraSummary.averages.class.madeUpWords,
            domainAccuracy: egraSummary.averages.class.madeUpWords,
            domainMasteryStatus:
              classMastery.domains.word_recognition_fluency.domainMasteryStatus,
          },
          sentence_paragraph_construction: {
            domainScoreRaw: egraSummary.averages.class.storyReading,
            domainAccuracy: egraSummary.averages.class.storyReading,
            domainMasteryStatus:
              classMastery.domains.sentence_paragraph_construction.domainMasteryStatus,
          },
          comprehension: {
            domainScoreRaw: egraSummary.averages.class.readingComprehension,
            domainAccuracy: egraSummary.averages.class.readingComprehension,
            domainMasteryStatus: classMastery.domains.comprehension.domainMasteryStatus,
          },
        });
        if (typeof payload.storiesPublished !== "number") {
          payload.storiesPublished = 0;
        }
      }

      if (config.module === "visit") {
        payload.visitPathway = visitPathway;

        if (!String(payload.nextVisitFocus ?? "").trim()) {
          payload.nextVisitFocus =
            visitPathway === "demo_and_meeting"
              ? "Verify implementation start plan, leadership agreements, and classroom launch readiness."
              : visitPathway === "mixed"
                ? "Track rollout in non-implementing classes while deepening coaching support in implementing classes."
                : "Follow up on observation gaps, teacher actions, and learner outcomes in the next coaching cycle.";
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
        followUpDate:
          config.module === "training" && isTrainingScheduled
            ? undefined
            : config.module === "visit" && !visitImplementationUnlocked
              ? undefined
              : formState.followUpDate.trim() || undefined,
        followUpType:
          config.module === "training"
            ? isTrainingScheduled
              ? undefined
              : formState.followUpType.trim() || undefined
            : config.module === "visit" && visitImplementationUnlocked
              ? (formState.followUpType.trim() as "school_visit" | "virtual_check_in") || undefined
              : undefined,
        followUpOwnerUserId:
          config.module === "training" &&
            !isTrainingScheduled &&
            formState.followUpOwnerUserId.trim()
            ? Number(formState.followUpOwnerUserId.trim())
            : undefined,
        status: nextStatus,
        payload,
      };
    },
    [
      config,
      currentUser.fullName,
      egraSummary,
      facilitatorActionsRecommendations,
      facilitatorChallenges,
      facilitatorFeedbackPhotoFileName,
      facilitatorGeneralObservation,
      facilitatorNextStep,
      facilitatorWhatWentWell,
      formState,
      isTrainingScheduled,
      participantField,
      selectedTrainingFacilitatorId,
      schoolsById,
      trainingFacilitatorRows,
      trainingParticipantFeedbackRows,
      trainingParticipants,
      visitAllowsObservation,
      visitImplementationUnlocked,
      visitNextActions,
      visitPathway,
      visitRequiresDemoMeeting,
      visitStatus,
    ],
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
    async (recordId: number | string, body: ReturnType<typeof buildRequestBody>) => {
      // S3 uploads require network. If offline, skip (they can upload later when online).
      if (typeof navigator !== "undefined" && !navigator.onLine) {
         return;
      }
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

        try {
          const response = await fetch("/api/portal/evidence", {
            method: "POST",
            body: evidenceForm,
          });
          if (!response.ok) {
            console.warn("Evidence upload failed", await response.json());
          }
        } catch (err) {
          console.error("Network error uploading evidence", err);
        }
      }

      setSelectedFiles([]);
      setFileInputKey((value) => value + 1);
      
      // Only reload if the record actually exists on the server (has an integer ID)
      if (typeof recordId === "number" || !String(recordId).startsWith("local-")) {
          await loadEvidence(Number(recordId));
      }
    },
    [buildRequestBody, config.module, loadEvidence, selectedFiles],
  );

  const submitRecord = useCallback(
    async (nextStatus: PortalRecordStatus) => {
      const validationError = validateForm(nextStatus);
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
        const { createOfflineRecord, updateOfflineRecord } = await import("@/lib/offline-record-manager");
        
        // Use Dexie offline-first mutation layer
        let savedId: string | number;
        if (formState.id) {
           const result = await updateOfflineRecord(config.module, formState.id, body);
           savedId = result.id;
        } else {
           const result = await createOfflineRecord(config.module, body);
           savedId = result.id;
        }

        const isOfflineMode = typeof navigator !== "undefined" && !navigator.onLine;

        // Mock saved record shape for local UI state
        const saved = { 
          ...body, 
          id: savedId as number, 
          status: nextStatus, 
          recordCode: `LOC-${savedId}`,
          createdByUserId: currentUser.id,
          createdByName: currentUser.fullName,
          reviewNote: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as PortalRecord;

        setRecords((prev) => {
          const exists = prev.some((item) => item.id == saved.id);
          if (exists) {
            return prev.map((item) => (item.id == saved.id ? saved : item));
          }
          return [saved, ...prev];
        });
        
        setFormState((prev) => ({
          ...prev,
          id: saved.id,
          status: saved.status,
        }));
        
        window.localStorage.removeItem(draftStorageKey);

        // Best-effort evidence upload (fails silently if offline)
        await uploadEvidence(saved.id, body);

        setFeedback({
          kind: isOfflineMode ? "idle" : "success",
          message: isOfflineMode 
            ? "You are offline. Record cached securely to device and will background sync automatically when network returns."
            : nextStatus === "Draft"
               ? `Draft saved locally.`
               : `Record submitted and queued.`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        setFeedback({ kind: "error", message });
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

      <section className="portal-table-toolbar">
        <div className="portal-search-box">
          <input
            type="text"
            placeholder="Search records (School, District, Status...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="portal-toolbar-actions">
          <button
            className={`portal-filter-chip ${filters.status === "Submitted" ? "active" : ""}`}
            onClick={() => {
              const nextStatus = filters.status === "Submitted" ? "" : "Submitted";
              const nextFilters = { ...filters, status: nextStatus };
              setFilters(nextFilters);
              void fetchRecords(nextFilters);
            }}
          >
            Submitted
          </button>
          <button
            className={`portal-filter-chip ${filters.status === "Draft" ? "active" : ""}`}
            onClick={() => {
              const nextStatus = filters.status === "Draft" ? "" : "Draft";
              const nextFilters = { ...filters, status: nextStatus };
              setFilters(nextFilters);
              void fetchRecords(nextFilters);
            }}
          >
            Drafts
          </button>
          <button
            className="button button-ghost"
            type="button"
            onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
          >
            {isAdvancedFiltersOpen ? "Hide Filters" : "Advanced Filters"}
          </button>
          {canExport ? (
            <a href={exportUrl} className="button button-ghost">
              Export
            </a>
          ) : null}
        </div>
      </section>

      {isAdvancedFiltersOpen && (
        <section className="portal-advanced-filters-panel">
          <form className="portal-filter-grid portal-filter-grid-pretty" onSubmit={handleFiltersSubmit}>
            <label className="portal-filter-field">
              <span className="portal-filter-field-label">Date from</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
                }
              />
            </label>
            <label className="portal-filter-field">
              <span className="portal-filter-field-label">Date to</span>
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
                  <optgroup key={entry.region} label={entry.region}>
                    <option value={entry.region}>All {entry.region}</option>
                    {entry.subRegions.map((sr) => (
                      <option key={sr.subRegion} value={sr.subRegion}>
                        {sr.subRegion}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="portal-filter-field">
              <span className="portal-filter-field-label">District</span>
              <select
                value={filters.district}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, district: event.target.value }))
                }
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
              <span className="portal-filter-field-label">Program Type</span>
              <input
                placeholder="e.g. Coaching"
                value={filters.programType}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, programType: event.target.value }))
                }
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
            {canReview && initialUsers && initialUsers.length > 0 && (
              <label className="portal-filter-field">
                <span className="portal-filter-field-label">Created by</span>
                <select
                  value={filters.createdBy}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, createdBy: event.target.value }))
                  }
                >
                  <option value="">All staff</option>
                  {initialUsers.map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {user.fullName}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="action-row portal-filter-actions">
              <button className="button" type="submit" disabled={loadingRecords}>
                {loadingRecords ? "Applying..." : "Apply Filters"}
              </button>
              <button
                className="button button-ghost"
                type="button"
                onClick={() => void resetFilters()}
              >
                Reset
              </button>
            </div>
          </form>
        </section>
      )}

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
              {records.filter(r => {
                if (!searchTerm) return true;
                const search = searchTerm.toLowerCase();
                return (
                  r.recordCode.toLowerCase().includes(search) ||
                  r.schoolName.toLowerCase().includes(search) ||
                  r.district.toLowerCase().includes(search) ||
                  r.status.toLowerCase().includes(search)
                );
              }).length === 0 ? (
                <tr>
                  <td colSpan={8}>No records match your search or filters.</td>
                </tr>
              ) : (
                records
                  .filter(r => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    return (
                      r.recordCode.toLowerCase().includes(search) ||
                      r.schoolName.toLowerCase().includes(search) ||
                      r.district.toLowerCase().includes(search) ||
                      r.status.toLowerCase().includes(search)
                    );
                  })
                  .map((record) => (
                    <tr key={record.id}>
                      <td>{record.recordCode}</td>
                      <td>{record.date ? new Date(record.date).toLocaleDateString("en-GB") : "-"}</td>
                      <td>{record.district}</td>
                      <td>{record.schoolName}</td>
                      <td>{record.programType ?? "-"}</td>
                      <td>{record.status}</td>
                      <td>{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "-"}</td>
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
                        <button
                          className="button button-ghost"
                          type="button"
                          style={{color: "var(--charius-red)"}}
                          onClick={async () => {
                            const reason = window.prompt("Are you sure you want to delete this record? Please provide a reason:");
                            if (reason !== null) {
                              try {
                                const res = await fetch(`/api/portal/records/${record.id}?reason=${encodeURIComponent(reason)}`, {
                                  method: "DELETE"
                                });
                                if (res.ok) {
                                  setFeedback({ kind: "success", message: "Record deleted." });
                                  void fetchRecords(true);
                                } else {
                                  const err = await res.json();
                                  setFeedback({ kind: "error", message: err.error || "Failed to delete" });
                                }
                              } catch (e) {
                                setFeedback({ kind: "error", message: "Network error" });
                              }
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isFormOpen
        ? createPortal(
          <div
            className="floating-donor-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`${config.pageTitle} Form`}
            onClick={() => setIsFormOpen(false)}
          >
            <div className="card floating-donor-dialog floating-dialog-wide" onClick={(e) => e.stopPropagation()}>
              <section className="portal-form-card">
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

                <form
                  className="portal-form-grid"
                  onSubmit={(event) => event.preventDefault()}
                >
                  {isVisitModule ? (
                    <div className="portal-visit-stepper">
                      {([
                        { id: 1, label: "1. Visit Context" },
                        { id: 2, label: "2. Implementation Check" },
                        {
                          id: 3,
                          label:
                            visitPathway === "demo_and_meeting"
                              ? "3. Lesson Demo + Headteacher Meeting"
                              : visitPathway === "mixed"
                                ? "3. Mixed Visit Pathway"
                                : "3. Observation & Coaching",
                        },
                        { id: 4, label: "4. Submit & Follow-up" },
                      ] as Array<{ id: 1 | 2 | 3 | 4; label: string }>).map((step) => {
                        const hasSchoolSelected = formState.schoolId.trim().length > 0;
                        const hasImplementationChoice =
                          String(formState.payload.implementationStatus ?? "").trim().length > 0;
                        const disabled =
                          (step.id > 1 && !hasSchoolSelected) ||
                          (step.id > 1 && !visitImplementationUnlocked) ||
                          (step.id > 2 && !hasImplementationChoice);
                        const isActive = visitStep === step.id;
                        return (
                          <button
                            key={step.id}
                            type="button"
                            className={`portal-step-chip${isActive ? " active" : ""}`}
                            disabled={disabled}
                            onClick={() => {
                              if (disabled) {
                                if (!hasSchoolSelected) {
                                  setFeedback({
                                    kind: "error",
                                    message: "Select a school first before continuing to the next step.",
                                  });
                                  return;
                                }
                                if (!visitImplementationUnlocked) {
                                  setFeedback({
                                    kind: "error",
                                    message:
                                      visitCompletionGate.reason ||
                                      "Visit status must be Completed to continue.",
                                  });
                                  return;
                                }
                                setFeedback({
                                  kind: "error",
                                  message: "Select implementation status before continuing.",
                                });
                                return;
                              }
                              setVisitStep(step.id);
                            }}
                          >
                            {step.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {isVisitModule && visitStep > 1 ? (
                    <div className="portal-visit-context-inline">
                      <strong>{formState.schoolName || "No school selected"}</strong>
                      <span>{formState.date || "No date"}</span>
                      <span>{formState.programType || "No visit type"}</span>
                      <span>Pathway: {visitPathway}</span>
                    </div>
                  ) : null}

                  {!isVisitModule || visitStep === 1 ? (
                    <>
                  <div className="portal-modal-context-header">
                    <h4>{config.module === "training" ? "Location" : "Context & Location"}</h4>
                    <p className="portal-muted">
                      {config.module === "training"
                        ? hideTrainingPhysicalLocationContext
                          ? "Online training selected. Physical location, venue, and cluster fields are disabled."
                          : "Capture location once from the selected school account: region, sub-region, district, sub-county, and parish."
                        : "Standard data entry context"}
                    </p>

                    <div className="portal-context-selectors">
                      {isVisitModule ? (
                        <>
                          <label>
                            {renderLabel("School Account", true)}
                            <input
                              list="visit-school-options"
                              value={formState.schoolName || ""}
                              onChange={(event) => {
                                const typedName = event.target.value;
                                const selectedSchool = Array.from(schoolsById.values()).find(s => s.name === typedName);
                                const nextSchoolId = selectedSchool ? String(selectedSchool.id) : "";

                                setFormState((prev) => ({
                                  ...prev,
                                  payload: applySchoolGeoPayload({
                                    ...prev.payload,
                                    teacherObserved: "",
                                    teacherContactId: "",
                                    teacherContactUid: "",
                                    teacherUid: "",
                                    teacherGender: "",
                                    demoTeachersPresentContactIds: [],
                                    leadershipAttendeesContactIds: [],
                                    implementationResponsibleContactId: "",
                                    leadershipNextActionsJson: "[]",
                                  }, selectedSchool ?? null),
                                  schoolId: nextSchoolId,
                                  schoolName: typedName,
                                  district: selectedSchool?.district ?? prev.district,
                                  region: selectedSchool
                                    ? inferRegionFromDistrict(selectedSchool.district) ??
                                    prev.region
                                    : prev.region,
                                }));
                                setVisitNextActions([
                                  { id: `${Date.now()}-0`, action: "", ownerContactId: "", dueDate: "" },
                                ]);
                              }}
                              placeholder="Type to search school..."
                              required
                            />
                            <datalist id="visit-school-options">
                              {formSchoolOptions.map((school) => (
                                <option key={school.id} value={school.name}>
                                  {school.schoolCode}
                                </option>
                              ))}
                            </datalist>
                          </label>
                          <label>
                            {renderLabel("Region", true)}
                            <input value={formState.region} readOnly placeholder="Auto from school" />
                          </label>
                          <label>
                            {renderLabel("Sub-region", true)}
                            <input
                              value={selectedFormSchool?.subRegion ?? ""}
                              readOnly
                              placeholder="Auto from school"
                            />
                          </label>
                          <label>
                            {renderLabel("District", true)}
                            <input value={formState.district} readOnly placeholder="Auto from school" />
                          </label>
                          <label>
                            {renderLabel("Sub-county", true)}
                            <input
                              value={selectedFormSchool?.subCounty ?? ""}
                              readOnly
                              placeholder="Auto from school"
                            />
                          </label>
                          <label>
                            {renderLabel("Parish", true)}
                            <input
                              value={selectedFormSchool?.parish ?? ""}
                              readOnly
                              placeholder="Auto from school"
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          {hideTrainingPhysicalLocationContext || config.module === "training" ? null : (
                            <>
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
                                        schoolName: keepSchool
                                          ? selectedSchool?.name ?? prev.schoolName
                                          : "",
                                      };
                                    })
                                  }
                                  required
                                >
                                  <option value="">Select region</option>
                                  {ugandaRegions.map((entry) => (
                                    <optgroup key={entry.region} label={entry.region}>
                                      <option value={entry.region}>All {entry.region}</option>
                                      {entry.subRegions.map((sr) => (
                                        <option key={sr.subRegion} value={sr.subRegion}>
                                          {sr.subRegion}
                                        </option>
                                      ))}
                                    </optgroup>
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
                                        schoolName: keepSchool
                                          ? selectedSchool?.name ?? prev.schoolName
                                          : "",
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
                            </>
                          )}
                          {config.module === "training" ? null : (
                            <label>
                              {renderLabel("School Account", true)}
                            <input
                              list="standard-school-options"
                              value={formState.schoolName || ""}
                              onChange={(event) => {
                                const typedName = event.target.value;
                                const selectedSchool = Array.from(schoolsById.values()).find(s => s.name === typedName);
                                const nextSchoolId = selectedSchool ? String(selectedSchool.id) : "";

                                setFormState((prev) => {
                                  const geoPayload = applySchoolGeoPayload(
                                    prev.payload,
                                    selectedSchool ?? null,
                                  );
                                  const onlineMode =
                                    config.module === "training" &&
                                    isOnlineTrainingDeliveryMode(prev.payload.deliveryMode);
                                  const nextPayload = onlineMode
                                    ? {
                                        ...geoPayload,
                                        trainingVenue: "Online (Live session)",
                                        clusterName: "",
                                        village: "",
                                        gpsLocation: "",
                                      }
                                    : config.module === "training" &&
                                        selectedSchool &&
                                        !String(geoPayload.trainingVenue ?? "").trim()
                                      ? { ...geoPayload, trainingVenue: selectedSchool.name }
                                      : geoPayload;

                                  return {
                                    ...prev,
                                    payload: nextPayload,
                                    schoolId: nextSchoolId,
                                    schoolName: typedName,
                                    district: selectedSchool?.district ?? prev.district,
                                    region: selectedSchool
                                      ? inferRegionFromDistrict(selectedSchool.district) ??
                                        prev.region
                                      : prev.region,
                                  };
                                });

                                if (config.module === "training") {
                                  setTrainingParticipants((prev) =>
                                    prev.map((row) => ({
                                      ...row,
                                      contactId: "",
                                      contactUid: "",
                                      participantName: "",
                                      role: "",
                                      gender: "",
                                      phoneContact: "",
                                      schoolAccountId: nextSchoolId,
                                      schoolAttachedTo: selectedSchool?.name ?? "",
                                    })),
                                  );
                                  setTrainingParticipantFeedbackRows([]);
                                }
                                if (config.module === "assessment") {
                                  setEgraLearners(createDefaultEgraRows());
                                }
                              }}
                              placeholder="Type to search school..."
                              required
                            />
                            <datalist id="standard-school-options">
                              {formSchoolOptions.map((school) => (
                                <option key={school.id} value={school.name}>
                                  {school.schoolCode}
                                </option>
                              ))}
                            </datalist>
                            {hideTrainingPhysicalLocationContext ? (
                              <small className="portal-field-help">
                                Online sessions use virtual follow-up and hide physical location fields.
                              </small>
                            ) : null}
                          </label>
                          )}
                          {hideTrainingPhysicalLocationContext || config.module === "training" ? null : (
                            <>
                              <label>
                                {renderLabel("Sub-region", true)}
                                <input
                                  value={selectedFormSchool?.subRegion ?? ""}
                                  readOnly
                                  placeholder="Auto from school"
                                />
                              </label>
                              <label>
                                {renderLabel("Sub-county", true)}
                                <input
                                  value={selectedFormSchool?.subCounty ?? ""}
                                  readOnly
                                  placeholder="Auto from school"
                                />
                              </label>
                              <label>
                                {renderLabel("Parish", true)}
                                <input
                                  value={selectedFormSchool?.parish ?? ""}
                                  readOnly
                                  placeholder="Auto from school"
                                />
                              </label>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="form-grid">
                    <label>
                      {renderLabel("Activity Date", true)}
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
                    {config.module === "training" ? (
                      <label>
                        {renderLabel("Training type", true)}
                        <select
                          value={String(formState.payload.deliveryMode ?? "")}
                          onChange={(event) => {
                            const nextMode = event.target.value;
                            const onlineMode = isOnlineTrainingDeliveryMode(nextMode);
                            setFormState((prev) => ({
                              ...prev,
                              followUpType: onlineMode ? "virtual_check_in" : prev.followUpType,
                              payload: {
                                ...prev.payload,
                                deliveryMode: nextMode,
                                trainingVenue: onlineMode
                                  ? "Online (Live session)"
                                  : String(prev.payload.trainingVenue ?? ""),
                                clusterName: onlineMode ? "" : String(prev.payload.clusterName ?? ""),
                                village: onlineMode ? "" : String(prev.payload.village ?? ""),
                                gpsLocation: onlineMode ? "" : String(prev.payload.gpsLocation ?? ""),
                              },
                            }));
                          }}
                          required
                        >
                          <option value="">Select training type</option>
                          <option value="Grouped">Grouped</option>
                          <option value="Cluster-based">Cluster-based</option>
                          <option value="In-school">In-school</option>
                          <option value="Online">Online</option>
                        </select>
                      </label>
                    ) : null}

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
                        required={config.module === "training" && !isTrainingScheduled}
                        disabled={(config.module === "training" && isTrainingScheduled) || isVisitFollowUpLocked}
                      />
                      {isVisitFollowUpLocked ? (
                        <small className="portal-field-help">
                          Follow-up date unlocks after visit status changes to Completed.
                        </small>
                      ) : null}
                    </label>
                    {config.module === "training" || config.module === "visit" ? (
                      <label>
                        {renderLabel("Follow-up type", true)}
                        <select
                          value={formState.followUpType}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, followUpType: event.target.value }))
                          }
                          disabled={
                            config.module === "training"
                              ? isOnlineTrainingModeActive || isTrainingScheduled
                              : isVisitFollowUpLocked
                          }
                          required={config.module === "training" ? !isTrainingScheduled : isVisitCompleted}
                        >
                          <option value="school_visit">School visit</option>
                          <option value="virtual_check_in">Virtual</option>
                          {config.module === "training" ? (
                            <option value="refresher_session">Refresher session</option>
                          ) : null}
                        </select>
                        {config.module === "training" && isTrainingScheduled ? (
                          <small className="portal-field-help">
                            Follow-up fields are unlocked after training status changes from Scheduled.
                          </small>
                        ) : config.module === "training" && isOnlineTrainingModeActive ? (
                          <small className="portal-field-help">
                            Follow-up type is fixed to Virtual check-in for online trainings.
                          </small>
                        ) : isVisitFollowUpLocked ? (
                          <small className="portal-field-help">
                            Follow-up type unlocks after visit status changes to Completed.
                          </small>
                        ) : null}
                      </label>
                    ) : null}
                    {config.module === "training" ? (
                      <label>
                        {renderLabel("Follow-up owner", true)}
                        <select
                          value={formState.followUpOwnerUserId}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, followUpOwnerUserId: event.target.value }))
                          }
                          required={!isTrainingScheduled}
                          disabled={isTrainingScheduled}
                        >
                          <option value="">Select follow-up owner</option>
                          {followUpOwnerOptions.map((option) => (
                            <option key={option.id} value={String(option.id)}>
                              {option.fullName}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                    </>
                  ) : null}

                  {isVisitModule && visitStep === 3 && visitPathway === "mixed" ? (
                    <div className="portal-mixed-visit-banner">
                      <strong>Mixed Visit Layout</strong>
                      <p>
                        Observation/coaching is captured for implementing classes, while demo +
                        leadership planning is captured for non-implementing classes.
                      </p>
                    </div>
                  ) : null}

                  {config.sections.map((section) => {
                    if (isVisitModule) {
                      if (visitStep === 1 && !visitStepSectionIds.context.has(section.id)) {
                        return null;
                      }
                      if (visitStep === 2 && !visitStepSectionIds.implementation.has(section.id)) {
                        return null;
                      }
                      if (visitStep === 3) {
                        const showObservation =
                          visitStepSectionIds.observation.has(section.id) && visitAllowsObservation;
                        const showDemo = visitStepSectionIds.demo.has(section.id);
                        if (!showObservation && !showDemo) {
                          return null;
                        }
                      }
                      if (visitStep === 4 && !visitStepSectionIds.submit.has(section.id)) {
                        return null;
                      }
                    }

                    const content = (
                      <div className="form-grid">
                        {section.fields.map((field) => {
                          const value = formState.payload[field.key];
                          const isVisitObservationFieldForUi =
                            isVisitModule &&
                            (visitObservationOnlyFieldKeys.has(field.key) || isVisitObservationField(field.key));
                          const isVisitDemoMeetingFieldForUi =
                            isVisitModule && visitDemoMeetingFieldKeys.has(field.key);
                          const isClusterBasedTraining =
                            config.module === "training" &&
                            String(formState.payload.deliveryMode ?? "")
                              .trim()
                              .toLowerCase()
                              .includes("cluster");
                          const isFieldRequired =
                            Boolean(field.required) &&
                            (!isVisitModule ||
                              (isVisitObservationFieldForUi && visitAllowsObservation) ||
                              (isVisitDemoMeetingFieldForUi && visitRequiresDemoMeeting) ||
                              (!isVisitObservationFieldForUi && !isVisitDemoMeetingFieldForUi));
                          const isTrainingScheduledLockedField =
                            isTrainingModule &&
                            isTrainingScheduled &&
                            !trainingScheduleEditableFieldKeys.has(field.key);
                          const isFieldRequiredForUi =
                            isFieldRequired && !isTrainingScheduledLockedField;

                          if (isVisitModule && !visitAllowsObservation && isVisitObservationFieldForUi) {
                            return null;
                          }
                          if (config.module === "training" && field.key === "deliveryMode") {
                            return null;
                          }
                          if (
                            config.module === "training" &&
                            isOnlineTrainingModeActive &&
                            trainingPhysicalFieldKeys.has(field.key)
                          ) {
                            return null;
                          }
                          if (config.module === "training" && field.key === "clusterName" && !isClusterBasedTraining) {
                            return null;
                          }
                          if (field.type === "egraLearners") {
                            return (
                              <div key={field.key} className="full-width">
                                <div className="portal-participants-header">
                                  {renderLabel(field.label, isFieldRequiredForUi)}
                                  <div className="action-row" style={{ gap: "0.45rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                    <button
                                      className="button button-ghost"
                                      type="button"
                                      onClick={() => void downloadAssessmentTemplate("csv")}
                                    >
                                      Download CSV Template
                                    </button>
                                    <button
                                      className="button button-ghost"
                                      type="button"
                                      onClick={() => void downloadAssessmentTemplate("xlsx")}
                                    >
                                      Download Excel Template
                                    </button>
                                    <button
                                      className="button button-ghost"
                                      type="button"
                                      onClick={openAssessmentImportPicker}
                                      disabled={importingAssessmentFile}
                                    >
                                      {importingAssessmentFile ? "Importing..." : "Upload CSV/Excel"}
                                    </button>
                                    <button
                                      className="button button-ghost"
                                      type="button"
                                      onClick={handleOpenEgraModal}
                                    >
                                      + Add Learner Result
                                    </button>
                                  </div>
                                </div>
                                <p className="portal-muted">
                                  {field.helperText || "Enter learner-level scores using the six-domain mastery rubric."}
                                </p>
                                <p className="portal-muted" style={{ marginTop: "-0.35rem" }}>
                                  Importing replaces old learner rows in the current form. Template max: {EGRA_ROW_COUNT} learners per upload.
                                </p>
                                <input
                                  ref={assessmentImportInputRef}
                                  type="file"
                                  accept=".csv,.xlsx,.xls"
                                  className="visually-hidden"
                                  onChange={handleAssessmentImportFileChange}
                                />

                                {/* Summary Table of Added Learners */}
                                <div className="table-wrap egra-table-wrap">
                                  <table className="egra-table">
                                    <thead>
                                      <tr>
                                        <th>No</th>
                                        <th>Learner ID</th>
                                        <th>Learner Name</th>
                                        <th>Class</th>
                                        <th>Gender</th>
                                        <th>Age</th>
                                        <th>Reading Stage</th>
                                        <th>Benchmark Grade Level</th>
                                        <th>Expected vs Actual</th>
                                        <th>Rubric Profile (PA/GPC/BD/WRF/SPC/C)</th>
                                        <th>Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {egraLearners.filter(rowHasAssessmentData).map((row) => {
                                        const classGrade =
                                          String(formState.payload.classLevel ?? "").trim() || "P1";
                                        const mastery =
                                          egraLearnerMasteryProfiles.get(row.no) ??
                                          computeLearnerMasteryFromSignals(row, classGrade);
                                        const readingStage = normalizeEgraLevelLabel(
                                          row.fluencyLevel,
                                          row,
                                          classGrade,
                                        );
                                        return (
                                          <tr key={row.no}>
                                            <td>{row.no}</td>
                                            <td>{row.learnerId}</td>
                                            <td>{row.learnerName || "-"}</td>
                                            <td>{row.classGrade || "-"}</td>
                                            <td>{row.sex === "M" ? "Male" : row.sex === "F" ? "Female" : "-"}</td>
                                            <td>{row.age}</td>
                                            <td>{readingStage}</td>
                                            <td>{mastery.benchmarkGradeLevel}</td>
                                            <td>{mastery.expectedVsActualStatus}</td>
                                            <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: "0.75rem" }}>
                                              {formatMasteryProfileCompact(mastery)}
                                            </td>
                                            <td>
                                              <button
                                                type="button"
                                                className="button button-small button-ghost"
                                                onClick={() => {
                                                  setModalLearnerNo(row.no);
                                                  setModalLearnerId(row.learnerId || nextLearnerShortId(row.no));
                                                  setIsEgraModalOpen(true);
                                                }}
                                              >
                                                Edit
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {egraLearners.filter(rowHasAssessmentData).length === 0 && (
                                        <tr><td colSpan={11} className="text-center p-4 text-slate-500">No learners added yet. Click "+ Add Learner Result" to begin.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          }

                          if (field.type === "egraSummary") {
                            return (
                              <div key={field.key} className="full-width table-wrap">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Domain Mastery Snapshot</th>
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
                                      <th>Reading Stage</th>
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

                          if (isTrainingModule && field.key === "trainingFeedbackBundleJson") {
                            const feedbackRowsWithData = trainingParticipantFeedbackRows.filter(
                              (row) =>
                                row.contactId.trim() ||
                                row.contactUid.trim() ||
                                row.participantName.trim() ||
                                row.changedThinking.trim() ||
                                row.improveReading.trim(),
                            );
                            const facilitatorRowsWithData = trainingFacilitatorRows.filter(
                              (row) => row.fullName.trim() || row.phone.trim(),
                            );
                            const selectedFacilitator =
                              trainingFacilitatorRows.find(
                                (row) => row.id === selectedTrainingFacilitatorId,
                              ) ?? trainingFacilitatorRows[0];
                            const hasFacilitatorFeedback = Boolean(
                              facilitatorGeneralObservation.trim() ||
                                facilitatorWhatWentWell.trim() ||
                                facilitatorChallenges.trim() ||
                                facilitatorActionsRecommendations.trim() ||
                                facilitatorNextStep.trim() ||
                                facilitatorFeedbackPhotoFileName.trim(),
                            );

                            return (
                              <div key={field.key} className="full-width portal-participants-block">
                                <div className="portal-participants-header">
                                  {renderLabel(field.label, isFieldRequiredForUi)}
                                  <button
                                    className="button button-ghost"
                                    type="button"
                                    disabled={!formState.schoolId.trim() || isTrainingScheduledLockedField}
                                    onClick={() => {
                                      if (isTrainingScheduledLockedField) {
                                        return;
                                      }
                                      if (trainingParticipantFeedbackRows.length === 0) {
                                        const seeded = trainingParticipants
                                          .filter(
                                            (row) =>
                                              row.contactId.trim() ||
                                              row.contactUid.trim() ||
                                              row.participantName.trim(),
                                          )
                                          .map((row) => ({
                                            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                                            contactId: row.contactId.trim(),
                                            contactUid: row.contactUid.trim(),
                                            participantName: row.participantName.trim(),
                                            changedThinking: "",
                                            improveReading: "",
                                          }));
                                        setTrainingParticipantFeedbackRows(
                                          seeded.length > 0
                                            ? seeded
                                            : [createEmptyTrainingParticipantFeedbackRow()],
                                        );
                                      }
                                      setIsTrainingFeedbackFormOpen((prev) => !prev);
                                    }}
                                  >
                                    {isTrainingFeedbackFormOpen
                                      ? "Close feedback form"
                                      : "+ Participants feedback form"}
                                  </button>
                                </div>
                                {field.helperText ? (
                                  <small className="portal-field-help">{field.helperText}</small>
                                ) : null}
                                <p className="portal-muted" style={{ marginTop: "0.4rem" }}>
                                  Participant responses captured: {feedbackRowsWithData.length}. Facilitators listed:{" "}
                                  {facilitatorRowsWithData.length}. Facilitator feedback captured:{" "}
                                  {hasFacilitatorFeedback ? "Yes" : "No"}.
                                </p>
                                {isTrainingScheduledLockedField ? (
                                  <p className="portal-muted">
                                    Training is scheduled. Feedback fields unlock after status changes to Completed.
                                  </p>
                                ) : null}
                                {isTrainingFeedbackFormOpen ? (
                                  <div className="card full-width" style={{ marginTop: "0.75rem" }}>
                                    <div className="portal-participants-header">
                                      <strong>Participants Feedback</strong>
                                      <button
                                        className="button button-ghost"
                                        type="button"
                                        onClick={() =>
                                          setTrainingParticipantFeedbackRows((prev) => [
                                            ...prev,
                                            createEmptyTrainingParticipantFeedbackRow(),
                                          ])
                                        }
                                      >
                                        + Add participant feedback
                                      </button>
                                    </div>
                                    {loadingSchoolContacts ? (
                                      <p className="portal-muted">Loading contacts from school profile...</p>
                                    ) : null}
                                    <div className="table-wrap">
                                      <table className="portal-participants-table">
                                        <thead>
                                          <tr>
                                            <th>#</th>
                                            <th>Contact (from School Profile)</th>
                                            <th>
                                              How has the training changed the way you think of Reading?
                                            </th>
                                            <th>
                                              What will you do to improve the reading levels of your school?
                                            </th>
                                            <th>Remove</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(trainingParticipantFeedbackRows.length > 0
                                            ? trainingParticipantFeedbackRows
                                            : [createEmptyTrainingParticipantFeedbackRow()]).map((row, index) => {
                                            const selectedContact =
                                              schoolContacts.find(
                                                (contact) =>
                                                  String(contact.contactId) === row.contactId.trim(),
                                              ) ??
                                              schoolContacts.find(
                                                (contact) => contact.contactUid === row.contactUid.trim(),
                                              );
                                            return (
                                              <tr key={row.id}>
                                                <td>{index + 1}</td>
                                                <td style={{ minWidth: 240 }}>
                                                  <select
                                                    value={row.contactId}
                                                    onChange={(event) =>
                                                      setTrainingParticipantFeedbackRows((prev) =>
                                                        prev.map((entry, entryIndex) =>
                                                          entryIndex !== index
                                                            ? entry
                                                            : (() => {
                                                                const nextContact =
                                                                  schoolContacts.find(
                                                                    (contact) =>
                                                                      String(contact.contactId) ===
                                                                      event.target.value,
                                                                  ) ?? null;
                                                                return {
                                                                  ...entry,
                                                                  contactId: event.target.value,
                                                                  contactUid:
                                                                    nextContact?.contactUid ?? "",
                                                                  participantName:
                                                                    nextContact?.fullName ??
                                                                    entry.participantName,
                                                                };
                                                              })(),
                                                        ),
                                                      )
                                                    }
                                                  >
                                                    <option value="">Select contact</option>
                                                    {schoolContacts.map((contact) => (
                                                      <option
                                                        key={contact.contactId}
                                                        value={String(contact.contactId)}
                                                      >
                                                        {contact.fullName} ({contact.category})
                                                      </option>
                                                    ))}
                                                  </select>
                                                  {selectedContact ? (
                                                    <small className="portal-field-help">
                                                      {selectedContact.fullName}
                                                    </small>
                                                  ) : null}
                                                </td>
                                                <td>
                                                  <textarea
                                                    rows={3}
                                                    value={row.changedThinking}
                                                    onChange={(event) =>
                                                      setTrainingParticipantFeedbackRows((prev) =>
                                                        prev.map((entry, entryIndex) =>
                                                          entryIndex === index
                                                            ? {
                                                                ...entry,
                                                                changedThinking: event.target.value,
                                                              }
                                                            : entry,
                                                        ),
                                                      )
                                                    }
                                                  />
                                                </td>
                                                <td>
                                                  <textarea
                                                    rows={3}
                                                    value={row.improveReading}
                                                    onChange={(event) =>
                                                      setTrainingParticipantFeedbackRows((prev) =>
                                                        prev.map((entry, entryIndex) =>
                                                          entryIndex === index
                                                            ? {
                                                                ...entry,
                                                                improveReading: event.target.value,
                                                              }
                                                            : entry,
                                                        ),
                                                      )
                                                    }
                                                  />
                                                </td>
                                                <td>
                                                  <button
                                                    className="button button-ghost"
                                                    type="button"
                                                    onClick={() =>
                                                      setTrainingParticipantFeedbackRows((prev) => {
                                                        if (prev.length <= 1) {
                                                          return [createEmptyTrainingParticipantFeedbackRow()];
                                                        }
                                                        return prev.filter(
                                                          (_, entryIndex) => entryIndex !== index,
                                                        );
                                                      })
                                                    }
                                                  >
                                                    Remove
                                                  </button>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>

                                    <div className="portal-participants-header" style={{ marginTop: "0.9rem" }}>
                                      <strong>Facilitator Feedback</strong>
                                      <button
                                        className="button button-ghost"
                                        type="button"
                                        onClick={() =>
                                          setTrainingFacilitatorRows((prev) => [
                                            ...prev,
                                            createEmptyTrainingFacilitatorRow(),
                                          ])
                                        }
                                      >
                                        + Add facilitator
                                      </button>
                                    </div>
                                    <div className="form-grid">
                                      <label>
                                        {renderLabel("Facilitator")}
                                        <select
                                          value={selectedFacilitator?.id ?? ""}
                                          onChange={(event) =>
                                            setSelectedTrainingFacilitatorId(event.target.value)
                                          }
                                        >
                                          {trainingFacilitatorRows.map((row, index) => (
                                            <option key={row.id} value={row.id}>
                                              {row.fullName.trim() || `Facilitator ${index + 1}`}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <label>
                                        {renderLabel("Facilitator Name")}
                                        <input
                                          value={selectedFacilitator?.fullName ?? ""}
                                          onChange={(event) =>
                                            setTrainingFacilitatorRows((prev) =>
                                              prev.map((row) =>
                                                row.id === (selectedFacilitator?.id ?? "")
                                                  ? { ...row, fullName: event.target.value }
                                                  : row,
                                              ),
                                            )
                                          }
                                        />
                                      </label>
                                      <label>
                                        {renderLabel("Facilitator Phone Number")}
                                        <input
                                          value={selectedFacilitator?.phone ?? ""}
                                          inputMode="tel"
                                          onChange={(event) =>
                                            setTrainingFacilitatorRows((prev) =>
                                              prev.map((row) =>
                                                row.id === (selectedFacilitator?.id ?? "")
                                                  ? { ...row, phone: event.target.value }
                                                  : row,
                                              ),
                                            )
                                          }
                                        />
                                      </label>
                                      <label className="full-width">
                                        {renderLabel(
                                          "General observation on teachers' ability to teach reading",
                                        )}
                                        <textarea
                                          rows={3}
                                          value={facilitatorGeneralObservation}
                                          onChange={(event) =>
                                            setFacilitatorGeneralObservation(event.target.value)
                                          }
                                        />
                                      </label>
                                      <label className="full-width">
                                        {renderLabel("What went well?")}
                                        <textarea
                                          rows={3}
                                          value={facilitatorWhatWentWell}
                                          onChange={(event) =>
                                            setFacilitatorWhatWentWell(event.target.value)
                                          }
                                        />
                                      </label>
                                      <label className="full-width">
                                        {renderLabel("Challenges")}
                                        <textarea
                                          rows={3}
                                          value={facilitatorChallenges}
                                          onChange={(event) =>
                                            setFacilitatorChallenges(event.target.value)
                                          }
                                        />
                                      </label>
                                      <label className="full-width">
                                        {renderLabel("Actions/Recommendations")}
                                        <textarea
                                          rows={3}
                                          value={facilitatorActionsRecommendations}
                                          onChange={(event) =>
                                            setFacilitatorActionsRecommendations(event.target.value)
                                          }
                                        />
                                      </label>
                                      <label className="full-width">
                                        {renderLabel("Next Step")}
                                        <textarea
                                          rows={3}
                                          value={facilitatorNextStep}
                                          onChange={(event) =>
                                            setFacilitatorNextStep(event.target.value)
                                          }
                                        />
                                      </label>
                                      <label className="full-width">
                                        {renderLabel("Picture Upload")}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (!file) {
                                              return;
                                            }
                                            setSelectedFiles((prev) => {
                                              const exists = prev.some(
                                                (item) =>
                                                  item.name === file.name &&
                                                  item.size === file.size &&
                                                  item.lastModified === file.lastModified,
                                              );
                                              if (exists) {
                                                return prev;
                                              }
                                              return [...prev, file];
                                            });
                                            setFacilitatorFeedbackPhotoFileName(file.name);
                                          }}
                                        />
                                        <small className="portal-field-help">
                                          Uploaded images are appended to the Evidence Locker.
                                        </small>
                                      </label>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          }

                          if (field.type === "participants") {
                            const selectedSchoolId = formState.schoolId ? Number(formState.schoolId) : null;
                            return (
                              <div key={field.key} className="full-width portal-participants-block">
                                <div className="portal-participants-header">
                                  {renderLabel(field.label, isFieldRequiredForUi)}
                                  <button
                                    className="button button-ghost"
                                    type="button"
                                    onClick={addTrainingParticipant}
                                    disabled={isTrainingScheduledLockedField}
                                  >
                                    + Add participant
                                  </button>
                                </div>
                                {isTrainingScheduledLockedField ? (
                                  <p className="portal-muted">
                                    Training is scheduled. Participant entries unlock when status is set to Completed.
                                  </p>
                                ) : null}
                                {!selectedSchoolId && (
                                  <p style={{ color: "#b45309", fontSize: "0.82rem", fontStyle: "italic", margin: "0.25rem 0 0.5rem" }}>
                                    Select a school first to load participants from the school roster.
                                  </p>
                                )}
                                <div className="table-wrap">
                                  <table className="portal-participants-table">
                                    <thead>
                                      <tr>
                                        <th>#</th>
                                        <th>Participant (from School Roster)</th>
                                        <th>School</th>
                                        <th>Role</th>
                                        <th>Gender</th>
                                        <th>Mobile</th>
                                        <th>Email</th>
                                        <th>Invited</th>
                                        <th>Confirmed</th>
                                        <th>Attended</th>
                                        <th>Participant Type</th>
                                        <th>Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {trainingParticipants.map((row, index) => (
                                        <tr key={`participant-${index + 1}`}>
                                          <td>{index + 1}</td>
                                          <td style={{ minWidth: 280 }}>
                                            <div
                                              style={
                                                isTrainingScheduledLockedField
                                                  ? { pointerEvents: "none", opacity: 0.65 }
                                                  : undefined
                                              }
                                            >
                                              <Suspense fallback={<div className="portal-muted">Loading…</div>}>
                                              <SchoolRosterPicker
                                                schoolId={selectedSchoolId}
                                                schoolName={row.schoolAttachedTo || formState.schoolName}
                                                participantType="teacher"
                                                selectedUid={row.contactUid}
                                                label=""
                                                onSelect={(entry: RosterEntry | null) => {
                                                  if (isTrainingScheduledLockedField) {
                                                    return;
                                                  }
                                                  if (!entry) {
                                                    setTrainingParticipants((prev) =>
                                                      prev.map((p, i) =>
                                                        i !== index
                                                          ? p
                                                          : {
                                                            ...p,
                                                            contactId: "",
                                                            contactUid: "",
                                                            participantName: "",
                                                            role: "",
                                                            gender: "",
                                                            phoneContact: "",
                                                            email: "",
                                                            participantType: "In Person",
                                                            invited: true,
                                                            confirmed: true,
                                                            attended: true,
                                                          },
                                                      ),
                                                    );
                                                    return;
                                                  }
                                                  const teacher = entry as {
                                                    contactId: number;
                                                    contactUid: string;
                                                    fullName: string;
                                                    gender: string;
                                                    category: string;
                                                    phone: string | null;
                                                    email?: string | null;
                                                  };
                                                  setTrainingParticipants((prev) =>
                                                    prev.map((p, i) =>
                                                      i !== index
                                                        ? p
                                                        : {
                                                          ...p,
                                                          contactId: String(teacher.contactId),
                                                          contactUid: teacher.contactUid,
                                                          participantName: teacher.fullName,
                                                          role: teacher.category === "Teacher" ? "Teacher" : "Leader",
                                                          gender:
                                                            teacher.gender === "Male" || teacher.gender === "Female"
                                                              ? (teacher.gender as TrainingParticipantGender)
                                                              : "",
                                                          phoneContact: teacher.phone ?? "",
                                                          email: teacher.email ?? "",
                                                          schoolAccountId: String(selectedSchoolId ?? ""),
                                                          schoolAttachedTo: formState.schoolName,
                                                          participantType: "In Person",
                                                          invited: true,
                                                          confirmed: true,
                                                          attended: true,
                                                        },
                                                    ),
                                                  );
                                                }}
                                              />
                                              </Suspense>
                                            </div>
                                            {row.participantName && (
                                              <div style={{ fontSize: "0.78rem", color: "#C35D0E", marginTop: 2 }}>
                                                ✓ {row.participantName}
                                              </div>
                                            )}
                                          </td>
                                          <td>
                                            <input
                                              value={formState.schoolName}
                                              readOnly
                                              placeholder="Select school first"
                                            />
                                          </td>
                                          <td>
                                            <select
                                              value={row.role}
                                              onChange={(event) =>
                                                updateTrainingParticipant(index, "role", event.target.value)
                                              }
                                              disabled={isTrainingScheduledLockedField}
                                            >
                                              <option value="">Role</option>
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
                                              disabled={isTrainingScheduledLockedField}
                                            >
                                              <option value="">Gender</option>
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
                                              readOnly={isTrainingScheduledLockedField}
                                            />
                                          </td>
                                          <td>
                                            <input
                                              value={row.email}
                                              placeholder="name@school.org"
                                              inputMode="email"
                                              onChange={(event) =>
                                                updateTrainingParticipant(index, "email", event.target.value)
                                              }
                                              readOnly={isTrainingScheduledLockedField}
                                            />
                                          </td>
                                          <td>
                                            <label className="portal-inline-boolean">
                                              <input
                                                type="checkbox"
                                                checked={row.invited}
                                                onChange={(event) =>
                                                  updateTrainingParticipant(index, "invited", event.target.checked)
                                                }
                                                disabled={isTrainingScheduledLockedField}
                                              />
                                              <span>Yes</span>
                                            </label>
                                          </td>
                                          <td>
                                            <label className="portal-inline-boolean">
                                              <input
                                                type="checkbox"
                                                checked={row.confirmed}
                                                onChange={(event) =>
                                                  updateTrainingParticipant(index, "confirmed", event.target.checked)
                                                }
                                                disabled={isTrainingScheduledLockedField}
                                              />
                                              <span>Yes</span>
                                            </label>
                                          </td>
                                          <td>
                                            <label className="portal-inline-boolean">
                                              <input
                                                type="checkbox"
                                                checked={row.attended}
                                                onChange={(event) =>
                                                  updateTrainingParticipant(index, "attended", event.target.checked)
                                                }
                                                disabled={isTrainingScheduledLockedField}
                                              />
                                              <span>Yes</span>
                                            </label>
                                          </td>
                                          <td>
                                            <select
                                              value={row.participantType}
                                              onChange={(event) =>
                                                updateTrainingParticipant(index, "participantType", event.target.value)
                                              }
                                              disabled={isTrainingScheduledLockedField}
                                            >
                                              <option value="">Type</option>
                                              <option value="In Person">In Person</option>
                                              <option value="Online">Online</option>
                                              <option value="Hybrid">Hybrid</option>
                                            </select>
                                          </td>
                                          <td>
                                            <button
                                              className="button button-ghost"
                                              type="button"
                                              onClick={() => removeTrainingParticipant(index)}
                                              disabled={isTrainingScheduledLockedField}
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

                          if (config.module === "visit" && field.key === "teacherObserved") {
                            const selectedSchoolId = formState.schoolId ? Number(formState.schoolId) : null;
                            const selectedContactUid = sanitizeForInput(formState.payload.teacherContactUid);
                            return (
                              <div key={field.key} className="full-width">
                                <Suspense fallback={<div className="portal-muted">Loading…</div>}>
                                <SchoolRosterPicker
                                  schoolId={selectedSchoolId}
                                  schoolName={formState.schoolName}
                                  participantType="teacher"
                                  selectedUid={selectedContactUid}
                                  onSelect={(entry: RosterEntry | null) => {
                                    if (!entry) {
                                      setFormState((prev) => ({
                                        ...prev,
                                        payload: {
                                          ...prev.payload,
                                          teacherObserved: "",
                                          teacherContactId: "",
                                          teacherContactUid: "",
                                          teacherUid: "",
                                          teacherGender: "",
                                        },
                                      }));
                                      return;
                                    }

                                    const contact = entry as {
                                      contactId: number;
                                      contactUid: string;
                                      fullName: string;
                                      gender: string;
                                      teacherUid?: string;
                                    };
                                    setFormState((prev) => ({
                                      ...prev,
                                      payload: {
                                        ...prev.payload,
                                        teacherObserved: contact.fullName,
                                        teacherContactId: String(contact.contactId),
                                        teacherContactUid: contact.contactUid,
                                        teacherUid: contact.teacherUid ?? "",
                                        teacherGender:
                                          contact.gender === "Male" || contact.gender === "Female"
                                            ? contact.gender
                                            : "",
                                      },
                                    }));
                                  }}
                                  label={field.label}
                                />
                                </Suspense>
                                {field.helperText ? (
                                  <small className="portal-field-help">{field.helperText}</small>
                                ) : null}
                              </div>
                            );
                          }

                          if (isVisitModule && field.key === "coachObserver") {
                            return (
                              <label key={field.key}>
                                {renderLabel(field.label, isFieldRequiredForUi)}
                                <input
                                  value={currentUser.fullName}
                                  readOnly
                                  placeholder="Auto-filled from signed-in user"
                                />
                                {field.helperText ? (
                                  <small className="portal-field-help">{field.helperText}</small>
                                ) : null}
                              </label>
                            );
                          }

                          if (isVisitModule && field.key === "visitStatus") {
                            const lockToScheduled = !visitCompletionGate.canComplete;
                            return (
                              <label key={field.key}>
                                {renderLabel(field.label, true)}
                                <select
                                  value={visitStatus}
                                  onChange={(event) =>
                                    updatePayloadField(field.key, event.target.value)
                                  }
                                  disabled={lockToScheduled}
                                  required
                                >
                                  <option value="scheduled">Scheduled</option>
                                  <option value="completed">Completed</option>
                                </select>
                                {lockToScheduled ? (
                                  <small className="portal-field-help">
                                    {visitCompletionGate.reason}
                                  </small>
                                ) : (
                                  <small className="portal-field-help">
                                    Status can now be changed to Completed to unlock implementation
                                    and submission.
                                  </small>
                                )}
                              </label>
                            );
                          }

                          if (isVisitModule && field.key === "visitPathway") {
                            return (
                              <label key={field.key}>
                                {renderLabel(field.label, false)}
                                <input value={visitPathway} readOnly />
                                {field.helperText ? (
                                  <small className="portal-field-help">{field.helperText}</small>
                                ) : null}
                              </label>
                            );
                          }

                          if (isVisitModule && field.key === "implementationResponsibleContactId") {
                            return (
                              <label key={field.key}>
                                {renderLabel(field.label, isFieldRequiredForUi)}
                                <select
                                  value={sanitizeForInput(value)}
                                  onChange={(event) => updatePayloadField(field.key, event.target.value)}
                                  required={isFieldRequiredForUi}
                                >
                                  <option value="">Select contact</option>
                                  {schoolContacts.map((contact) => (
                                    <option key={contact.contactId} value={String(contact.contactId)}>
                                      {contact.fullName} ({contact.category})
                                    </option>
                                  ))}
                                </select>
                                {loadingSchoolContacts ? (
                                  <small className="portal-field-help">Loading school contacts...</small>
                                ) : null}
                                {field.helperText ? (
                                  <small className="portal-field-help">{field.helperText}</small>
                                ) : null}
                              </label>
                            );
                          }

                          if (
                            isVisitModule &&
                            (field.key === "demoTeachersPresentContactIds" ||
                              field.key === "leadershipAttendeesContactIds")
                          ) {
                            const selected = Array.isArray(value) ? sanitizeContactIds(value) : [];
                            return (
                              <fieldset key={field.key} className="card full-width portal-form-options">
                                <legend>
                                  {field.label}
                                  {isFieldRequiredForUi ? " *" : ""}
                                </legend>
                                {loadingSchoolContacts ? (
                                  <p className="portal-muted">Loading school contacts...</p>
                                ) : schoolContacts.length === 0 ? (
                                  <p className="portal-muted">No school contacts found. Add contacts in School Accounts.</p>
                                ) : (
                                  <div className="portal-multiselect">
                                    {schoolContacts.map((contact) => {
                                      const contactId = String(contact.contactId);
                                      const checked = selected.includes(contactId);
                                      return (
                                        <label key={contact.contactId}>
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(event) => {
                                              const next = new Set(selected);
                                              if (event.target.checked) {
                                                next.add(contactId);
                                              } else {
                                                next.delete(contactId);
                                              }
                                              updatePayloadField(field.key, Array.from(next));
                                            }}
                                          />
                                          <span>{contact.fullName} ({contact.category})</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                                {field.helperText ? (
                                  <small className="portal-field-help">{field.helperText}</small>
                                ) : null}
                              </fieldset>
                            );
                          }

                          if (isVisitModule && field.key === "leadershipNextActionsJson") {
                            const rows = visitNextActions.length > 0
                              ? visitNextActions
                              : [{ id: `${Date.now()}-0`, action: "", ownerContactId: "", dueDate: "" }];
                            return (
                              <div key={field.key} className="full-width portal-next-actions-block">
                                <div className="portal-participants-header">
                                  {renderLabel(field.label, isFieldRequiredForUi)}
                                  <button
                                    className="button button-ghost"
                                    type="button"
                                    onClick={() =>
                                      setVisitNextActions((prev) => [
                                        ...prev,
                                        {
                                          id: `${Date.now()}-${prev.length + 1}`,
                                          action: "",
                                          ownerContactId: "",
                                          dueDate: "",
                                        },
                                      ])
                                    }
                                  >
                                    + Add action
                                  </button>
                                </div>
                                <div className="table-wrap">
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Action</th>
                                        <th>Owner</th>
                                        <th>Due date</th>
                                        <th>Remove</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((row, index) => (
                                        <tr key={row.id}>
                                          <td>
                                            <input
                                              value={row.action}
                                              placeholder="Action"
                                              onChange={(event) =>
                                                setVisitNextActions((prev) =>
                                                  prev.map((entry, entryIndex) =>
                                                    entryIndex === index
                                                      ? { ...entry, action: event.target.value }
                                                      : entry,
                                                  ),
                                                )
                                              }
                                            />
                                          </td>
                                          <td>
                                            <select
                                              value={row.ownerContactId}
                                              onChange={(event) =>
                                                setVisitNextActions((prev) =>
                                                  prev.map((entry, entryIndex) =>
                                                    entryIndex === index
                                                      ? { ...entry, ownerContactId: event.target.value }
                                                      : entry,
                                                  ),
                                                )
                                              }
                                            >
                                              <option value="">Select owner</option>
                                              {schoolContacts.map((contact) => (
                                                <option
                                                  key={contact.contactId}
                                                  value={String(contact.contactId)}
                                                >
                                                  {contact.fullName}
                                                </option>
                                              ))}
                                            </select>
                                          </td>
                                          <td>
                                            <input
                                              type="date"
                                              value={row.dueDate}
                                              onChange={(event) =>
                                                setVisitNextActions((prev) =>
                                                  prev.map((entry, entryIndex) =>
                                                    entryIndex === index
                                                      ? { ...entry, dueDate: event.target.value }
                                                      : entry,
                                                  ),
                                                )
                                              }
                                            />
                                          </td>
                                          <td>
                                            <button
                                              className="button button-ghost"
                                              type="button"
                                              onClick={() =>
                                                setVisitNextActions((prev) => {
                                                  if (prev.length <= 1) {
                                                    return [
                                                      {
                                                        id: `${Date.now()}-0`,
                                                        action: "",
                                                        ownerContactId: "",
                                                        dueDate: "",
                                                      },
                                                    ];
                                                  }
                                                  return prev.filter((_, entryIndex) => entryIndex !== index);
                                                })
                                              }
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
                                {renderLabel(field.label, isFieldRequiredForUi)}
                                <textarea
                                  rows={4}
                                  value={Array.isArray(value) ? value.join(", ") : sanitizeForInput(value)}
                                  placeholder={inferPlaceholder(field)}
                                  onChange={(event) => updatePayloadField(field.key, event.target.value)}
                                  required={isFieldRequiredForUi}
                                  disabled={isTrainingScheduledLockedField}
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
                                {renderLabel(field.label, isFieldRequiredForUi)}
                                <select
                                  value={Array.isArray(value) ? value[0] ?? "" : sanitizeForInput(value)}
                                  onChange={(event) => updatePayloadField(field.key, event.target.value)}
                                  required={isFieldRequiredForUi}
                                  disabled={isTrainingScheduledLockedField}
                                >
                                  <option value="">Select</option>
                                  {(() => {
                                    let optionsToRender = field.options ?? [];
                                    
                                    if (field.key === "facilitatedByContactId" && initialFinanceContacts) {
                                      optionsToRender = initialFinanceContacts.map((c) => ({ value: String(c.id), label: c.fullName }));
                                    } else if (field.key === "followUpOwnerUserId" && initialUsers) {
                                      optionsToRender = initialUsers.map((u) => ({ value: String(u.id), label: u.fullName }));
                                    } else if (field.key === "trainingSubRegion" || field.key === "subRegion") {
                                      const currentRegion = String(formState.payload.trainingRegion || formState.payload.region || "").trim().replace(/ Region$/i, "");
                                      if (currentRegion) {
                                        optionsToRender = getSubRegionsByRegion(currentRegion).map((sr) => ({ value: sr.subRegion, label: sr.subRegion }));
                                      } else {
                                        optionsToRender = ugandaRegions.flatMap((r) => r.subRegions.map((sr) => ({ value: sr.subRegion, label: sr.subRegion })));
                                      }
                                    } else if (field.key === "trainingDistrict" || field.key === "district") {
                                      const currentRegion = String(formState.payload.trainingRegion || formState.payload.region || "").trim().replace(/ Region$/i, "");
                                      const currentSubRegion = String(formState.payload.trainingSubRegion || formState.payload.subRegion || "").trim();
                                      
                                      let validSubRegion = currentSubRegion;
                                      if (currentRegion && currentSubRegion) {
                                         const validSubRegions = getSubRegionsByRegion(currentRegion).map(sr => sr.subRegion);
                                         if (!validSubRegions.includes(currentSubRegion)) {
                                            validSubRegion = "";
                                         }
                                      }

                                      if (validSubRegion) {
                                        optionsToRender = getDistrictsByRegion(validSubRegion).map((d) => ({ value: d, label: d }));
                                      } else if (currentRegion) {
                                        optionsToRender = getDistrictsByRegion(currentRegion).map((d) => ({ value: d, label: d }));
                                      } else {
                                        optionsToRender = ugandaRegions.flatMap((r) => r.districts.map((d) => ({ value: d, label: d })));
                                      }
                                    }

                                    return optionsToRender.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ));
                                  })()}
                                </select>
                              </label>
                            );
                          }

                          if (field.type === "multiselect") {
                            const selected = Array.isArray(value) ? value : [];
                            const isInsightRecommendationField =
                              field.key === "insightsRecommendationsRecIds";
                            return (
                              <fieldset key={field.key} className="card full-width portal-form-options">
                                <legend>
                                  {field.label}
                                  {isFieldRequiredForUi ? " *" : ""}
                                </legend>
                                {isInsightRecommendationField ? (
                                  <div className="action-row" style={{ marginBottom: "0.5rem" }}>
                                    <button
                                      type="button"
                                      className="button button-ghost"
                                      disabled={isTrainingScheduledLockedField}
                                      onClick={() => {
                                        const suggested = applySuggestedInsightRecIds(
                                          config.module,
                                          formState.payload,
                                        );
                                        if (suggested.length === 0) {
                                          return;
                                        }
                                        const merged = sanitizeContactIds([
                                          ...selected,
                                          ...suggested,
                                        ]);
                                        updatePayloadField(field.key, merged);
                                      }}
                                    >
                                      Suggested REC
                                    </button>
                                  </div>
                                ) : field.key === "visitContacts" ? (
                                  <div className="action-row" style={{ marginBottom: "0.5rem" }}>
                                    <a
                                      className="button button-ghost"
                                      href={`/portal/contacts?new=1&schoolId=${formState.schoolId}`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      + Add New Contact
                                    </a>
                                  </div>
                                ) : null}
                                <div className="portal-multiselect">
                                  {(() => {
                                    const optionsToRender = field.key === "visitContacts"
                                      ? schoolContacts.map(c => ({ value: String(c.contactId), label: `${c.fullName} (${c.category})` }))
                                      : (field.options ?? []);
                                    return optionsToRender.map((option) => {
                                      const checked = selected.includes(option.value);
                                      return (
                                        <label key={option.value}>
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={isTrainingScheduledLockedField}
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
                                    });
                                  })()}
                                </div>
                                {isInsightRecommendationField && selected.length > 0 ? (
                                  <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
                                    <table>
                                      <thead>
                                        <tr>
                                          <th>REC</th>
                                          <th>Priority</th>
                                          <th>Notes (optional)</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {selected.map((recId) => {
                                          const row =
                                            insightRecommendationRows.find((item) => item.recId === recId) ??
                                            {
                                              recId,
                                              priority: "medium" as InsightRecommendationPriority,
                                              notes: "",
                                            };
                                          const recTitle = recCatalogById.get(recId)?.title ?? recId;
                                          return (
                                            <tr key={recId}>
                                              <td>
                                                <strong>{recId}</strong>
                                                <br />
                                                <small>{recTitle}</small>
                                              </td>
                                              <td>
                                                <select
                                                  value={row.priority}
                                                  disabled={isTrainingScheduledLockedField}
                                                  onChange={(event) => {
                                                    const nextPriority =
                                                      normalizeInsightRecommendationPriority(
                                                        event.target.value,
                                                      );
                                                    setInsightRecommendationRows((prev) => {
                                                      const byId = new Map(
                                                        prev.map((entry) => [entry.recId, entry]),
                                                      );
                                                      byId.set(recId, {
                                                        recId,
                                                        priority: nextPriority,
                                                        notes: byId.get(recId)?.notes ?? "",
                                                      });
                                                      return selected.map(
                                                        (selectedRecId) =>
                                                          byId.get(selectedRecId) ?? {
                                                            recId: selectedRecId,
                                                            priority: "medium",
                                                            notes: "",
                                                          },
                                                      );
                                                    });
                                                  }}
                                                >
                                                  <option value="high">High</option>
                                                  <option value="medium">Medium</option>
                                                  <option value="low">Low</option>
                                                </select>
                                              </td>
                                              <td>
                                                <input
                                                  value={row.notes}
                                                  placeholder="Optional implementation notes"
                                                  disabled={isTrainingScheduledLockedField}
                                                  onChange={(event) => {
                                                    const nextNotes = event.target.value;
                                                    setInsightRecommendationRows((prev) => {
                                                      const byId = new Map(
                                                        prev.map((entry) => [entry.recId, entry]),
                                                      );
                                                      byId.set(recId, {
                                                        recId,
                                                        priority:
                                                          byId.get(recId)?.priority ?? "medium",
                                                        notes: nextNotes,
                                                      });
                                                      return selected.map(
                                                        (selectedRecId) =>
                                                          byId.get(selectedRecId) ?? {
                                                            recId: selectedRecId,
                                                            priority: "medium",
                                                            notes: "",
                                                          },
                                                      );
                                                    });
                                                  }}
                                                />
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : null}
                                {field.helperText ? (
                                  <small className="portal-field-help">{field.helperText}</small>
                                ) : null}
                              </fieldset>
                            );
                          }

                          return (
                            <label key={field.key}>
                              {renderLabel(field.label, isFieldRequiredForUi)}
                              {(() => {
                                const isTrainingAutoAttendanceField =
                                  config.module === "training" &&
                                  trainingAutoAttendanceKeys.has(field.key);
                                const isAutoLinkedGeoField = autoLinkedGeoPayloadKeys.has(field.key);
                                const geoFieldValue = isAutoLinkedGeoField
                                  ? field.key === "region"
                                    ? selectedFormSchool?.region ?? sanitizeForInput(value)
                                    : field.key === "subRegion"
                                      ? selectedFormSchool?.subRegion ?? sanitizeForInput(value)
                                      : field.key === "district"
                                        ? selectedFormSchool?.district ?? sanitizeForInput(value)
                                        : field.key === "subCounty"
                                          ? selectedFormSchool?.subCounty ?? sanitizeForInput(value)
                                          : field.key === "parish"
                                            ? selectedFormSchool?.parish ?? sanitizeForInput(value)
                                            : sanitizeForInput(value)
                                  : sanitizeForInput(value);
                                const computedValue =
                                  field.key === "numberAttended"
                                    ? String(trainingParticipantStats.total)
                                    : field.key === "femaleCount"
                                      ? String(trainingParticipantStats.female)
                                      : field.key === "maleCount"
                                        ? String(trainingParticipantStats.male)
                                        : field.key === "teachersFemale"
                                          ? String(trainingParticipantStats.teacherFemale)
                                          : field.key === "teachersMale"
                                            ? String(trainingParticipantStats.teacherMale)
                                            : field.key === "schoolLeadersFemale"
                                              ? String(trainingParticipantStats.leaderFemale)
                                              : field.key === "schoolLeadersMale"
                                                ? String(trainingParticipantStats.leaderMale)
                                        : Array.isArray(value)
                                          ? value.join(", ")
                                          : geoFieldValue;

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
                                    required={isFieldRequiredForUi}
                                    readOnly={
                                      isTrainingAutoAttendanceField ||
                                      isAutoLinkedGeoField ||
                                      isTrainingScheduledLockedField
                                    }
                                    disabled={isTrainingScheduledLockedField}
                                  />
                                );
                              })()}
                              {field.helperText ? (
                                <small className="portal-field-help">{field.helperText}</small>
                              ) : null}
                              {config.module === "training" &&
                                trainingAutoAttendanceKeys.has(field.key) ? (
                                <small className="portal-field-help">
                                  Auto-calculated from participant entries.
                                </small>
                              ) : null}
                            </label>
                          );
                        })}
                      </div>
                    );

                    if (section.collapsible) {
                      return (
                        <details key={section.id} className="card full-width portal-form-section" open={false}>
                          <summary className="portal-section-summary" style={{ cursor: 'pointer', outline: 'none' }}>
                            <strong>{section.title}</strong>
                            <span className="text-sm text-slate-500 ml-2">(Click to expand)</span>
                          </summary>
                          <div className="pt-4 border-t mt-2">
                            {content}
                          </div>
                        </details>
                      );
                    }

                    return (
                      <fieldset key={section.id} className="card full-width portal-form-section">
                        <legend>{section.title}</legend>
                        {content}
                      </fieldset>
                    );
                  })}

                  {config.module === "visit" && visitStep === 3 ? (
                    <div className="full-width">
                      {visitAllowsObservation && formState.schoolId ? (
                        <Suspense fallback={<div className="portal-muted">Loading evaluation panel…</div>}>
                        <LessonEvaluationPanel
                          schoolId={Number(formState.schoolId)}
                          schoolName={formState.schoolName}
                          defaultVisitId={typeof formState.id === "number" ? formState.id : null}
                          title="Teacher Observation and Evaluation"
                          description="Add teacher reading lesson evaluations linked to this visit."
                          newButtonLabel="New Observation"
                          allowVoid={currentUser.isSuperAdmin}
                        />
                        </Suspense>
                      ) : visitAllowsObservation ? (
                        <p className="portal-muted">
                          Select a school account first, then save this visit to attach lesson evaluations.
                        </p>
                      ) : (
                        <p className="portal-muted">
                          Lesson evaluations are disabled because implementation has not started.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {!isVisitModule || visitStep === 4 ? (
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
                            Files are uploaded after Save Draft or Submit. Report generators auto-pick the best photos for evidence sections.
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
                  ) : null}

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
                    {isVisitModule ? (
                      <>
                        <button
                          className="button button-ghost"
                          type="button"
                          onClick={() => setVisitStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev))}
                          disabled={visitStep === 1}
                        >
                          Back
                        </button>
                        <button
                          className="button button-ghost"
                          type="button"
                          onClick={() =>
                            setVisitStep((prev) =>
                              prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev,
                            )
                          }
                          disabled={
                            visitStep === 4 ||
                            (visitStep === 1 && !formState.schoolId.trim()) ||
                            (visitStep === 1 && !visitImplementationUnlocked) ||
                            (visitStep === 2 &&
                              !String(formState.payload.implementationStatus ?? "").trim())
                          }
                        >
                          Next
                        </button>
                      </>
                    ) : null}
                    <button className="button" type="button" disabled={saving} onClick={() => void submitRecord("Draft")}>
                      {saving ? "Saving..." : "Save Draft"}
                    </button>
                    <button
                      className="button button-ghost"
                      type="button"
                      disabled={
                        saving ||
                        (isVisitModule && (visitStep !== 4 || !visitImplementationUnlocked))
                      }
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
            </div>
          </div>,
          document.body,
        )
        : null}
      <Suspense fallback={null}>
      <EgraLearnerInputModal
        isOpen={isEgraModalOpen}
        onClose={() => setIsEgraModalOpen(false)}
        onSave={handleSaveLearner}
        onSaveAndClose={handleSaveLearnerAndClose}
        nextLearnerId={modalLearnerId}
        nextNo={modalLearnerNo}
        schoolId={formState.schoolId ? Number(formState.schoolId) : null}
        schoolName={formState.schoolName}
      />
      </Suspense>
    </>
  );
}
