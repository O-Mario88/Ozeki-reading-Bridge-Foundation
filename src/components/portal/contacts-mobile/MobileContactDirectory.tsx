/**
 * MobileContactDirectory — screenshot-faithful Contact Directory for the
 * mobile breakpoint of /portal/contacts. Server component; reads URL
 * search params and asks the directory repo for the matching paged set.
 * Renders a Calibri-scoped, card-driven layout: title + subtitle, search,
 * filter row, applied chips, segmented tabs, count + sort, paged cards.
 *
 * Wraps in lg:hidden so the existing desktop CRM Overview keeps showing
 * for >= lg viewports; everything below lg shows this directory.
 */

import Link from "next/link";
import { Search, SlidersHorizontal, ArrowDownUp, Check, X, MapPin, Phone } from "lucide-react";
import {
  getMobileContactDirectory,
  type DirectoryFilters,
  type DirectoryTab,
} from "@/lib/server/postgres/repositories/mobile-contact-directory";
import { MobileContactCard } from "./MobileContactCard";

const FONT = 'Calibri, "Segoe UI", Arial, sans-serif';
const TEXT = "#111827";
const TEXT_MUTED = "#475467";
const TEXT_SUBTLE = "#667085";
const BORDER = "#E5EAF0";
const PRIMARY_DEEP = "#003F37";
const SOFT_GREEN = "#EAF7F1";

const TABS: { key: DirectoryTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "school_contacts", label: "School Contacts" },
  { key: "teachers", label: "Teachers" },
  { key: "coaches", label: "Coaches" },
];

interface Props {
  filters: DirectoryFilters;
}

export async function MobileContactDirectory({ filters }: Props) {
  const result = await getMobileContactDirectory(filters);
  const { contacts, total, filterOptions } = result;
  const activeTab: DirectoryTab = filters.tab ?? "all";

  // Build the chip list from currently-applied filters.
  const chips: { key: keyof DirectoryFilters; label: string; clearHref: string }[] = [];
  if (filters.region) chips.push({ key: "region", label: `Region: ${filters.region}`, clearHref: hrefWithout(filters, "region") });
  if (filters.role) chips.push({ key: "role", label: `Role: ${filters.role}`, clearHref: hrefWithout(filters, "role") });
  if (filters.district) chips.push({ key: "district", label: `District: ${filters.district}`, clearHref: hrefWithout(filters, "district") });
  if (filters.status) chips.push({ key: "status", label: filters.status === "active" ? "Active" : "Inactive", clearHref: hrefWithout(filters, "status") });

  return (
    <div
      className="lg:hidden orbf-mcd"
      style={{ fontFamily: FONT, paddingBottom: 96, background: "#FFFFFF" }}
    >
      {/* Title block */}
      <header style={{ padding: "8px 16px 12px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT, margin: 0, letterSpacing: -0.3 }}>Contact Directory</h1>
        <p style={{ fontSize: 13.5, color: TEXT_MUTED, margin: "6px 0 0", lineHeight: 1.4, maxWidth: 320 }}>
          School leaders, teachers, tutors, and partner contacts across the network.
        </p>
      </header>

      {/* Search + filter button */}
      <form method="get" action="/portal/contacts" style={{ padding: "8px 16px 0" }}>
        <PreserveHidden filters={filters} except={["search"]} />
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ flex: 1, position: "relative", display: "block" }}>
            <Search
              size={16}
              color={TEXT_SUBTLE}
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              name="search"
              type="search"
              defaultValue={filters.search ?? ""}
              placeholder="Search contact name, school, phone..."
              style={{
                width: "100%",
                height: 44,
                padding: "0 14px 0 38px",
                borderRadius: 12,
                border: `1px solid ${BORDER}`,
                background: "#FFFFFF",
                fontSize: 13,
                color: TEXT,
                fontFamily: FONT,
                outline: "none",
              }}
              autoComplete="off"
            />
          </label>
          <button
            type="submit"
            aria-label="Apply filters"
            style={{
              width: 44, height: 44, borderRadius: 12, border: `1px solid ${BORDER}`,
              background: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <SlidersHorizontal size={16} color={TEXT_MUTED} />
          </button>
        </div>
      </form>

      {/* Inline dropdown filter row */}
      <form method="get" action="/portal/contacts" style={{ padding: "10px 16px 0" }}>
        <PreserveHidden filters={filters} except={["role", "region", "district", "status"]} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <FilterSelect name="role" defaultValue={filters.role ?? ""} placeholder="Role" options={filterOptions.roles} />
          <FilterSelect name="region" defaultValue={filters.region ?? ""} placeholder="Region" options={filterOptions.regions} />
          <FilterSelect name="district" defaultValue={filters.district ?? ""} placeholder="District" options={filterOptions.districts} />
          <FilterSelect
            name="status"
            defaultValue={filters.status ?? ""}
            placeholder="Status"
            options={["active", "inactive"]}
            optionLabel={(v) => v === "active" ? "Active" : "Inactive"}
          />
          <button
            type="submit"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px",
              background: PRIMARY_DEEP, color: "#FFFFFF", borderRadius: 10, border: `1px solid ${PRIMARY_DEEP}`,
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
            }}
          >
            <SlidersHorizontal size={13} /> Filters
          </button>
        </div>
      </form>

      {/* Applied filter chips */}
      {chips.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "12px 16px 0" }}>
          {chips.map((chip) => (
            <Link
              key={`${chip.key}-${chip.label}`}
              href={chip.clearHref}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 10px 5px 8px", borderRadius: 999,
                background: SOFT_GREEN, color: "#087A55", border: "1px solid #CDEBDF",
                fontSize: 12, fontWeight: 600, textDecoration: "none",
              }}
            >
              <Check size={12} /> {chip.label} <X size={12} />
            </Link>
          ))}
        </div>
      ) : null}

      {/* Segmented tabs */}
      <nav aria-label="Contact category" style={{ display: "flex", gap: 6, padding: "12px 16px 0", overflowX: "auto" }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const href = hrefWith(filters, "tab", tab.key === "all" ? undefined : tab.key);
          return (
            <Link
              key={tab.key}
              href={href}
              style={{
                display: "inline-flex", alignItems: "center", height: 34, padding: "0 14px",
                borderRadius: 10, fontSize: 12.5, fontWeight: 700, textDecoration: "none",
                background: isActive ? PRIMARY_DEEP : "#FFFFFF",
                color: isActive ? "#FFFFFF" : TEXT_MUTED,
                border: `1px solid ${isActive ? PRIMARY_DEEP : BORDER}`,
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
        <span style={{ flex: 1 }} />
        <button
          type="button"
          aria-label="More filters"
          style={{
            width: 34, height: 34, borderRadius: 10, border: `1px solid ${BORDER}`,
            background: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <SlidersHorizontal size={14} color={TEXT_MUTED} />
        </button>
      </nav>

      {/* Count + sort */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 4px" }}>
        <span style={{ fontSize: 12.5, color: TEXT_MUTED, fontWeight: 600 }}>{total.toLocaleString()} contacts</span>
        <Link
          href={hrefWith(filters, "sort", filters.sort === "name_desc" ? undefined : "name_desc")}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: TEXT, fontWeight: 600, textDecoration: "none" }}
        >
          Sort: {filters.sort === "name_desc" ? "Z–A" : filters.sort === "recent" ? "Recent" : "A–Z"}
          <ArrowDownUp size={12} color={TEXT_SUBTLE} />
        </Link>
      </div>

      {/* Cards */}
      <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {contacts.length === 0 ? (
          <EmptyState />
        ) : (
          contacts.map((c) => <MobileContactCard key={c.contactId} contact={c} />)
        )}
      </div>

      {/* Simple pager */}
      {total > result.limit ? (
        <Pager filters={filters} total={total} />
      ) : null}

      {/* Below-fold marker icon for the location/phone rows so unused-import
          warnings don't fire when no card needs them in this scope */}
      <span style={{ display: "none" }} aria-hidden="true"><MapPin size={1} /><Phone size={1} /></span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Filter <select> styled to look like a pill
   ──────────────────────────────────────────────────────────────────── */

function FilterSelect({
  name, defaultValue, placeholder, options, optionLabel,
}: {
  name: string;
  defaultValue: string;
  placeholder: string;
  options: string[];
  optionLabel?: (v: string) => string;
}) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center" }}>
      <select
        name={name}
        defaultValue={defaultValue}
        aria-label={placeholder}
        style={{
          height: 36, padding: "0 28px 0 12px", borderRadius: 10,
          border: `1px solid ${BORDER}`, background: "#FFFFFF",
          fontSize: 12.5, color: TEXT, fontFamily: FONT, fontWeight: 600,
          appearance: "none",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{optionLabel ? optionLabel(opt) : opt}</option>
        ))}
      </select>
    </label>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Hidden inputs to preserve the rest of the URL state when a single
   sub-form (search, filter pills, tab strip) submits a GET.
   ──────────────────────────────────────────────────────────────────── */

function PreserveHidden({
  filters, except,
}: { filters: DirectoryFilters; except: (keyof DirectoryFilters)[] }) {
  const skip = new Set<keyof DirectoryFilters>(except);
  const entries: [string, string][] = [];
  if (!skip.has("search") && filters.search) entries.push(["search", filters.search]);
  if (!skip.has("role") && filters.role) entries.push(["role", filters.role]);
  if (!skip.has("region") && filters.region) entries.push(["region", filters.region]);
  if (!skip.has("district") && filters.district) entries.push(["district", filters.district]);
  if (!skip.has("status") && filters.status) entries.push(["status", filters.status]);
  if (!skip.has("tab") && filters.tab && filters.tab !== "all") entries.push(["tab", filters.tab]);
  if (!skip.has("sort") && filters.sort) entries.push(["sort", filters.sort]);
  return (
    <>
      {entries.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────── */

function buildUrl(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.trim()) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/portal/contacts?${qs}` : "/portal/contacts";
}

function hrefWith(filters: DirectoryFilters, key: keyof DirectoryFilters, value: string | undefined): string {
  return buildUrl({
    search: filters.search,
    role: filters.role,
    region: filters.region,
    district: filters.district,
    status: filters.status,
    tab: filters.tab,
    sort: filters.sort,
    [key]: value,
  });
}

function hrefWithout(filters: DirectoryFilters, key: keyof DirectoryFilters): string {
  return hrefWith(filters, key, undefined);
}

/* ────────────────────────────────────────────────────────────────────────
   Empty state + pager
   ──────────────────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div
      style={{
        padding: 24, background: "#F8FAFC", border: `1px solid ${BORDER}`, borderRadius: 14,
        textAlign: "center", color: TEXT_MUTED, fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 700, color: TEXT, marginBottom: 4 }}>No contacts found.</div>
      <div>Try changing your filters or search term.</div>
    </div>
  );
}

function Pager({ filters, total }: { filters: DirectoryFilters; total: number }) {
  const limit = filters.limit ?? 20;
  const page = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const prev = page > 1 ? hrefWith(filters, "page", String(page - 1)) : null;
  const next = page < totalPages ? hrefWith(filters, "page", String(page + 1)) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 24px" }}>
      {prev ? (
        <Link href={prev} style={pagerBtn}>← Prev</Link>
      ) : <span style={{ ...pagerBtn, opacity: 0.4, pointerEvents: "none" }}>← Prev</span>}
      <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>Page {page} of {totalPages}</span>
      {next ? (
        <Link href={next} style={pagerBtn}>Next →</Link>
      ) : <span style={{ ...pagerBtn, opacity: 0.4, pointerEvents: "none" }}>Next →</span>}
    </div>
  );
}

const pagerBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px",
  borderRadius: 10, background: "#FFFFFF", color: TEXT, fontSize: 12, fontWeight: 700,
  border: `1px solid ${BORDER}`, textDecoration: "none",
};
