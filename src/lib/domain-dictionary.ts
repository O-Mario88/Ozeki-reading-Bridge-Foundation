export type LearningDomainDictionaryKey =
  | "letter_names"
  | "letter_sounds"
  | "real_words"
  | "made_up_words"
  | "story_reading"
  | "comprehension";

export type LearningDomainDictionaryEntry = {
  label_short: string;
  label_full: string;
  description: string;
};

export const LEARNING_DOMAIN_DICTIONARY: Record<
  LearningDomainDictionaryKey,
  LearningDomainDictionaryEntry
> = {
  letter_names: {
    label_short: "Knowing Letter Names",
    label_full: "Knowing Letter Names",
    description:
      "Measures whether a learner can correctly name printed letters of the alphabet.",
  },
  letter_sounds: {
    label_short: "Knowing Letter Sounds",
    label_full: "Knowing Letter Sounds",
    description:
      "Measures whether a learner can correctly produce the sound each letter (or letter group) represents.",
  },
  real_words: {
    label_short: "Reading Real Words",
    label_full: "Reading Real Words",
    description:
      "Measures whether a learner can accurately read familiar, meaningful words in print.",
  },
  made_up_words: {
    label_short: "Reading Made Up Words",
    label_full: "Reading Made Up Words",
    description:
      "Measures whether a learner can decode unfamiliar ‘nonsense’ words using phonics (not memorization).",
  },
  story_reading: {
    label_short: "Story Reading",
    label_full: "Story Reading",
    description:
      "Measures how fluently and accurately a learner can read a short connected passage (often reported as correct words per minute).",
  },
  comprehension: {
    label_short: "Reading Comprehension",
    label_full: "Reading Comprehension",
    description:
      "Measures whether a learner understands what they read by answering questions about the passage.",
  },
};

export const PUBLIC_OUTCOME_TO_DOMAIN_KEY = {
  letterNames: "letter_names",
  letterSounds: "letter_sounds",
  realWords: "real_words",
  madeUpWords: "made_up_words",
  storyReading: "story_reading",
  comprehension: "comprehension",
} as const;

export const IMPACT_FACTPACK_OUTCOME_TO_DOMAIN_KEY = {
  letterIdentification: "letter_names",
  soundIdentification: "letter_sounds",
  decodableWords: "real_words",
  madeUpWords: "made_up_words",
  storyReading: "story_reading",
  readingComprehension: "comprehension",
} as const;

export function getLearningDomainLabel(
  key: LearningDomainDictionaryKey,
  mode: "short" | "full" = "full",
) {
  const descriptor = LEARNING_DOMAIN_DICTIONARY[key];
  return mode === "short" ? descriptor.label_short : descriptor.label_full;
}

export function getLearningDomainDescription(key: LearningDomainDictionaryKey) {
  return LEARNING_DOMAIN_DICTIONARY[key].description;
}
