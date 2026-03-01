/**
 * Reading Assessment Utilities
 *
 * Provides domain scoring and automatic reading-level classification
 * for learner assessments under the NLIS/Ozeki reading programme.
 *
 * 6 Domains (each graded 0–10):
 *   1. Letter Names
 *   2. Letter Sounds
 *   3. Real Words
 *   4. Made Up Words
 *   5. Story Reading
 *   6. Comprehension
 *
 * Reading Levels:
 *   Non-Reader  → composite avg 0.0 – 1.9
 *   Emerging    → composite avg 2.0 – 3.9
 *   Developing  → composite avg 4.0 – 5.9
 *   Transitional→ composite avg 6.0 – 7.9
 *   Fluent      → composite avg 8.0 – 10.0
 */

import type { AssessmentRecordInput } from "@/lib/types";

/* ─── Types ───────────────────────────────────────── */

export type ReadingLevel =
    | "Non-Reader"
    | "Emerging"
    | "Developing"
    | "Transitional"
    | "Fluent";

export const READING_LEVELS: ReadingLevel[] = [
    "Non-Reader",
    "Emerging",
    "Developing",
    "Transitional",
    "Fluent",
];

export const READING_DOMAIN_LABELS = [
    "Letter Names",
    "Letter Sounds",
    "Real Words",
    "Made Up Words",
    "Story Reading",
    "Comprehension",
] as const;

export type ReadingDomainLabel = (typeof READING_DOMAIN_LABELS)[number];

export interface ReadingDomainScores {
    letterNames: number;
    letterSounds: number;
    realWords: number;
    madeUpWords: number;
    storyReading: number;
    comprehension: number;
}

export type ReadingDomainKey = keyof ReadingDomainScores;

export const READING_DOMAIN_KEYS: ReadingDomainKey[] = [
    "letterNames",
    "letterSounds",
    "realWords",
    "madeUpWords",
    "storyReading",
    "comprehension",
];

/** Mapping from domain key to its human-readable label. */
export const DOMAIN_KEY_TO_LABEL: Record<ReadingDomainKey, ReadingDomainLabel> = {
    letterNames: "Letter Names",
    letterSounds: "Letter Sounds",
    realWords: "Real Words",
    madeUpWords: "Made Up Words",
    storyReading: "Story Reading",
    comprehension: "Comprehension",
};

/* ─── Core Functions ──────────────────────────────── */

/**
 * Clamp a number to range [0, 10].
 */
function clampScore(value: number): number {
    return Math.max(0, Math.min(10, value));
}

/**
 * Compute the composite average from 6 domain scores.
 */
export function compositeAverage(scores: ReadingDomainScores): number {
    const sum =
        scores.letterNames +
        scores.letterSounds +
        scores.realWords +
        scores.madeUpWords +
        scores.storyReading +
        scores.comprehension;
    return sum / 6;
}

/**
 * Determine the reading level from a composite average (0–10 scale).
 *
 * | Range      | Level         |
 * |------------|---------------|
 * | 0.0 – 1.9  | Non-Reader    |
 * | 2.0 – 3.9  | Emerging      |
 * | 4.0 – 5.9  | Developing    |
 * | 6.0 – 7.9  | Transitional  |
 * | 8.0 – 10.0 | Fluent        |
 */
export function computeReadingLevel(scores: ReadingDomainScores): ReadingLevel {
    const avg = compositeAverage(scores);
    if (avg < 2) return "Non-Reader";
    if (avg < 4) return "Emerging";
    if (avg < 6) return "Developing";
    if (avg < 8) return "Transitional";
    return "Fluent";
}

/**
 * Classify a single composite average into a reading level.
 */
export function readingLevelFromAverage(avg: number): ReadingLevel {
    if (avg < 2) return "Non-Reader";
    if (avg < 4) return "Emerging";
    if (avg < 6) return "Developing";
    if (avg < 8) return "Transitional";
    return "Fluent";
}

/**
 * Extract ReadingDomainScores from an AssessmentRecordInput.
 *
 * Maps the existing assessment fields to the 6-domain structure:
 *   letterIdentificationScore  → letterNames
 *   soundIdentificationScore   → letterSounds
 *   decodableWordsScore        → realWords     (real words / decodable)
 *   madeUpWordsScore           → madeUpWords
 *   storyReadingScore          → storyReading
 *   readingComprehensionScore  → comprehension
 *
 * Returns null if no domain scores are present.
 */
export function extractReadingDomainScores(
    record: AssessmentRecordInput,
): ReadingDomainScores | null {
    // Check if at least one reading domain field has data
    const hasAnyScore =
        record.letterIdentificationScore !== null ||
        record.soundIdentificationScore !== null ||
        record.decodableWordsScore !== null ||
        record.madeUpWordsScore !== null ||
        record.storyReadingScore !== null ||
        record.readingComprehensionScore !== null;

    if (!hasAnyScore) return null;

    return {
        letterNames: clampScore(record.letterIdentificationScore ?? 0),
        letterSounds: clampScore(record.soundIdentificationScore ?? 0),
        realWords: clampScore(record.decodableWordsScore ?? 0),
        madeUpWords: clampScore(record.madeUpWordsScore ?? 0),
        storyReading: clampScore(record.storyReadingScore ?? 0),
        comprehension: clampScore(record.readingComprehensionScore ?? 0),
    };
}

/* ─── UI Helpers ──────────────────────────────────── */

/** Returns a CSS-safe color for each reading level. */
export function getReadingLevelColor(level: ReadingLevel): string {
    switch (level) {
        case "Non-Reader":
            return "#d32f2f"; // red
        case "Emerging":
            return "#f57c00"; // orange
        case "Developing":
            return "#fbc02d"; // amber
        case "Transitional":
            return "#388e3c"; // green
        case "Fluent":
            return "#1565c0"; // blue
    }
}

/** Returns a background tint (low opacity) for use in badges/cards. */
export function getReadingLevelBgColor(level: ReadingLevel): string {
    switch (level) {
        case "Non-Reader":
            return "rgba(211, 47, 47, 0.12)";
        case "Emerging":
            return "rgba(245, 124, 0, 0.12)";
        case "Developing":
            return "rgba(251, 192, 45, 0.12)";
        case "Transitional":
            return "rgba(56, 142, 60, 0.12)";
        case "Fluent":
            return "rgba(21, 101, 192, 0.12)";
    }
}

/** Numeric index for sorting reading levels (0 = lowest, 4 = highest). */
export function readingLevelOrdinal(level: ReadingLevel): number {
    return READING_LEVELS.indexOf(level);
}

/**
 * Aggregate multiple ReadingDomainScores into an average.
 * Used for computing class/school/district-level domain averages.
 */
export function averageReadingDomainScores(
    scoresList: ReadingDomainScores[],
): ReadingDomainScores {
    if (scoresList.length === 0) {
        return {
            letterNames: 0,
            letterSounds: 0,
            realWords: 0,
            madeUpWords: 0,
            storyReading: 0,
            comprehension: 0,
        };
    }

    const sum = scoresList.reduce(
        (acc, s) => ({
            letterNames: acc.letterNames + s.letterNames,
            letterSounds: acc.letterSounds + s.letterSounds,
            realWords: acc.realWords + s.realWords,
            madeUpWords: acc.madeUpWords + s.madeUpWords,
            storyReading: acc.storyReading + s.storyReading,
            comprehension: acc.comprehension + s.comprehension,
        }),
        {
            letterNames: 0,
            letterSounds: 0,
            realWords: 0,
            madeUpWords: 0,
            storyReading: 0,
            comprehension: 0,
        },
    );

    const n = scoresList.length;
    return {
        letterNames: sum.letterNames / n,
        letterSounds: sum.letterSounds / n,
        realWords: sum.realWords / n,
        madeUpWords: sum.madeUpWords / n,
        storyReading: sum.storyReading / n,
        comprehension: sum.comprehension / n,
    };
}

/**
 * Compute a distribution of reading levels across a set of assessments.
 * Returns a record with each level mapped to its count.
 */
export function readingLevelDistribution(
    scoresList: ReadingDomainScores[],
): Record<ReadingLevel, number> {
    const dist: Record<ReadingLevel, number> = {
        "Non-Reader": 0,
        Emerging: 0,
        Developing: 0,
        Transitional: 0,
        Fluent: 0,
    };

    for (const scores of scoresList) {
        const level = computeReadingLevel(scores);
        dist[level] += 1;
    }

    return dist;
}

/* ─── Reading Level Version & Extended Aggregation ─── */

/** Deterministic rule version for reading-level classification. */
export const READING_LEVEL_DEFINITION_VERSION = "RLv1.0";

/** Level metadata used in report payloads. */
export const READING_LEVEL_METADATA = READING_LEVELS.map((label, idx) => ({
    level: idx,
    label,
}));

/**
 * Compute reading-level distribution with both counts and percents.
 * Returns { counts, percents, n } where percents are rounded to 1 decimal.
 */
export function readingLevelDistributionWithPercents(
    scoresList: ReadingDomainScores[],
): { counts: Record<string, number>; percents: Record<string, number>; n: number } {
    const counts: Record<string, number> = {};
    const percents: Record<string, number> = {};
    const n = scoresList.length;

    for (const label of READING_LEVELS) {
        counts[label] = 0;
        percents[label] = 0;
    }

    for (const scores of scoresList) {
        const level = computeReadingLevel(scores);
        counts[level] += 1;
    }

    if (n > 0) {
        for (const label of READING_LEVELS) {
            percents[label] = Math.round((counts[label] / n) * 1000) / 10;
        }
    }

    return { counts, percents, n };
}

/**
 * Compute reading-level movement between baseline and endline for matched learners.
 *
 * @param baselineMap  Map of learnerUid → ReadingDomainScores at baseline
 * @param endlineMap   Map of learnerUid → ReadingDomainScores at endline
 * @returns Movement summary with upgrade/downgrade/stable percents and top transitions
 */
export function computeReadingLevelMovement(
    baselineMap: Map<string, ReadingDomainScores>,
    endlineMap: Map<string, ReadingDomainScores>,
): {
    n_matched: number;
    moved_up_1plus_count: number;
    moved_up_1plus_percent: number;
    stayed_same_percent: number;
    moved_down_percent: number;
    top_transitions: Array<{ from: string; to: string; count: number; percent: number }>;
} | null {
    // Find matched learners (present in both baseline and endline)
    const matchedUids: string[] = [];
    for (const uid of baselineMap.keys()) {
        if (endlineMap.has(uid)) {
            matchedUids.push(uid);
        }
    }

    if (matchedUids.length === 0) {
        return null;
    }

    let movedUp = 0;
    let stayedSame = 0;
    let movedDown = 0;
    const transitionCounts = new Map<string, number>();

    for (const uid of matchedUids) {
        const baselineScores = baselineMap.get(uid)!;
        const endlineScores = endlineMap.get(uid)!;
        const baselineLevel = computeReadingLevel(baselineScores);
        const endlineLevel = computeReadingLevel(endlineScores);
        const baselineOrd = readingLevelOrdinal(baselineLevel);
        const endlineOrd = readingLevelOrdinal(endlineLevel);

        if (endlineOrd > baselineOrd) {
            movedUp += 1;
        } else if (endlineOrd === baselineOrd) {
            stayedSame += 1;
        } else {
            movedDown += 1;
        }

        const key = `${baselineLevel}→${endlineLevel}`;
        transitionCounts.set(key, (transitionCounts.get(key) ?? 0) + 1);
    }

    const n = matchedUids.length;
    const sortedTransitions = [...transitionCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key, count]) => {
            const [from, to] = key.split("→");
            return {
                from,
                to,
                count,
                percent: Math.round((count / n) * 1000) / 10,
            };
        });

    return {
        n_matched: n,
        moved_up_1plus_count: movedUp,
        moved_up_1plus_percent: Math.round((movedUp / n) * 1000) / 10,
        stayed_same_percent: Math.round((stayedSame / n) * 1000) / 10,
        moved_down_percent: Math.round((movedDown / n) * 1000) / 10,
        top_transitions: sortedTransitions,
    };
}
