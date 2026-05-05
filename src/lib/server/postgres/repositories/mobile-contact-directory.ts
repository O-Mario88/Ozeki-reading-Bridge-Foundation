/**
 * mobile-contact-directory — paged + filtered list of school contacts for
 * the mobile Contact Directory at `/portal/contacts` (lg:hidden variant).
 *
 * The desktop CRM Overview at the same route is left as-is. Mobile users
 * see a card-list directory with search / role / region / district /
 * status filters, segmented tabs, and per-contact training/visit/assessment
 * counters. Everything is fetched live — no hardcoded contact rows.
 */

import { queryPostgres } from "@/lib/server/postgres/client";

export type DirectoryStatus = "Active" | "Inactive";

export type DirectoryTab = "all" | "school_contacts" | "teachers" | "coaches";

export type DirectoryFilters = {
  search?: string;
  role?: string;
  region?: string;
  district?: string;
  status?: "active" | "inactive";
  tab?: DirectoryTab;
  sort?: "name_asc" | "name_desc" | "recent";
  page?: number;
  limit?: number;
};

export type DirectoryContact = {
  contactId: number;
  fullName: string;
  initials: string;
  roleLabel: string;
  contactRecordType: string;
  primarySchoolId: number | null;
  primarySchoolName: string | null;
  district: string | null;
  region: string | null;
  county: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  status: DirectoryStatus;
  trainingCount: number;
  visitCount: number;
  assessmentCount: number;
};

export type DirectoryFilterOptions = {
  roles: string[];
  regions: string[];
  districts: string[];
};

export type DirectoryResult = {
  contacts: DirectoryContact[];
  total: number;
  page: number;
  limit: number;
  filterOptions: DirectoryFilterOptions;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function classifyContactType(contactRecordType: string | null, roleTitle: string | null, category: string | null): "Teacher" | "Coach" | "School Contact" {
  const haystack = `${contactRecordType ?? ""} ${roleTitle ?? ""} ${category ?? ""}`.toLowerCase();
  if (haystack.includes("coach")) return "Coach";
  if (haystack.includes("teacher")) return "Teacher";
  return "School Contact";
}

export async function getMobileContactDirectory(filters: DirectoryFilters = {}): Promise<DirectoryResult> {
  const limit = Math.min(MAX_LIMIT, Math.max(1, filters.limit ?? DEFAULT_LIMIT));
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * limit;

  // Build dynamic WHERE clauses + values. Each push appends one $N param.
  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  const push = (v: unknown) => { params.push(v); return `$${params.length}`; };

  if (filters.search && filters.search.trim()) {
    const q = `%${filters.search.trim().toLowerCase()}%`;
    conds.push(
      `(LOWER(sc.full_name) LIKE ${push(q)}
        OR LOWER(COALESCE(sd.name, '')) LIKE ${push(q)}
        OR LOWER(COALESCE(sc.phone, '')) LIKE ${push(q)}
        OR LOWER(COALESCE(sc.email, '')) LIKE ${push(q)})`
    );
  }
  if (filters.role && filters.role.trim()) {
    conds.push(`(LOWER(COALESCE(sc.role_title, sc.category, '')) LIKE LOWER(${push(`%${filters.role.trim()}%`)}))`);
  }
  if (filters.region && filters.region.trim()) {
    conds.push(`sd.region = ${push(filters.region.trim())}`);
  }
  if (filters.district && filters.district.trim()) {
    conds.push(`sd.district = ${push(filters.district.trim())}`);
  }
  // status: 'active' = had any activity in last 12mo OR updated within 12mo;
  // 'inactive' = the inverse. A simple recency proxy until a real status
  // column exists on school_contacts.
  if (filters.status === "active") {
    conds.push(`sc.updated_at >= NOW() - INTERVAL '12 months'`);
  } else if (filters.status === "inactive") {
    conds.push(`sc.updated_at < NOW() - INTERVAL '12 months'`);
  }
  // tab is segment-based (All / School Contacts / Teachers / Coaches)
  if (filters.tab === "teachers") {
    conds.push(`(LOWER(COALESCE(sc.contact_record_type, '')) LIKE '%teacher%' OR LOWER(COALESCE(sc.role_title, '')) LIKE '%teacher%')`);
  } else if (filters.tab === "coaches") {
    conds.push(`(LOWER(COALESCE(sc.contact_record_type, '')) LIKE '%coach%' OR LOWER(COALESCE(sc.role_title, '')) LIKE '%coach%')`);
  } else if (filters.tab === "school_contacts") {
    conds.push(`(LOWER(COALESCE(sc.contact_record_type, 'school contact')) NOT LIKE '%teacher%'
                  AND LOWER(COALESCE(sc.contact_record_type, 'school contact')) NOT LIKE '%coach%')`);
  }

  const where = conds.join(" AND ");
  const orderBy = filters.sort === "name_desc"
    ? "sc.full_name DESC"
    : filters.sort === "recent"
      ? "sc.updated_at DESC NULLS LAST"
      : "sc.full_name ASC";

  // Count + page in one round trip via window function.
  const sql = `
    SELECT
      sc.contact_id AS id,
      sc.full_name AS full_name,
      COALESCE(sc.role_title, sc.category) AS role_label,
      COALESCE(sc.contact_record_type, 'School Contact') AS contact_record_type,
      sc.category,
      sc.role_title,
      sd.id AS school_id,
      sd.name AS school_name,
      sd.district,
      sd.region,
      sd.sub_county AS county,
      sc.phone,
      sc.email,
      sc.whatsapp,
      sc.updated_at,
      (sc.updated_at >= NOW() - INTERVAL '12 months') AS is_active,
      (
        SELECT COUNT(*)::int FROM portal_training_attendance a WHERE a.contact_id = sc.contact_id
      ) AS training_count,
      (
        SELECT COUNT(*)::int FROM visit_participants vp WHERE vp.contact_id = sc.contact_id
      ) AS visit_count,
      (
        SELECT COUNT(DISTINCT ar.id)::int
        FROM assessment_records ar
        WHERE ar.school_id = sd.id AND sc.teacher_uid IS NOT NULL
      ) AS assessment_count,
      COUNT(*) OVER () AS total_count
    FROM school_contacts sc
    LEFT JOIN schools_directory sd ON sd.id = sc.school_id
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ${push(limit)} OFFSET ${push(offset)}
  `;

  const res = await queryPostgres(sql, params);

  const total = Number(res.rows[0]?.total_count ?? 0);
  const contacts: DirectoryContact[] = res.rows.map((r) => ({
    contactId: Number(r.id),
    fullName: String(r.full_name),
    initials: getInitials(String(r.full_name)),
    roleLabel: r.role_label ?? r.category ?? "Contact",
    contactRecordType: classifyContactType(r.contact_record_type, r.role_title, r.category),
    primarySchoolId: r.school_id ? Number(r.school_id) : null,
    primarySchoolName: r.school_name ?? null,
    district: r.district ?? null,
    region: r.region ?? null,
    county: r.county ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    whatsapp: r.whatsapp ?? null,
    status: r.is_active ? "Active" : "Inactive",
    trainingCount: Number(r.training_count ?? 0),
    visitCount: Number(r.visit_count ?? 0),
    assessmentCount: Number(r.assessment_count ?? 0),
  }));

  // Filter options come from the full table — they don't shrink as the
  // user filters, so the dropdowns always show every available choice.
  const optionsRes = await queryPostgres<{
    role: string | null;
    region: string | null;
    district: string | null;
  }>(
    `SELECT DISTINCT
        COALESCE(NULLIF(TRIM(sc.role_title), ''), NULLIF(TRIM(sc.category), '')) AS role,
        sd.region,
        sd.district
     FROM school_contacts sc
     LEFT JOIN schools_directory sd ON sd.id = sc.school_id`,
  );
  const roles = new Set<string>();
  const regions = new Set<string>();
  const districts = new Set<string>();
  for (const opt of optionsRes.rows) {
    if (opt.role) roles.add(opt.role);
    if (opt.region) regions.add(opt.region);
    if (opt.district) districts.add(opt.district);
  }

  return {
    contacts,
    total,
    page,
    limit,
    filterOptions: {
      roles: [...roles].sort((a, b) => a.localeCompare(b)),
      regions: [...regions].sort((a, b) => a.localeCompare(b)),
      districts: [...districts].sort((a, b) => a.localeCompare(b)),
    },
  };
}
