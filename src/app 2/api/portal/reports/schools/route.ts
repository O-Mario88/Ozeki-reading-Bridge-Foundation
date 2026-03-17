import { NextResponse } from "next/server";
import { getPortalOperationalReportsData } from "@/lib/db";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import { PortalSchoolReportRow } from "@/lib/types";

export const runtime = "nodejs";

type ReportModuleFilter =
  | "all"
  | "training"
  | "visit"
  | "story"
  | "resource"
  | "teacher-assessment"
  | "learner-assessment";

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function hasReportsAccess(user: { role: string; isAdmin: boolean; isSuperAdmin: boolean }) {
  return (
    user.role === "Volunteer" ||
    user.role === "Staff" ||
    user.role === "Admin" ||
    user.isAdmin ||
    user.isSuperAdmin
  );
}

function filterSchools(
  rows: PortalSchoolReportRow[],
  filters: {
    country: string | null;
    region: string | null;
    subRegion: string | null;
    district: string | null;
    subCounty: string | null;
    parish: string | null;
    village: string | null;
    module: ReportModuleFilter;
  },
  search: string | null,
) {
  const normalizedCountry = filters.country?.trim().toLowerCase() || "";
  const normalizedRegion = filters.region?.trim().toLowerCase() || "";
  const normalizedSubRegion = filters.subRegion?.trim().toLowerCase() || "";
  const normalizedDistrict = filters.district?.trim().toLowerCase() || "";
  const normalizedSubCounty = filters.subCounty?.trim().toLowerCase() || "";
  const normalizedParish = filters.parish?.trim().toLowerCase() || "";
  const normalizedVillage = filters.village?.trim().toLowerCase() || "";
  const normalizedSearch = search?.trim().toLowerCase() || "";
  const module = filters.module;

  const matchesModule = (row: PortalSchoolReportRow) => {
    if (module === "all") return true;
    if (module === "training") return row.trainings > 0;
    if (module === "visit") return row.schoolVisits > 0;
    if (module === "story") return row.storyActivities > 0;
    if (module === "resource") return row.resourcesDistributed > 0;
    if (module === "teacher-assessment") return row.teacherAssessments > 0;
    if (module === "learner-assessment") return row.learnerAssessments > 0;
    return true;
  };

  return rows.filter((row) => {
    const countryMatch =
      !normalizedCountry || (row.country ?? "").toLowerCase() === normalizedCountry;
    const regionMatch =
      !normalizedRegion || (row.region ?? "").toLowerCase() === normalizedRegion;
    const subRegionMatch =
      !normalizedSubRegion || (row.subRegion ?? "").toLowerCase() === normalizedSubRegion;
    const districtMatch =
      !normalizedDistrict || row.district.toLowerCase() === normalizedDistrict;
    const subCountyMatch =
      !normalizedSubCounty || (row.subCounty ?? "").toLowerCase() === normalizedSubCounty;
    const parishMatch = !normalizedParish || (row.parish ?? "").toLowerCase() === normalizedParish;
    const villageMatch =
      !normalizedVillage || (row.village ?? "").toLowerCase() === normalizedVillage;
    const searchMatch =
      !normalizedSearch ||
      row.schoolName.toLowerCase().includes(normalizedSearch) ||
      row.schoolCode.toLowerCase().includes(normalizedSearch) ||
      row.district.toLowerCase().includes(normalizedSearch) ||
      (row.region ?? "").toLowerCase().includes(normalizedSearch) ||
      (row.subRegion ?? "").toLowerCase().includes(normalizedSearch) ||
      (row.subCounty ?? "").toLowerCase().includes(normalizedSearch) ||
      (row.parish ?? "").toLowerCase().includes(normalizedSearch) ||
      (row.village ?? "").toLowerCase().includes(normalizedSearch) ||
      (row.primaryContact ?? "").toLowerCase().includes(normalizedSearch) ||
      (row.phone ?? "").toLowerCase().includes(normalizedSearch);
    return (
      countryMatch &&
      regionMatch &&
      subRegionMatch &&
      districtMatch &&
      subCountyMatch &&
      parishMatch &&
      villageMatch &&
      matchesModule(row) &&
      searchMatch
    );
  });
}

export async function GET(request: Request) {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasReportsAccess(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format")?.toLowerCase() ?? "json";
  const moduleParam = (searchParams.get("module")?.toLowerCase() ?? "all") as ReportModuleFilter;
  const module: ReportModuleFilter = [
    "all",
    "training",
    "visit",
    "story",
    "resource",
    "teacher-assessment",
    "learner-assessment",
  ].includes(moduleParam)
    ? moduleParam
    : "all";
  const country = searchParams.get("country");
  const region = searchParams.get("region");
  const subRegion = searchParams.get("subRegion");
  const district = searchParams.get("district");
  const subCounty = searchParams.get("subCounty");
  const parish = searchParams.get("parish");
  const village = searchParams.get("village");
  const search = searchParams.get("search");

  const payload = getPortalOperationalReportsData(user);
  const schools = filterSchools(
    payload.schools,
    { country, region, subRegion, district, subCounty, parish, village, module },
    search,
  );

  if (format !== "csv") {
    return NextResponse.json({
      generatedAt: payload.generatedAt,
      totals: payload.totals,
      districts: payload.districts,
      filters: {
        country: country ?? "",
        region: region ?? "",
        subRegion: subRegion ?? "",
        district: district ?? "",
        subCounty: subCounty ?? "",
        parish: parish ?? "",
        village: village ?? "",
        module,
      },
      schools,
    });
  }

  const header = [
    "Country",
    "Region",
    "Sub-region",
    "District",
    "Sub-county",
    "Parish",
    "Village",
    "School ID",
    "School Code",
    "Account Owner",
    "School Name",
    "Last Activity",
    "Current Enrollment",
    "School Status",
    "Phone",
    "Primary Contact",
    "Trainings",
    "School Visits",
    "1001 Story Activities",
    "Resources Distributed",
    "Teacher Assessments",
    "Teacher Observation Average",
    "Teacher Observation Count",
    "Learner Assessments",
    "Total Records",
  ];

  const lines = schools.map((row) =>
    [
      row.country ?? "",
      row.region ?? "",
      row.subRegion ?? "",
      row.district,
      row.subCounty ?? "",
      row.parish ?? "",
      row.village ?? "",
      row.schoolId,
      row.schoolCode,
      row.accountOwner,
      row.schoolName,
      row.lastActivityDate ?? "",
      row.currentEnrollment,
      row.schoolStatus,
      row.phone ?? "",
      row.primaryContact ?? "",
      row.trainings,
      row.schoolVisits,
      row.storyActivities,
      row.resourcesDistributed,
      row.teacherAssessments,
      row.teacherObservationAverage ?? "",
      row.teacherObservationCount,
      row.learnerAssessments,
      row.totalRecords,
    ]
      .map((value) => csvEscape(value))
      .join(","),
  );

  const csv = [header.join(","), ...lines].join("\n");
  const now = new Date().toISOString().slice(0, 10);
  const filename = `schools-operations-report-${now}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
