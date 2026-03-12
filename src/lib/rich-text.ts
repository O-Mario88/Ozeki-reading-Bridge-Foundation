const INLINE_TAGS = new Set(["strong", "b", "em", "i", "u", "s", "sub", "sup", "code", "a", "br"]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractHref(attributesRaw: string) {
  const hrefMatch = attributesRaw.match(
    /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i,
  );
  if (!hrefMatch) {
    return null;
  }
  return hrefMatch[1] || hrefMatch[2] || hrefMatch[3] || null;
}

function sanitizeHref(value: string | null) {
  if (!value) {
    return null;
  }
  const decoded = decodeHtmlEntities(value).trim();
  if (!decoded) {
    return null;
  }
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(decoded)) {
    return decoded;
  }
  return null;
}

export function sanitizeInlineRichText(value: string | null | undefined) {
  const raw = (value ?? "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  const tagPattern = /<\/?[^>]+>/g;
  let output = "";
  let cursor = 0;

  for (const match of raw.matchAll(tagPattern)) {
    const index = match.index ?? 0;
    const rawTag = match[0];
    output += escapeHtml(raw.slice(cursor, index));
    cursor = index + rawTag.length;

    const parsed = rawTag.match(/^<\s*(\/)?\s*([a-zA-Z0-9]+)([^>]*)>/);
    if (!parsed) {
      continue;
    }

    const isClosing = parsed[1] === "/";
    const tagName = parsed[2].toLowerCase();
    const attributesRaw = parsed[3] || "";
    if (!INLINE_TAGS.has(tagName)) {
      continue;
    }

    if (isClosing) {
      if (tagName !== "br") {
        output += `</${tagName}>`;
      }
      continue;
    }

    if (tagName === "br") {
      output += "<br>";
      continue;
    }

    if (tagName === "a") {
      const href = sanitizeHref(extractHref(attributesRaw));
      if (!href) {
        output += "<a>";
      } else if (/^https?:\/\//i.test(href)) {
        output += `<a href="${escapeHtmlAttribute(href)}" target="_blank" rel="noopener noreferrer">`;
      } else {
        output += `<a href="${escapeHtmlAttribute(href)}">`;
      }
      continue;
    }

    output += `<${tagName}>`;
  }

  output += escapeHtml(raw.slice(cursor));
  return output
    .replace(/\r\n|\r|\n/g, "<br>")
    .replace(/<br\s*\/?>/gi, "<br>")
    .trim();
}

export function stripHtmlTags(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h1|h2|h3|h4|h5|h6|li|ul|ol|blockquote|figure|figcaption|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
