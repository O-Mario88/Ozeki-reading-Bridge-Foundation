export const ASSESSMENT_MODEL_VERSION_UG_MASTERY_ONETEST_STYLE_V1 =
  "UG-MASTERY-ONETEST-STYLE-v1";
export const DEFAULT_BENCHMARK_VERSION = "UG-MASTERY-BENCHMARK-v1";
export const DEFAULT_SCORING_PROFILE_VERSION = "UG-MASTERY-SCORING-v1";

export const PUBLIC_TRAFFIC_LIGHT_EXPLANATIONS = {
  green: "Green means the learner has mastered the skill.",
  amber: "Amber means the learner is developing but needs more speed or consistency.",
  red: "Red means the learner needs targeted support.",
} as const;

export type MasteryDomainKey =
  | "phonemic_awareness"
  | "grapheme_phoneme_correspondence"
  | "blending_decoding"
  | "word_recognition_fluency"
  | "sentence_paragraph_construction"
  | "comprehension";

export type MasteryStatus = "green" | "amber" | "red";
export type MasteryStatusLabel = "Green" | "Amber" | "Red";

export type StageLabel =
  | "Pre-Reader"
  | "Early Decoder"
  | "Developing Reader"
  | "Fluent Reader"
  | "Comprehending Reader";

export const MASTERY_DOMAIN_SEQUENCE: Array<{
  key: MasteryDomainKey;
  order: number;
  displayName:
    | "Phonemic Awareness"
    | "Grapheme-Phoneme Correspondence"
    | "Blending & Decoding"
    | "Word Recognition & Fluency"
    | "Sentence & Paragraph Construction"
    | "Comprehension";
  description: string;
  isFoundational: boolean;
}> = [
  {
    key: "phonemic_awareness",
    order: 1,
    displayName: "Phonemic Awareness",
    description:
      "The ability to hear and identify individual sounds (phonemes) in spoken words.",
    isFoundational: true,
  },
  {
    key: "grapheme_phoneme_correspondence",
    order: 2,
    displayName: "Grapheme-Phoneme Correspondence",
    description:
      'Matching sounds to their written letters (e.g., knowing "b" makes the /b/ sound).',
    isFoundational: true,
  },
  {
    key: "blending_decoding",
    order: 3,
    displayName: "Blending & Decoding",
    description:
      'Joining sounds together to read a word (e.g., /c/-/a/-/t/ = "cat").',
    isFoundational: true,
  },
  {
    key: "word_recognition_fluency",
    order: 4,
    displayName: "Word Recognition & Fluency",
    description:
      "Transitioning from sounding out to recognizing words instantly, including sight words.",
    isFoundational: false,
  },
  {
    key: "sentence_paragraph_construction",
    order: 5,
    displayName: "Sentence & Paragraph Construction",
    description:
      "Understanding how words work together in phrases and sentences, including basic punctuation.",
    isFoundational: false,
  },
  {
    key: "comprehension",
    order: 6,
    displayName: "Comprehension",
    description:
      "The ultimate goal—reading a story and demonstrating understanding of plot, characters, or facts.",
    isFoundational: false,
  },
];

export const MASTERY_STAGE_METADATA: Array<{
  order: number;
  label: StageLabel;
  benchmarkGradeLevel: string;
}> = [
  { order: 1, label: "Pre-Reader", benchmarkGradeLevel: "Reading below Grade 1 Level" },
  { order: 2, label: "Early Decoder", benchmarkGradeLevel: "Reading at a Grade 1 Level" },
  { order: 3, label: "Developing Reader", benchmarkGradeLevel: "Reading at a Grade 2 Level" },
  { order: 4, label: "Fluent Reader", benchmarkGradeLevel: "Reading at a Grade 3 Level" },
  { order: 5, label: "Comprehending Reader", benchmarkGradeLevel: "Reading at a Grade 4 Level" },
];

export interface MasteryItemResponseInput {
  domainKey: MasteryDomainKey;
  itemKey: string;
  accuracy: boolean | number;
  latencyMs?: number | null;
  attempts?: number | null;
  hintUsed?: boolean | null;
  correctionPromptUsed?: boolean | null;
  itemDifficulty?: string | null;
  gradeBand?: string | null;
  promptType?: string | null;
  audioSupportUsed?: boolean | null;
}

export interface MasteryDomainInput {
  domainScoreRaw?: number | null;
  domainAccuracy?: number | null;
  domainLatencyAvgMs?: number | null;
  domainAttemptsAvg?: number | null;
  domainSupportUsageRate?: number | null;
  domainMasteryStatus?: MasteryStatus | MasteryStatusLabel | null;
}

export interface MasteryLegacyScoresInput {
  letterIdentificationScore?: number | null;
  soundIdentificationScore?: number | null;
  decodableWordsScore?: number | null;
  undecodableWordsScore?: number | null;
  madeUpWordsScore?: number | null;
  storyReadingScore?: number | null;
  readingComprehensionScore?: number | null;
  fluencyAccuracyScore?: number | null;
}

export interface OneTestMasterySettings {
  modelVersion: string;
  benchmarkVersion: string;
  scoringProfileVersion: string;
  itemWeights: {
    accuracy: number;
    latency: number;
    attemptSupport: number;
  };
  masteryThresholds: {
    greenMin: number;
    amberMin: number;
    forceRedIfAccuracyBelow: number;
    downgradeGreenIfSupportAbove: number;
    highAccuracyForLatencyCheck: number;
  };
  latencyThresholdsMs: Record<
    MasteryDomainKey,
    {
      fast: number;
      developing: number;
      slowCap: number;
    }
  >;
  attemptThresholds: {
    firstTryIdeal: number;
    amberAttemptsMax: number;
    redAttemptsMin: number;
  };
  benchmarkExpectations: {
    gradeToExpectedStageOrder: Record<string, number>;
    ageToExpectedStageOrder: Record<string, number>;
  };
}

export interface ComputedItemScore {
  domainKey: MasteryDomainKey;
  itemKey: string;
  accuracy: boolean;
  latencyMs: number | null;
  attempts: number;
  hintUsed: boolean;
  correctionUsed: boolean;
  accuracyScore: number;
  latencyScore: number;
  attemptSupportScore: number;
  itemScore: number;
}

export interface ComputedDomainMastery {
  domainKey: MasteryDomainKey;
  domainOrder: number;
  domainDisplayName: string;
  domainDescription: string;
  domainScoreRaw: number | null;
  domainAccuracy: number | null;
  domainLatencyAvgMs: number | null;
  domainAttemptsAvg: number | null;
  domainSupportUsageRate: number | null;
  domainMasteryScore: number | null;
  domainMasteryStatus: MasteryStatus;
}

export interface OneTestMasteryComputationResult {
  modelVersion: string;
  benchmarkVersion: string;
  scoringProfileVersion: string;
  domains: Record<MasteryDomainKey, ComputedDomainMastery>;
  itemScores: ComputedItemScore[];
  readingStageLabel: StageLabel;
  readingStageOrder: number;
  benchmarkGradeLevel: string;
  expectedVsActualStatus:
    | "Below expected level for age/grade"
    | "At expected level"
    | "Above expected level"
    | "Data not available";
  stageReasonCode: string;
  stageReasonSummary: string;
  masteryProfileSummary: string;
}

const DOMAIN_ORDER = new Map(MASTERY_DOMAIN_SEQUENCE.map((domain) => [domain.key, domain.order]));
const DOMAIN_DESCRIPTOR = new Map(MASTERY_DOMAIN_SEQUENCE.map((domain) => [domain.key, domain]));

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function normalizeMasteryStatus(value: unknown): MasteryStatus | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "green" || normalized === "proficient") return "green";
  if (normalized === "amber" || normalized === "developing") return "amber";
  if (normalized === "red" || normalized === "emergent") return "red";
  return null;
}

export function masteryStatusLabel(value: MasteryStatus): MasteryStatusLabel {
  if (value === "green") return "Green";
  if (value === "amber") return "Amber";
  return "Red";
}

function statusOrder(value: MasteryStatus) {
  if (value === "red") return 1;
  if (value === "amber") return 2;
  return 3;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeLegacyScore(value: number | null | undefined) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) {
    return null;
  }
  if (numeric <= 1) {
    return clamp(numeric * 100, 0, 100);
  }
  if (numeric <= 10) {
    return clamp(numeric * 10, 0, 100);
  }
  if (numeric <= 100) {
    return clamp(numeric, 0, 100);
  }
  return clamp(numeric, 0, 100);
}

function normalizeLegacyFluencyScore(value: number | null | undefined) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) {
    return null;
  }
  if (numeric <= 1) {
    return clamp(numeric * 100, 0, 100);
  }
  if (numeric <= 10) {
    return clamp(numeric * 10, 0, 100);
  }
  if (numeric <= 100) {
    return clamp(numeric, 0, 100);
  }
  return clamp((numeric / 80) * 100, 0, 100);
}

function normalizeLegacyComprehension(value: number | null | undefined) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) {
    return null;
  }
  if (numeric <= 5) {
    return clamp((numeric / 5) * 100, 0, 100);
  }
  return normalizeLegacyScore(numeric);
}

export function getDefaultOneTestMasterySettings(): OneTestMasterySettings {
  return {
    modelVersion: ASSESSMENT_MODEL_VERSION_UG_MASTERY_ONETEST_STYLE_V1,
    benchmarkVersion: DEFAULT_BENCHMARK_VERSION,
    scoringProfileVersion: DEFAULT_SCORING_PROFILE_VERSION,
    itemWeights: {
      accuracy: 0.7,
      latency: 0.2,
      attemptSupport: 0.1,
    },
    masteryThresholds: {
      greenMin: 80,
      amberMin: 50,
      forceRedIfAccuracyBelow: 40,
      downgradeGreenIfSupportAbove: 35,
      highAccuracyForLatencyCheck: 80,
    },
    latencyThresholdsMs: {
      phonemic_awareness: { fast: 2000, developing: 4500, slowCap: 9000 },
      grapheme_phoneme_correspondence: { fast: 2200, developing: 4800, slowCap: 9000 },
      blending_decoding: { fast: 2500, developing: 5200, slowCap: 10000 },
      word_recognition_fluency: { fast: 1800, developing: 3500, slowCap: 7000 },
      sentence_paragraph_construction: { fast: 2500, developing: 5500, slowCap: 10500 },
      comprehension: { fast: 2800, developing: 6500, slowCap: 12000 },
    },
    attemptThresholds: {
      firstTryIdeal: 1,
      amberAttemptsMax: 2,
      redAttemptsMin: 3,
    },
    benchmarkExpectations: {
      gradeToExpectedStageOrder: {
        Baby: 1,
        Middle: 1,
        Top: 2,
        P1: 2,
        P2: 3,
        P3: 4,
        P4: 5,
        P5: 5,
        P6: 5,
        P7: 5,
      },
      ageToExpectedStageOrder: {
        "5": 1,
        "6": 2,
        "7": 3,
        "8": 4,
        "9": 5,
        "10": 5,
        "11": 5,
        "12": 5,
      },
    },
  };
}

function normalizeLatencyScore(
  domainKey: MasteryDomainKey,
  latencyMs: number | null,
  settings: OneTestMasterySettings,
) {
  if (latencyMs === null) {
    return 0.5;
  }
  const threshold = settings.latencyThresholdsMs[domainKey];
  if (!threshold) {
    return 0.5;
  }
  if (latencyMs <= threshold.fast) {
    return 1;
  }
  if (latencyMs <= threshold.developing) {
    const span = Math.max(1, threshold.developing - threshold.fast);
    const ratio = (latencyMs - threshold.fast) / span;
    return clamp(1 - ratio * 0.45, 0.55, 1);
  }
  if (latencyMs <= threshold.slowCap) {
    const span = Math.max(1, threshold.slowCap - threshold.developing);
    const ratio = (latencyMs - threshold.developing) / span;
    return clamp(0.55 - ratio * 0.45, 0.1, 0.55);
  }
  return 0.1;
}

function normalizeAttemptSupportScore(
  attempts: number,
  hintUsed: boolean,
  correctionUsed: boolean,
  settings: OneTestMasterySettings,
) {
  let score = 1;
  if (attempts > settings.attemptThresholds.firstTryIdeal) {
    if (attempts <= settings.attemptThresholds.amberAttemptsMax) {
      score = 0.7;
    } else if (attempts >= settings.attemptThresholds.redAttemptsMin) {
      score = 0.4;
    } else {
      score = 0.55;
    }
  }
  if (hintUsed) {
    score -= 0.2;
  }
  if (correctionUsed) {
    score -= 0.2;
  }
  return clamp(score, 0, 1);
}

function normalizeAccuracyFlag(value: boolean | number) {
  if (typeof value === "boolean") {
    return value;
  }
  return Number(value) > 0;
}

function calculateItemScore(
  item: MasteryItemResponseInput,
  settings: OneTestMasterySettings,
): ComputedItemScore {
  const accuracy = normalizeAccuracyFlag(item.accuracy);
  const latencyMs = toNumberOrNull(item.latencyMs);
  const attempts = Math.max(1, Math.round(toNumberOrNull(item.attempts) ?? 1));
  const hintUsed = Boolean(item.hintUsed);
  const correctionUsed = Boolean(item.correctionPromptUsed);

  const accuracyScore = accuracy ? 1 : 0;
  const latencyScore = normalizeLatencyScore(item.domainKey, latencyMs, settings);
  const attemptSupportScore = normalizeAttemptSupportScore(
    attempts,
    hintUsed,
    correctionUsed,
    settings,
  );

  let itemScore =
    accuracyScore * settings.itemWeights.accuracy +
    latencyScore * settings.itemWeights.latency +
    attemptSupportScore * settings.itemWeights.attemptSupport;
  if (!accuracy) {
    itemScore = Math.min(itemScore, 0.15);
  }

  return {
    domainKey: item.domainKey,
    itemKey: item.itemKey,
    accuracy,
    latencyMs,
    attempts,
    hintUsed,
    correctionUsed,
    accuracyScore: round(accuracyScore, 3),
    latencyScore: round(latencyScore, 3),
    attemptSupportScore: round(attemptSupportScore, 3),
    itemScore: round(itemScore, 3),
  };
}

function fallbackDomainInputFromLegacyScores(
  key: MasteryDomainKey,
  legacyScores?: MasteryLegacyScoresInput | null,
): MasteryDomainInput | null {
  if (!legacyScores) {
    return null;
  }
  const decodable = normalizeLegacyScore(legacyScores.decodableWordsScore);
  const undecodable = normalizeLegacyScore(legacyScores.undecodableWordsScore);
  const madeUp = normalizeLegacyScore(legacyScores.madeUpWordsScore);
  const story = normalizeLegacyFluencyScore(legacyScores.storyReadingScore);
  const comprehension = normalizeLegacyComprehension(legacyScores.readingComprehensionScore);
  const letter = normalizeLegacyScore(legacyScores.letterIdentificationScore);
  const sound = normalizeLegacyScore(legacyScores.soundIdentificationScore);
  const fluencyAccuracy = normalizeLegacyScore(legacyScores.fluencyAccuracyScore);

  const averageOrNull = (values: Array<number | null>) => {
    const valid = values.filter((value): value is number => value !== null);
    return valid.length > 0 ? average(valid) : null;
  };

  if (key === "phonemic_awareness") {
    if (letter === null) return null;
    return { domainScoreRaw: letter, domainAccuracy: letter };
  }
  if (key === "grapheme_phoneme_correspondence") {
    if (sound === null) return null;
    return { domainScoreRaw: sound, domainAccuracy: sound };
  }
  if (key === "blending_decoding") {
    const value = averageOrNull([decodable, undecodable, madeUp]);
    if (value === null) return null;
    return { domainScoreRaw: value, domainAccuracy: value };
  }
  if (key === "word_recognition_fluency") {
    const value = averageOrNull([story, fluencyAccuracy]);
    if (value === null) return null;
    return { domainScoreRaw: value, domainAccuracy: value };
  }
  if (key === "sentence_paragraph_construction") {
    const value = averageOrNull([story, decodable]);
    if (value === null) return null;
    return { domainScoreRaw: value, domainAccuracy: value };
  }
  if (key === "comprehension") {
    if (comprehension === null) return null;
    return { domainScoreRaw: comprehension, domainAccuracy: comprehension };
  }
  return null;
}

function classifyDomainStatus(
  domain: ComputedDomainMastery,
  settings: OneTestMasterySettings,
  preferredStatus?: MasteryStatus | null,
) {
  let status: MasteryStatus = "red";
  if (preferredStatus) {
    status = preferredStatus;
  } else {
    const score = domain.domainMasteryScore ?? domain.domainScoreRaw ?? 0;
    if (score >= settings.masteryThresholds.greenMin) {
      status = "green";
    } else if (score >= settings.masteryThresholds.amberMin) {
      status = "amber";
    } else {
      status = "red";
    }
  }

  if (
    domain.domainAccuracy !== null &&
    domain.domainAccuracy < settings.masteryThresholds.forceRedIfAccuracyBelow
  ) {
    status = "red";
  }

  if (
    status === "green" &&
    domain.domainAccuracy !== null &&
    domain.domainAccuracy >= settings.masteryThresholds.highAccuracyForLatencyCheck &&
    domain.domainLatencyAvgMs !== null
  ) {
    const latency = settings.latencyThresholdsMs[domain.domainKey];
    if (domain.domainLatencyAvgMs > latency.developing) {
      status = "amber";
    }
  }

  if (
    status === "green" &&
    domain.domainSupportUsageRate !== null &&
    domain.domainSupportUsageRate > settings.masteryThresholds.downgradeGreenIfSupportAbove
  ) {
    status = "amber";
  }

  return status;
}

function domainByKey(key: MasteryDomainKey) {
  return DOMAIN_DESCRIPTOR.get(key)!;
}

function labelForStageOrder(order: number): StageLabel {
  const row = MASTERY_STAGE_METADATA.find((entry) => entry.order === order);
  return (row?.label ?? "Pre-Reader") as StageLabel;
}

function benchmarkLabelForStageOrder(order: number) {
  const row = MASTERY_STAGE_METADATA.find((entry) => entry.order === order);
  return row?.benchmarkGradeLevel ?? "Data not available";
}

function expectedStageOrder(grade: string | null | undefined, age: number | null | undefined, settings: OneTestMasterySettings) {
  const gradeKey = String(grade ?? "").trim();
  if (gradeKey) {
    const fromGrade = settings.benchmarkExpectations.gradeToExpectedStageOrder[gradeKey];
    if (Number.isInteger(fromGrade) && fromGrade > 0) {
      return fromGrade;
    }
  }
  const ageNumber = toNumberOrNull(age);
  if (ageNumber !== null) {
    const fromAge = settings.benchmarkExpectations.ageToExpectedStageOrder[String(Math.round(ageNumber))];
    if (Number.isInteger(fromAge) && fromAge > 0) {
      return fromAge;
    }
  }
  return null;
}

function computeStage(
  statuses: Record<MasteryDomainKey, MasteryStatus>,
) {
  const pa = statuses.phonemic_awareness;
  const gpc = statuses.grapheme_phoneme_correspondence;
  const blend = statuses.blending_decoding;
  const fluency = statuses.word_recognition_fluency;
  const sentence = statuses.sentence_paragraph_construction;
  const comp = statuses.comprehension;

  let stageOrder = 1;
  let reasonCode = "FOUNDATION_NOT_MASTERED";
  let reasonSummary =
    "Foundational domains are still developing; learner needs structured progression support.";

  if (pa === "red") {
    return {
      stageOrder: 1,
      reasonCode: "PHONEMIC_AWARENESS_RED",
      reasonSummary:
        "Phonemic Awareness is Red, so advanced stages are not unlocked yet.",
    };
  }
  if (gpc === "red") {
    return {
      stageOrder: 2,
      reasonCode: "GPC_RED_CAP",
      reasonSummary:
        "Grapheme-Phoneme Correspondence is Red, so stage is capped at Early Decoder.",
    };
  }

  if (statusOrder(pa) >= 2 && statusOrder(gpc) >= 2) {
    stageOrder = 2;
    reasonCode = "FOUNDATIONAL_ENTRY";
    reasonSummary = "Foundational sound awareness and symbol-sound mapping are in place.";
  }

  if (blend === "red") {
    return {
      stageOrder: Math.min(stageOrder, 2),
      reasonCode: "BLENDING_RED_CAP",
      reasonSummary:
        "Blending & Decoding is Red, so reading stage cannot progress beyond Early Decoder.",
    };
  }

  if (statusOrder(blend) >= 2) {
    stageOrder = 3;
    reasonCode = "DECODING_DEVELOPING";
    reasonSummary = "Decoding is functioning, but fluency and sentence-level control still need consolidation.";
  }

  if (blend !== "green" && fluency === "green") {
    stageOrder = Math.min(stageOrder, 3);
    reasonCode = "SEQUENTIAL_CONSTRAINT_DECODING";
    reasonSummary =
      "Fluency was downgraded by sequential constraint because Blending & Decoding is not yet green.";
  } else if (statusOrder(fluency) >= 2) {
    stageOrder = Math.max(stageOrder, 4);
    reasonCode = "FLUENCY_DEVELOPING";
    reasonSummary = "Word recognition and fluency are developing toward automaticity.";
  }

  if (sentence === "red") {
    stageOrder = Math.min(stageOrder, 4);
    reasonCode = "SENTENCE_RED_CAP";
    reasonSummary =
      "Sentence & Paragraph Construction is Red, so learner remains below full comprehension stage.";
  } else if (statusOrder(sentence) >= 2 && stageOrder >= 4) {
    stageOrder = Math.max(stageOrder, 4);
    reasonCode = "SENTENCE_STRUCTURING_READY";
    reasonSummary = "Sentence and paragraph construction is supporting fluent reading behaviour.";
  }

  if (comp === "green" && pa === "green" && gpc === "green" && blend === "green") {
    stageOrder = 5;
    reasonCode = "COMPREHENSION_WITH_FOUNDATION";
    reasonSummary =
      "Comprehension is Green and foundational decoding domains are Green, so learner is a Comprehending Reader.";
  } else if (comp !== "red" && stageOrder >= 4) {
    stageOrder = 4;
    reasonCode = "COMPREHENSION_NOT_FULLY_MASTERED";
    reasonSummary =
      "Comprehension has not fully mastered yet, so learner remains at Fluent Reader stage.";
  }

  if (comp === "green" && (pa !== "green" || gpc !== "green" || blend !== "green")) {
    stageOrder = Math.min(stageOrder, 3);
    reasonCode = "FOUNDATION_CAPS_COMPREHENSION";
    reasonSummary =
      "Comprehension cannot overstate reading stage when foundational decoding is still weak.";
  }

  stageOrder = clamp(stageOrder, 1, 5);
  return { stageOrder, reasonCode, reasonSummary };
}

export function isOneTestStyleModelVersion(version: string | null | undefined) {
  const normalized = String(version ?? "").trim();
  return normalized === ASSESSMENT_MODEL_VERSION_UG_MASTERY_ONETEST_STYLE_V1;
}

export function computeOneTestStyleMasteryAssessment(input: {
  grade?: string | null;
  age?: number | null;
  domainInputs?: Partial<Record<MasteryDomainKey, MasteryDomainInput>> | null;
  itemResponses?: MasteryItemResponseInput[] | null;
  legacyScores?: MasteryLegacyScoresInput | null;
  settings?: OneTestMasterySettings | null;
  modelVersion?: string | null;
  benchmarkVersion?: string | null;
  scoringProfileVersion?: string | null;
}): OneTestMasteryComputationResult {
  const settings = input.settings ?? getDefaultOneTestMasterySettings();
  const modelVersion = input.modelVersion?.trim() || settings.modelVersion;
  const benchmarkVersion = input.benchmarkVersion?.trim() || settings.benchmarkVersion;
  const scoringProfileVersion =
    input.scoringProfileVersion?.trim() || settings.scoringProfileVersion;

  const items = (input.itemResponses ?? []).filter(
    (item) => item && typeof item === "object" && DOMAIN_ORDER.has(item.domainKey),
  );
  const scoredItems = items.map((item) => calculateItemScore(item, settings));

  const providedDomainInputs = input.domainInputs ?? {};
  const domains = {} as Record<MasteryDomainKey, ComputedDomainMastery>;
  const statuses = {} as Record<MasteryDomainKey, MasteryStatus>;

  for (const descriptor of MASTERY_DOMAIN_SEQUENCE) {
    const key = descriptor.key;
    const byDomainItems = scoredItems.filter((item) => item.domainKey === key);
    const inputDomain = providedDomainInputs[key] ?? null;
    const legacyFallback = fallbackDomainInputFromLegacyScores(key, input.legacyScores);
    const merged = inputDomain ?? legacyFallback ?? null;

    const itemAccuracyValues = byDomainItems.map((item) => (item.accuracy ? 1 : 0));
    const itemLatencyValues = byDomainItems
      .map((item) => item.latencyMs)
      .filter((value): value is number => value !== null);
    const itemAttemptValues = byDomainItems.map((item) => item.attempts);
    const itemSupportFlags = byDomainItems.map((item) => (item.hintUsed || item.correctionUsed ? 1 : 0));
    const itemScores = byDomainItems.map((item) => item.itemScore * 100);

    const itemAccuracyPct =
      itemAccuracyValues.length > 0
        ? (itemAccuracyValues.reduce<number>((a, b) => a + b, 0) / itemAccuracyValues.length) * 100
        : null;
    const itemSupportRate =
      itemSupportFlags.length > 0
        ? (itemSupportFlags.reduce<number>((a, b) => a + b, 0) / itemSupportFlags.length) * 100
        : null;
    const mergedScoreRaw = toNumberOrNull(merged?.domainScoreRaw);
    const domainScoreRaw =
      itemScores.length > 0 ? average(itemScores) : mergedScoreRaw !== null ? mergedScoreRaw : null;
    const domainAccuracy =
      itemAccuracyPct !== null
        ? itemAccuracyPct
        : toNumberOrNull(merged?.domainAccuracy);
    const domainLatencyAvgMs =
      itemLatencyValues.length > 0
        ? average(itemLatencyValues)
        : toNumberOrNull(merged?.domainLatencyAvgMs);
    const domainAttemptsAvg =
      itemAttemptValues.length > 0
        ? average(itemAttemptValues)
        : toNumberOrNull(merged?.domainAttemptsAvg);
    const domainSupportUsageRate =
      itemSupportRate !== null ? itemSupportRate : toNumberOrNull(merged?.domainSupportUsageRate);
    const masteryScore = domainScoreRaw !== null ? clamp(domainScoreRaw, 0, 100) : null;

    const computedDomain: ComputedDomainMastery = {
      domainKey: key,
      domainOrder: descriptor.order,
      domainDisplayName: descriptor.displayName,
      domainDescription: descriptor.description,
      domainScoreRaw: masteryScore,
      domainAccuracy: domainAccuracy !== null ? clamp(domainAccuracy, 0, 100) : null,
      domainLatencyAvgMs: domainLatencyAvgMs !== null ? Math.max(0, domainLatencyAvgMs) : null,
      domainAttemptsAvg: domainAttemptsAvg !== null ? Math.max(1, domainAttemptsAvg) : null,
      domainSupportUsageRate:
        domainSupportUsageRate !== null ? clamp(domainSupportUsageRate, 0, 100) : null,
      domainMasteryScore: masteryScore,
      domainMasteryStatus: "red",
    };

    const preferredStatus = normalizeMasteryStatus(merged?.domainMasteryStatus);
    const status = classifyDomainStatus(computedDomain, settings, preferredStatus);
    computedDomain.domainMasteryStatus = status;
    domains[key] = computedDomain;
    statuses[key] = status;
  }

  if (
    (statuses.blending_decoding === "red" || statuses.blending_decoding === "amber") &&
    statuses.word_recognition_fluency === "green"
  ) {
    statuses.word_recognition_fluency = "amber";
    domains.word_recognition_fluency.domainMasteryStatus = "amber";
  }

  const stage = computeStage(statuses);
  const readingStageOrder = stage.stageOrder;
  const readingStageLabel = labelForStageOrder(readingStageOrder);
  const benchmarkGradeLevel = benchmarkLabelForStageOrder(readingStageOrder);
  const expectedOrder = expectedStageOrder(input.grade, input.age, settings);

  const expectedVsActualStatus: OneTestMasteryComputationResult["expectedVsActualStatus"] =
    expectedOrder === null
      ? "Data not available"
      : readingStageOrder < expectedOrder
      ? "Below expected level for age/grade"
      : readingStageOrder === expectedOrder
      ? "At expected level"
      : "Above expected level";

  const masteryProfileSummary = MASTERY_DOMAIN_SEQUENCE.map((domain) => {
    const status = domains[domain.key].domainMasteryStatus;
    return `${domain.displayName}: ${masteryStatusLabel(status)}`;
  }).join("; ");

  return {
    modelVersion,
    benchmarkVersion,
    scoringProfileVersion,
    domains,
    itemScores: scoredItems,
    readingStageLabel,
    readingStageOrder,
    benchmarkGradeLevel,
    expectedVsActualStatus,
    stageReasonCode: stage.reasonCode,
    stageReasonSummary: stage.reasonSummary,
    masteryProfileSummary,
  };
}

export function parseMasteryDomainKey(value: string): MasteryDomainKey | null {
  const normalized = value.trim().toLowerCase();
  if (DOMAIN_ORDER.has(normalized as MasteryDomainKey)) {
    return normalized as MasteryDomainKey;
  }
  return null;
}

export function parseDomainInputsFromUnknown(
  raw: unknown,
): Partial<Record<MasteryDomainKey, MasteryDomainInput>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const input = raw as Record<string, unknown>;
  const output: Partial<Record<MasteryDomainKey, MasteryDomainInput>> = {};
  for (const [key, value] of Object.entries(input)) {
    const domainKey = parseMasteryDomainKey(key);
    if (!domainKey || !value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }
    const domain = value as Record<string, unknown>;
    output[domainKey] = {
      domainScoreRaw: toNumberOrNull(domain.domainScoreRaw),
      domainAccuracy: toNumberOrNull(domain.domainAccuracy),
      domainLatencyAvgMs: toNumberOrNull(domain.domainLatencyAvgMs),
      domainAttemptsAvg: toNumberOrNull(domain.domainAttemptsAvg),
      domainSupportUsageRate: toNumberOrNull(domain.domainSupportUsageRate),
      domainMasteryStatus: normalizeMasteryStatus(domain.domainMasteryStatus),
    };
  }
  return output;
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function parseItemResponsesFromUnknown(raw: unknown): MasteryItemResponseInput[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const parsed: MasteryItemResponseInput[] = [];
  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      return;
    }
    const row = entry as Record<string, unknown>;
    const domainKey = parseMasteryDomainKey(String(row.domainKey ?? row.domain_key ?? ""));
    if (!domainKey) {
      return;
    }
    const itemKey = String(row.itemKey ?? row.item_key ?? `item-${index + 1}`).trim();
    if (!itemKey) {
      return;
    }
    parsed.push({
      domainKey,
      itemKey,
      accuracy: asBoolean(row.accuracy),
      latencyMs: toNumberOrNull(row.latencyMs ?? row.latency_ms),
      attempts: toNumberOrNull(row.attempts),
      hintUsed: asBoolean(row.hintUsed ?? row.hint_used),
      correctionPromptUsed: asBoolean(row.correctionPromptUsed ?? row.correction_used),
      itemDifficulty: String(row.itemDifficulty ?? row.item_difficulty ?? "").trim() || null,
      gradeBand: String(row.gradeBand ?? row.grade_band ?? "").trim() || null,
      promptType: String(row.promptType ?? row.prompt_type ?? "").trim() || null,
      audioSupportUsed: asBoolean(row.audioSupportUsed ?? row.audio_support_used),
    });
  });
  return parsed;
}

export function emptyDomainMasteryDistribution() {
  const result: Record<
    MasteryDomainKey,
    { green: number; amber: number; red: number; n: number }
  > = {
    phonemic_awareness: { green: 0, amber: 0, red: 0, n: 0 },
    grapheme_phoneme_correspondence: { green: 0, amber: 0, red: 0, n: 0 },
    blending_decoding: { green: 0, amber: 0, red: 0, n: 0 },
    word_recognition_fluency: { green: 0, amber: 0, red: 0, n: 0 },
    sentence_paragraph_construction: { green: 0, amber: 0, red: 0, n: 0 },
    comprehension: { green: 0, amber: 0, red: 0, n: 0 },
  };
  return result;
}

export function masterDomainDisplayName(key: MasteryDomainKey) {
  return domainByKey(key).displayName;
}
