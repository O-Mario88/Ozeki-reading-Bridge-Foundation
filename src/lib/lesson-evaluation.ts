export const LESSON_EVALUATION_SCORE_LABELS = {
  1: "Needs Support",
  2: "Developing",
  3: "Good",
  4: "Strong",
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

export type LessonEvaluationDomainKey =
  | "setup"
  | "new_sound"
  | "decoding"
  | "reading_practice"
  | "tricky_words"
  | "check_next";

export type LessonEvaluationItemKey =
  | "A1"
  | "A2"
  | "A3"
  | "B4"
  | "B5"
  | "B6"
  | "B7"
  | "B8"
  | "C9"
  | "C10"
  | "C11"
  | "C12"
  | "D13"
  | "D14"
  | "D15"
  | "D16"
  | "E17"
  | "E18"
  | "F19"
  | "F20"
  | "F21";

export type LessonEvaluationGrade = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7";

export type LessonEvaluationOverallLevel = "Strong" | "Good" | "Developing" | "Needs Support";

export const LESSON_EVALUATION_DOMAIN_LABELS: Record<LessonEvaluationDomainKey, string> = {
  setup: "A) Setup & Review",
  new_sound: "B) New Sound/Skill",
  decoding: "C) Decoding & Phonemic Skills",
  reading_practice: "D) Reading Practice & Fluency",
  tricky_words: "E) Tricky Words",
  check_next: "F) Check for Understanding & Next Steps",
};

export type LessonEvaluationItemDefinition = {
  domainKey: LessonEvaluationDomainKey;
  itemKey: LessonEvaluationItemKey;
  prompt: string;
};

export const LESSON_EVALUATION_ITEMS: LessonEvaluationItemDefinition[] = [
  {
    domainKey: "setup",
    itemKey: "A1",
    prompt: "Lesson routine starts on time with a clear review of prior sounds/skills.",
  },
  {
    domainKey: "setup",
    itemKey: "A2",
    prompt: "Teacher has required lesson resources prepared and organized.",
  },
  {
    domainKey: "setup",
    itemKey: "A3",
    prompt: "Learners are engaged quickly and understand the lesson objective.",
  },
  {
    domainKey: "new_sound",
    itemKey: "B4",
    prompt: "Teacher models the new sound/skill accurately and clearly.",
  },
  {
    domainKey: "new_sound",
    itemKey: "B5",
    prompt: "Teacher checks articulation/formation and corrects errors promptly.",
  },
  {
    domainKey: "new_sound",
    itemKey: "B6",
    prompt: "Learners practice the new sound/skill through guided repetition.",
  },
  {
    domainKey: "new_sound",
    itemKey: "B7",
    prompt: "Examples used are appropriate to learner level and prior knowledge.",
  },
  {
    domainKey: "new_sound",
    itemKey: "B8",
    prompt: "Teacher links the new sound/skill to previously learned content.",
  },
  {
    domainKey: "decoding",
    itemKey: "C9",
    prompt: "Learners blend sounds to decode words with teacher support.",
  },
  {
    domainKey: "decoding",
    itemKey: "C10",
    prompt: "Teacher prompts segmenting and blending during reading tasks.",
  },
  {
    domainKey: "decoding",
    itemKey: "C11",
    prompt: "Error correction during decoding is immediate and supportive.",
  },
  {
    domainKey: "decoding",
    itemKey: "C12",
    prompt: "Most learners attempt decoding independently before teacher reading.",
  },
  {
    domainKey: "reading_practice",
    itemKey: "D13",
    prompt: "Learners read in pairs/groups/whole class with adequate practice time.",
  },
  {
    domainKey: "reading_practice",
    itemKey: "D14",
    prompt: "Teacher monitors pacing and ensures broad learner participation.",
  },
  {
    domainKey: "reading_practice",
    itemKey: "D15",
    prompt: "Fluency practice includes repetition, phrasing, and accuracy checks.",
  },
  {
    domainKey: "reading_practice",
    itemKey: "D16",
    prompt: "Teacher uses materials/resources effectively to support reading practice.",
  },
  {
    domainKey: "tricky_words",
    itemKey: "E17",
    prompt: "Teacher explicitly teaches or revises tricky (non-decodable) words.",
  },
  {
    domainKey: "tricky_words",
    itemKey: "E18",
    prompt: "Learners recognize and use tricky words by sight in context.",
  },
  {
    domainKey: "check_next",
    itemKey: "F19",
    prompt: "Teacher checks understanding across the class before lesson close.",
  },
  {
    domainKey: "check_next",
    itemKey: "F20",
    prompt: "Lesson ends with clear feedback and next-step targets for learners.",
  },
  {
    domainKey: "check_next",
    itemKey: "F21",
    prompt: "Teacher and coach align on practical next coaching focus.",
  },
];

export const LESSON_EVALUATION_ITEM_LOOKUP = new Map(
  LESSON_EVALUATION_ITEMS.map((item) => [item.itemKey, item]),
);

export const LESSON_EVALUATION_DOMAIN_KEYS = [
  "setup",
  "new_sound",
  "decoding",
  "reading_practice",
  "tricky_words",
  "check_next",
] as const;

export const LESSON_EVALUATION_ITEM_KEYS = LESSON_EVALUATION_ITEMS.map(
  (item) => item.itemKey,
) as readonly LessonEvaluationItemKey[];

export function scoreLabel(score: number): LessonEvaluationOverallLevel {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) {
    return "Needs Support";
  }
  if (numeric >= 3.5) {
    return "Strong";
  }
  if (numeric >= 2.75) {
    return "Good";
  }
  if (numeric >= 2) {
    return "Developing";
  }
  return "Needs Support";
}
