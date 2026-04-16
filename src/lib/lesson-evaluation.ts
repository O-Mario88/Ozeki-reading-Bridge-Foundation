export const LESSON_EVALUATION_SCORE_LABELS = {
  1: "Needs Support",
  2: "Developing",
  3: "Good",
  4: "Exemplary",
} as const;

export type LessonEvaluationScore = keyof typeof LESSON_EVALUATION_SCORE_LABELS;

export const LESSON_FOCUS_OPTIONS = [
  "Sounds",
  "Blending/Decoding",
  "Fluency",
  "Comprehension",
  "Tricky words",
] as const;

export type LessonFocusOption = (typeof LESSON_FOCUS_OPTIONS)[number];

/* ─── Lesson Structure Checklist (Section B — Yes/No) ─────── */

export type LessonStructureItemKey = "LS1" | "LS2" | "LS3" | "LS4" | "LS5";

export interface LessonStructureItemDefinition {
  itemKey: LessonStructureItemKey;
  label: string;
  prompt: string;
}

export const LESSON_STRUCTURE_ITEMS: LessonStructureItemDefinition[] = [
  {
    itemKey: "LS1",
    label: "Revision",
    prompt: "Quick review of known sounds/blending of words daily.",
  },
  {
    itemKey: "LS2",
    label: "Teach New Sound",
    prompt: "Clear introduction of the new sound/phoneme.",
  },
  {
    itemKey: "LS3",
    label: "Reading Activities",
    prompt: "Applying knowledge to decode words.",
  },
  {
    itemKey: "LS4",
    label: "Teach Tricky Word",
    prompt: "Introducing a high-frequency, non-decodable word.",
  },
  {
    itemKey: "LS5",
    label: "Writing Activities",
    prompt: "Encoding practice via segmenting.",
  },
];

export const LESSON_STRUCTURE_ITEM_KEYS = LESSON_STRUCTURE_ITEMS.map(
  (item) => item.itemKey,
) as readonly LessonStructureItemKey[];

/* ─── Scored Domains (Section C & D — 1–4 scale) ─────────── */

export type LessonEvaluationDomainKey =
  | "gpc"
  | "blending"
  | "engagement";

export type LessonEvaluationItemKey =
  | "C1a"
  | "C1b"
  | "C1c"
  | "C2a"
  | "C2b"
  | "C2c"
  | "C2d"
  | "C2e"
  | "C2f"
  | "D1"
  | "D2"
  | "D3"
  | "D4";

export type LessonEvaluationGrade = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7";

export type LessonEvaluationOverallLevel = "Exemplary" | "Good" | "Developing" | "Needs Support";

export const LESSON_EVALUATION_DOMAIN_LABELS: Record<LessonEvaluationDomainKey, string> = {
  gpc: "C1) Phoneme–Grapheme Correspondence (GPC)",
  blending: "C2) Blending (Reading) and Teaching Practices",
  engagement: "D) Learner Engagement & Assessment",
};

export type LessonEvaluationItemDefinition = {
  domainKey: LessonEvaluationDomainKey;
  itemKey: LessonEvaluationItemKey;
  prompt: string;
};

export const LESSON_EVALUATION_ITEMS: LessonEvaluationItemDefinition[] = [
  // C1) Phoneme–Grapheme Correspondence (GPC)
  {
    domainKey: "gpc",
    itemKey: "C1a",
    prompt: 'Uses "Pure Sounds": Produces accurate sounds without adding vowel sounds (e.g., /m/ not "muh").',
  },
  {
    domainKey: "gpc",
    itemKey: "C1b",
    prompt: "Integrates Multi-Sensory Approaches: Uses the trained actions and letter form together.",
  },
  {
    domainKey: "gpc",
    itemKey: "C1c",
    prompt: "Correct Level Order: Following the strict Level 1–3 progression sequence.",
  },
  // C2) Blending (Reading) and Teaching Practices
  {
    domainKey: "blending",
    itemKey: "C2a",
    prompt: "Modeling Blending: Models sounding out and merging smoothly (not robotically).",
  },
  {
    domainKey: "blending",
    itemKey: "C2b",
    prompt: "Gradual Release (I Do, We Do, You Do): Teacher models, guides practice, then allows independent practice.",
  },
  {
    domainKey: "blending",
    itemKey: "C2c",
    prompt: "Use of Sound Buttons: Accurately uses dots (dots) for single sounds and lines (dashes) for digraphs/trigraphs.",
  },
  {
    domainKey: "blending",
    itemKey: "C2d",
    prompt: "Uses Made-Up (Pseudo) Words: Effectively uses made-up words to assess true decoding ability (Level 1 extended/Level 2+).",
  },
  {
    domainKey: "blending",
    itemKey: "C2e",
    prompt: 'Tricky Word Strategy: Identifies the "tricky part" rather than teaching the word solely as a whole unit.',
  },
  {
    domainKey: "blending",
    itemKey: "C2f",
    prompt: "Error Correction: Guides learners to self-correct (re-blending/re-segmenting) rather than giving the answer.",
  },
  // D) Learner Engagement & Assessment
  {
    domainKey: "engagement",
    itemKey: "D1",
    prompt: "Oral Repetition: Learners are actively saying the sounds, songs, and blending aloud.",
  },
  {
    domainKey: "engagement",
    itemKey: "D2",
    prompt: "Partner Practice Routine: Learners are successfully using the trained Speaker/Checker roles.",
  },
  {
    domainKey: "engagement",
    itemKey: "D3",
    prompt: "Continuous Assessment: Teacher circulates, listens for pure sounds, and provides immediate feedback.",
  },
  {
    domainKey: "engagement",
    itemKey: "D4",
    prompt: "Differentiation: Teacher provides simplified or advanced work based on learner needs.",
  },
];

export const LESSON_EVALUATION_ITEM_LOOKUP = new Map(
  LESSON_EVALUATION_ITEMS.map((item) => [item.itemKey, item]),
);

export const LESSON_EVALUATION_DOMAIN_KEYS = [
  "gpc",
  "blending",
  "engagement",
] as const;

export const LESSON_EVALUATION_ITEM_KEYS = LESSON_EVALUATION_ITEMS.map(
  (item) => item.itemKey,
) as readonly LessonEvaluationItemKey[];

/* ─── Overall Post-Observation Rating (Section E) ─────────── */

export type PostObservationRating =
  | "implemented_with_fidelity"
  | "partial_implementation"
  | "low_implementation";

export const POST_OBSERVATION_RATING_LABELS: Record<PostObservationRating, string> = {
  implemented_with_fidelity: "Implemented with Fidelity",
  partial_implementation: "Partial Implementation",
  low_implementation: "Low Implementation",
};

export const POST_OBSERVATION_RATING_DESCRIPTIONS: Record<PostObservationRating, string> = {
  implemented_with_fidelity:
    "Teaching largely reflects what they were trained on.",
  partial_implementation:
    "Trained strategies are present but inconsistent or contain inaccuracies.",
  low_implementation:
    "Major trained strategies (pure sounds, lesson structure) are missing or incorrect.",
};

/* ─── Helpers ─────────────────────────────────────────────── */

export function scoreLabel(score: number): LessonEvaluationOverallLevel {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) {
    return "Needs Support";
  }
  if (numeric >= 3.5) {
    return "Exemplary";
  }
  if (numeric >= 2.75) {
    return "Good";
  }
  if (numeric >= 2) {
    return "Developing";
  }
  return "Needs Support";
}

