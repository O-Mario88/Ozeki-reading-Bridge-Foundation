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
    label_short: "Phonemic Awareness",
    label_full: "Phonemic Awareness",
    description:
      "The ability to hear and identify individual sounds (phonemes) in spoken words.",
  },
  letter_sounds: {
    label_short: "Grapheme-Phoneme Correspondence",
    label_full: "Grapheme-Phoneme Correspondence",
    description:
      'Matching sounds to their written letters (e.g., knowing "b" makes the /b/ sound).',
  },
  real_words: {
    label_short: "Blending & Decoding",
    label_full: "Blending & Decoding",
    description:
      'Joining sounds together to read a word (e.g., /c/-/a/-/t/ = "cat").',
  },
  made_up_words: {
    label_short: "Word Recognition & Fluency",
    label_full: "Word Recognition & Fluency",
    description:
      "Transitioning from sounding out to recognizing words instantly. This includes sight words that do not follow standard rules.",
  },
  story_reading: {
    label_short: "Sentence & Paragraph Construction",
    label_full: "Sentence & Paragraph Construction",
    description:
      "Understanding how words work together in phrases and sentences, including basic punctuation.",
  },
  comprehension: {
    label_short: "Comprehension",
    label_full: "Comprehension",
    description:
      "The ultimate goal—reading a story and demonstrating an understanding of the plot, characters, or facts.",
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
