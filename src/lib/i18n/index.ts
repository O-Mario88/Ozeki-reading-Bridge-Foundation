import { cookies } from "next/headers";
import enMessages from "../../../messages/en.json";
import lgMessages from "../../../messages/lg.json";

export type Locale = "en" | "lg";

export const SUPPORTED_LOCALES: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "lg", label: "Luganda", nativeLabel: "Oluganda" },
];

export const LOCALE_COOKIE = "orbf_locale";

const messagesByLocale: Record<Locale, Record<string, Record<string, string>>> = {
  en: enMessages as Record<string, Record<string, string>>,
  lg: lgMessages as Record<string, Record<string, string>>,
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "lg";
}

export async function getCurrentLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(LOCALE_COOKIE)?.value;
    return isLocale(value) ? value : "en";
  } catch {
    return "en";
  }
}

/**
 * t("section.key") — returns the translated string for the current locale,
 * or falls back to English, or to the key itself.
 */
export function tFor(locale: Locale, path: string): string {
  const [section, key] = path.split(".");
  if (!section || !key) return path;
  const msgs = messagesByLocale[locale]?.[section];
  if (msgs && key in msgs) return msgs[key]!;
  const fallback = messagesByLocale.en?.[section]?.[key];
  return fallback ?? path;
}

export async function t(path: string): Promise<string> {
  const locale = await getCurrentLocale();
  return tFor(locale, path);
}

/** Synchronous version for client components — call once at top of page from
 *  server, then pass the messages map to a client component. */
export function getMessagesForLocale(locale: Locale) {
  return messagesByLocale[locale] ?? messagesByLocale.en;
}
