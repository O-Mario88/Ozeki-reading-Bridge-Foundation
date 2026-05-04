import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  type ExternalUserRow,
  findExternalUserByRefCodePostgres,
} from "@/lib/server/postgres/repositories/external-users";
import { findExternalUserBySessionTokenPostgres } from "@/lib/server/postgres/repositories/external-auth";

export const EXTERNAL_SESSION_COOKIE = "orbf_external_session";
export const EXTERNAL_SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export function buildExternalSessionCookie(token: string) {
  return {
    name: EXTERNAL_SESSION_COOKIE,
    value: token,
    maxAge: EXTERNAL_SESSION_MAX_AGE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function buildClearExternalSessionCookie() {
  return {
    name: EXTERNAL_SESSION_COOKIE,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export const getCurrentExternalUser = cache(async (): Promise<ExternalUserRow | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(EXTERNAL_SESSION_COOKIE)?.value;
    if (!token) return null;
    return await findExternalUserBySessionTokenPostgres(token);
  } catch {
    return null;
  }
});

export type ExternalRoleSlug =
  | "donors"
  | "parents"
  | "teachers"
  | "partners"
  | "government";

const ROLE_BY_SLUG: Record<ExternalRoleSlug, ExternalUserRow["role"]> = {
  donors: "donor",
  parents: "parent",
  teachers: "teacher",
  partners: "partner",
  government: "district_officer",
};

export function externalRoleFromSlug(slug: string): ExternalUserRow["role"] | null {
  return (slug in ROLE_BY_SLUG ? ROLE_BY_SLUG[slug as ExternalRoleSlug] : null);
}

export function externalSlugFromRole(role: ExternalUserRow["role"]): ExternalRoleSlug {
  for (const [slug, mapped] of Object.entries(ROLE_BY_SLUG)) {
    if (mapped === role) return slug as ExternalRoleSlug;
  }
  return "donors";
}

export async function requireExternalUser(
  role: ExternalUserRow["role"],
): Promise<ExternalUserRow> {
  const user = await getCurrentExternalUser();
  const slug = externalSlugFromRole(role);
  if (!user) redirect(`/portal/${slug}/login`);
  if (user.role !== role) redirect(`/portal/${externalSlugFromRole(user.role)}/dashboard`);
  return user;
}

export async function requireExternalUserByRef(
  role: ExternalUserRow["role"],
  refCode: string,
): Promise<ExternalUserRow> {
  const user = await requireExternalUser(role);
  if (user.refCode !== refCode) {
    const target = await findExternalUserByRefCodePostgres(refCode);
    if (!target || target.role !== role) redirect(`/portal/${externalSlugFromRole(role)}/dashboard`);
    redirect(`/portal/${externalSlugFromRole(role)}/dashboard`);
  }
  return user;
}
