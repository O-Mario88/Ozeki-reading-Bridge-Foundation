const palette = [
  ["#0E4B5A", "#184E77"],
  ["#A34B0A", "#C35D0E"],
  ["#1E3A8A", "#1D4ED8"],
  ["#4A044E", "#6B21A8"],
  ["#0F172A", "#334155"],
];

export type MediaPlaceholderVariant = "default" | "hero" | "card" | "thumb";

type MediaPlaceholderOptions = {
  variant?: MediaPlaceholderVariant;
};

const variantSettings: Record<MediaPlaceholderVariant, {
  width: number;
  height: number;
  maxCharsPerLine: number;
  maxTitleLines: number;
  subtitleMaxChars: number;
  titleFontLarge: number;
  titleFontSmall: number;
  showTitle: boolean;
  showSubtitle: boolean;
}> = {
  default: {
    width: 960,
    height: 540,
    maxCharsPerLine: 24,
    maxTitleLines: 2,
    subtitleMaxChars: 30,
    titleFontLarge: 38,
    titleFontSmall: 33,
    showTitle: true,
    showSubtitle: true,
  },
  hero: {
    width: 1290,
    height: 600,
    maxCharsPerLine: 32,
    maxTitleLines: 2,
    subtitleMaxChars: 38,
    titleFontLarge: 46,
    titleFontSmall: 40,
    showTitle: true,
    showSubtitle: true,
  },
  card: {
    width: 1020,
    height: 600,
    maxCharsPerLine: 22,
    maxTitleLines: 2,
    subtitleMaxChars: 24,
    titleFontLarge: 41,
    titleFontSmall: 35,
    showTitle: true,
    showSubtitle: true,
  },
  thumb: {
    width: 600,
    height: 600,
    maxCharsPerLine: 16,
    maxTitleLines: 2,
    subtitleMaxChars: 18,
    titleFontLarge: 34,
    titleFontSmall: 30,
    showTitle: false,
    showSubtitle: false,
  },
};

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function compactLabel(value: string, max = 42) {
  const normalized = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(8, max - 3)).trimEnd()}...`;
}

function wrapLabel(value: string, maxCharsPerLine: number, maxLines: number) {
  const normalized = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

  if (!normalized) {
    return ["Media preview"];
  }

  const lines: string[] = [];
  let remaining = normalized;

  for (let lineIndex = 0; lineIndex < maxLines && remaining; lineIndex += 1) {
    if (lineIndex === maxLines - 1) {
      lines.push(compactLabel(remaining, maxCharsPerLine));
      break;
    }

    if (remaining.length <= maxCharsPerLine) {
      lines.push(remaining);
      remaining = "";
      break;
    }

    const probe = remaining.slice(0, maxCharsPerLine + 1);
    let breakPoint = probe.lastIndexOf(" ");
    if (breakPoint < Math.floor(maxCharsPerLine * 0.55)) {
      breakPoint = maxCharsPerLine;
    }

    lines.push(remaining.slice(0, breakPoint).trimEnd());
    remaining = remaining.slice(breakPoint).trimStart();
  }

  return lines.length > 0 ? lines : ["Media preview"];
}

export function buildMediaPlaceholderDataUri(
  seed: string,
  title: string,
  subtitle?: string,
  options?: MediaPlaceholderOptions,
) {
  const variant = options?.variant ?? "default";
  const settings = variantSettings[variant];
  const {
    width,
    height,
    maxCharsPerLine,
    maxTitleLines,
    subtitleMaxChars,
    titleFontLarge,
    titleFontSmall,
    showTitle,
    showSubtitle,
  } = settings;
  const safeSeed = seed.trim() || "media";
  const index = hashSeed(safeSeed) % palette.length;
  const [left, right] = palette[index];
  const normalizedTitle = title.trim() || "Ozeki Reading Bridge Foundation";
  const subtitleValue = subtitle?.trim() || "Media preview";
  const titleLines = showTitle
    ? wrapLabel(normalizedTitle, maxCharsPerLine, maxTitleLines)
      .map((line) => escapeXml(compactLabel(line, maxCharsPerLine)))
    : [];
  const subtitleLine = escapeXml(compactLabel(subtitleValue, subtitleMaxChars));
  const titleAria = escapeXml(compactLabel(normalizedTitle, 72));
  const ariaLabel = showTitle
    ? titleAria
    : escapeXml(compactLabel(subtitleValue || normalizedTitle, 72));

  const gridSize = Math.max(32, Math.round(width / 20));
  const patternOffset = hashSeed(`${safeSeed}-${variant}-pattern`) % gridSize;
  const longestTitleLine = titleLines.length > 0 ? Math.max(...titleLines.map((line) => line.length)) : 0;
  const titleFontSize = longestTitleLine > Math.floor(maxCharsPerLine * 0.85) ? titleFontSmall : titleFontLarge;
  const titleLineGap = titleFontSize + Math.round(height * 0.017);
  const titleY = titleLines.length > 1 ? Math.round(height * 0.452) : Math.round(height * 0.496);
  const subtitleY = titleY + (titleLines.length - 1) * titleLineGap + Math.round(height * 0.1);
  const sidePadding = Math.round(width * 0.067);
  const textClipTop = Math.round(height * 0.318);
  const textClipHeight = Math.round(height * 0.337);
  const bigCircleRadius = Math.round(height * 0.148);
  const smallCircleRadius = Math.round(height * 0.118);
  const titleMarkup = titleLines
    .map((line, index) => `<tspan x="${sidePadding}" dy="${index === 0 ? 0 : titleLineGap}">${line}</tspan>`)
    .join("");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${ariaLabel}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${left}" />
      <stop offset="100%" stop-color="${right}" />
    </linearGradient>
    <pattern id="grid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse" patternTransform="translate(${patternOffset} 0)">
      <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1"/>
    </pattern>
    <clipPath id="textClip">
      <rect x="${sidePadding}" y="${textClipTop}" width="${width - sidePadding * 2}" height="${textClipHeight}" />
    </clipPath>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#grid)"/>
  <circle cx="${Math.round(width * 0.81)}" cy="${Math.round(height * 0.17)}" r="${bigCircleRadius}" fill="rgba(255,255,255,0.12)"/>
  <circle cx="${Math.round(width * 0.125)}" cy="${Math.round(height * 0.8)}" r="${smallCircleRadius}" fill="rgba(255,255,255,0.12)"/>
  ${showTitle ? `<g clip-path="url(#textClip)">
    <text x="${sidePadding}" y="${titleY}" fill="rgba(255,255,255,0.96)" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="${titleFontSize}" font-weight="600">${titleMarkup}</text>
  </g>` : ""}
  ${showSubtitle ? `<text x="${sidePadding}" y="${subtitleY}" fill="rgba(255,255,255,0.86)" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="${Math.max(18, Math.round(height * 0.041))}">${subtitleLine}</text>` : ""}
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildVideoThumbnailFallback(seed: string, label?: string) {
  return buildMediaPlaceholderDataUri(seed, "Video", label || "Preview unavailable");
}
