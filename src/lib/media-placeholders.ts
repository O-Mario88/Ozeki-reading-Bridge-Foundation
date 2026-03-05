const palette = [
  ["#0E4B5A", "#184E77"],
  ["#992E00", "#CC3D00"],
  ["#1E3A8A", "#1D4ED8"],
  ["#4A044E", "#6B21A8"],
  ["#0F172A", "#334155"],
];

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

export function buildMediaPlaceholderDataUri(
  seed: string,
  title: string,
  subtitle?: string,
) {
  const safeSeed = seed.trim() || "media";
  const index = hashSeed(safeSeed) % palette.length;
  const [left, right] = palette[index];
  const safeTitle = escapeXml(title.trim() || "Ozeki Reading Bridge Foundation");
  const safeSubtitle = escapeXml(subtitle?.trim() || "Media preview");
  const patternOffset = hashSeed(`${safeSeed}-pattern`) % 32;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" role="img" aria-label="${safeTitle}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${left}" />
      <stop offset="100%" stop-color="${right}" />
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="translate(${patternOffset} 0)">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="960" height="540" fill="url(#bg)"/>
  <rect width="960" height="540" fill="url(#grid)"/>
  <circle cx="780" cy="90" r="80" fill="rgba(255,255,255,0.12)"/>
  <circle cx="120" cy="430" r="64" fill="rgba(255,255,255,0.12)"/>
  <text x="64" y="274" fill="rgba(255,255,255,0.96)" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="42" font-weight="600">${safeTitle}</text>
  <text x="64" y="320" fill="rgba(255,255,255,0.86)" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="25">${safeSubtitle}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildVideoThumbnailFallback(seed: string, label?: string) {
  return buildMediaPlaceholderDataUri(seed, "Video", label || "Preview unavailable");
}
