import type { ReadingLevelCycleDist, ReadingLevelsBlock } from "@/lib/types";

export const READING_LEVEL_PERFORMANCE_LEVELS = [
  "Developing",
  "Transitional",
  "Fluent",
] as const;

const PREFERRED_CYCLE_ORDER: ReadonlyArray<ReadingLevelCycleDist["cycle"]> = [
  "endline",
  "latest",
  "progress",
  "baseline",
];

export type ReadingLevelPerformanceSummary = {
  cycle: ReadingLevelCycleDist["cycle"];
  sampleSize: number;
  performancePercent: number;
  levelLabels: readonly string[];
};

export function pickPreferredReadingDistribution(
  readingLevels?: ReadingLevelsBlock | null,
): ReadingLevelCycleDist | null {
  if (!readingLevels || readingLevels.distribution.length === 0) {
    return null;
  }

  for (const cycle of PREFERRED_CYCLE_ORDER) {
    const match = readingLevels.distribution.find((item) => item.cycle === cycle);
    if (match) {
      return match;
    }
  }

  return readingLevels.distribution[0] ?? null;
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function getReadingLevelPerformanceSummary(
  readingLevels?: ReadingLevelsBlock | null,
): ReadingLevelPerformanceSummary | null {
  const selected = pickPreferredReadingDistribution(readingLevels);
  if (!selected || !Number.isFinite(selected.n) || selected.n <= 0) {
    return null;
  }

  let percentTotal = 0;
  for (const level of READING_LEVEL_PERFORMANCE_LEVELS) {
    const percent = Number(selected.percents[level] ?? 0);
    if (Number.isFinite(percent)) {
      percentTotal += percent;
    }
  }

  // Fallback when percents are absent: compute from counts.
  if (percentTotal <= 0) {
    let countTotal = 0;
    for (const level of READING_LEVEL_PERFORMANCE_LEVELS) {
      const count = Number(selected.counts[level] ?? 0);
      if (Number.isFinite(count)) {
        countTotal += count;
      }
    }
    percentTotal = (countTotal / selected.n) * 100;
  }

  return {
    cycle: selected.cycle,
    sampleSize: selected.n,
    performancePercent: roundToOneDecimal(percentTotal),
    levelLabels: READING_LEVEL_PERFORMANCE_LEVELS,
  };
}

