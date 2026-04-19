// Phonics Observation Form — constants, keys, and labels.
// All wording is taken verbatim from the Ozeki Reading Bridge Foundation
// Teacher Phonics & Reading Lesson Observation Form screenshots.

// ---------------------------------------------------------------------------
// Section B — Lesson Structure
// ---------------------------------------------------------------------------

export const LESSON_STRUCTURE_ITEMS = [
  {
    key: "revision",
    label: "1. Revision",
    description: "Quick review of known sounds/blending of words daily.",
  },
  {
    key: "teach_new_sound",
    label: "2. Teach New Sound",
    description: "Clear introduction of the new sound/phoneme.",
  },
  {
    key: "reading_activities",
    label: "3. Reading Activities",
    description: "Applying knowledge to decode words.",
  },
  {
    key: "teach_tricky_word",
    label: "4. Teach Tricky Word",
    description: "Introducing a high-frequency, non-decodable word.",
  },
  {
    key: "writing_activities",
    label: "5. Writing Activities",
    description: "Encoding practice via segmenting.",
  },
] as const;

export type LessonStructureKey = (typeof LESSON_STRUCTURE_ITEMS)[number]["key"];
export const LESSON_STRUCTURE_KEYS = LESSON_STRUCTURE_ITEMS.map((i) => i.key) as LessonStructureKey[];

// ---------------------------------------------------------------------------
// Section C & D — Scoring Key (applies to all rubric criteria)
// ---------------------------------------------------------------------------

export const SCORING_KEY = [
  { score: 4, label: "Exemplary", description: "Consistent application of trained method, fluent, highly effective." },
  { score: 3, label: "Good",      description: "Applied trained method correctly most of the time." },
  { score: 2, label: "Developing", description: "Attempted method but with inaccuracies or hesitation." },
  { score: 1, label: "Needs Support", description: "Method not applied or applied incorrectly (e.g., using letter names)." },
] as const;

export type ObservationScore = 1 | 2 | 3 | 4;

export function scoreLabel(score: ObservationScore): string {
  return SCORING_KEY.find((s) => s.score === score)?.label ?? String(score);
}

// ---------------------------------------------------------------------------
// Section C1 — Phoneme–Grapheme Correspondence (GPC)
// ---------------------------------------------------------------------------

export const GPC_CRITERIA = [
  {
    key: "pure_sounds",
    sectionKey: "c1_gpc",
    sectionLabel: "C1. Phoneme–Grapheme Correspondence (GPC)",
    label: 'Uses "Pure Sounds"',
    description: 'Produces accurate sounds without adding vowel sounds (e.g., /m/ not "muh").',
  },
  {
    key: "multi_sensory",
    sectionKey: "c1_gpc",
    sectionLabel: "C1. Phoneme–Grapheme Correspondence (GPC)",
    label: "Integrates Multi-Sensory Approaches",
    description: "Uses the trained actions and letter form together.",
  },
  {
    key: "level_order",
    sectionKey: "c1_gpc",
    sectionLabel: "C1. Phoneme–Grapheme Correspondence (GPC)",
    label: "Correct Level Order",
    description: "Following the strict Level 1–3 progression sequence.",
  },
] as const;

// ---------------------------------------------------------------------------
// Section C2 — Blending (Reading) and Teaching Practices
// ---------------------------------------------------------------------------

export const BLENDING_CRITERIA = [
  {
    key: "modeling_blending",
    sectionKey: "c2_blending",
    sectionLabel: "C2. Blending (Reading) and Teaching Practices",
    label: "Modeling Blending",
    description: "Models sounding out and merging smoothly (not robotically).",
  },
  {
    key: "gradual_release",
    sectionKey: "c2_blending",
    sectionLabel: "C2. Blending (Reading) and Teaching Practices",
    label: "Gradual Release (I Do, We Do, You Do)",
    description: "Teacher models, guides practice, then allows independent practice.",
  },
  {
    key: "sound_buttons",
    sectionKey: "c2_blending",
    sectionLabel: "C2. Blending (Reading) and Teaching Practices",
    label: "Use of Sound Buttons",
    description: "Accurately uses dots (dots) for single sounds and lines (dashes) for digraphs/trigraphs.",
  },
  {
    key: "pseudo_words",
    sectionKey: "c2_blending",
    sectionLabel: "C2. Blending (Reading) and Teaching Practices",
    label: "Uses Made-Up (Pseudo) Words",
    description: "Effectively uses made-up words to assess true decoding ability (Level 1 extended/Level 2+).",
  },
  {
    key: "tricky_word_strategy",
    sectionKey: "c2_blending",
    sectionLabel: "C2. Blending (Reading) and Teaching Practices",
    label: "Tricky Word Strategy",
    description: 'Identifies the "tricky part" rather than teaching the word solely as a whole unit.',
  },
  {
    key: "error_correction",
    sectionKey: "c2_blending",
    sectionLabel: "C2. Blending (Reading) and Teaching Practices",
    label: "Error Correction",
    description: "Guides learners to self-correct (re-blending/re-segmenting) rather than giving the answer.",
  },
] as const;

// ---------------------------------------------------------------------------
// Section D — Learner Engagement & Assessment
// ---------------------------------------------------------------------------

export const ENGAGEMENT_CRITERIA = [
  {
    key: "oral_repetition",
    sectionKey: "d_engagement",
    sectionLabel: "D. Learner Engagement & Assessment",
    label: "Oral Repetition",
    description: "Learners are actively saying the sounds, songs, and blending aloud.",
  },
  {
    key: "partner_practice",
    sectionKey: "d_engagement",
    sectionLabel: "D. Learner Engagement & Assessment",
    label: "Partner Practice Routine",
    description: "Learners are successfully using the trained Speaker/Checker roles.",
  },
  {
    key: "continuous_assessment",
    sectionKey: "d_engagement",
    sectionLabel: "D. Learner Engagement & Assessment",
    label: "Continuous Assessment",
    description: "Teacher circulates, listens for pure sounds, and provides immediate feedback.",
  },
  {
    key: "differentiation",
    sectionKey: "d_engagement",
    sectionLabel: "D. Learner Engagement & Assessment",
    label: "Differentiation",
    description: "Teacher provides simplified or advanced work based on learner needs.",
  },
] as const;

export const ALL_SCORED_CRITERIA = [...GPC_CRITERIA, ...BLENDING_CRITERIA, ...ENGAGEMENT_CRITERIA];
export type ScoredCriteriaKey = (typeof ALL_SCORED_CRITERIA)[number]["key"];
export const SCORED_CRITERIA_KEYS = ALL_SCORED_CRITERIA.map((c) => c.key) as ScoredCriteriaKey[];

// ---------------------------------------------------------------------------
// Section E4 — Overall Post-Observation Rating
// ---------------------------------------------------------------------------

export const POST_OBSERVATION_RATINGS = [
  {
    key: "fidelity",
    label: "Implemented with Fidelity",
    description: "Teaching largely reflects the What they were trained on.",
  },
  {
    key: "partial",
    label: "Partial Implementation",
    description: "Trained strategies are present but inconsistent or contain inaccuracies.",
  },
  {
    key: "low",
    label: "Low Implementation",
    description: "Major trained strategies (pure sounds, lesson structure) are missing or incorrect.",
  },
] as const;

export type PostObservationRating = (typeof POST_OBSERVATION_RATINGS)[number]["key"];

export function postObservationRatingLabel(key: PostObservationRating): string {
  return POST_OBSERVATION_RATINGS.find((r) => r.key === key)?.label ?? key;
}

// ---------------------------------------------------------------------------
// Composite average score helpers
// ---------------------------------------------------------------------------

export function computeSectionAverage(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s !== null && s >= 1 && s <= 4);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}
