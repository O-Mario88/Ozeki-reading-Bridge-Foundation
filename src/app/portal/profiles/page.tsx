import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";
import { getImpactExplorerProfiles } from "@/lib/db";
import { requirePortalUser } from "@/lib/portal-auth";
import { inferSubRegionFromDistrict } from "@/lib/uganda-locations";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profiles Explorer",
  description:
    "Backend profile explorer for country, region, sub-region, district, sub-county, parish, and school with direct links to report profile modules.",
};

type ProfileLevel =
  | "country"
  | "region"
  | "subregion"
  | "district"
  | "subcounty"
  | "parish"
  | "school";

type QuickLinkItem = {
  label: string;
  count: number;
  href: string;
  icon: string;
  entryAction?: boolean;
  staffOnly?: boolean;
  adminOnly?: boolean;
};

type AggregateStatusCounts = {
  onTrack: number;
  needsSupport: number;
  highPriority: number;
};

type ProfileSelection = {
  region: string;
  subRegion: string;
  district: string;
  subCounty: string;
  parish: string;
  schoolId: number | null;
};

type ExplorerProfiles = ReturnType<typeof getImpactExplorerProfiles>;
type ExplorerSchool = ExplorerProfiles["schools"][number];

type SchoolWithGeo = ExplorerSchool & {
  subRegion: string;
  subCountyName: string;
  parishName: string;
};

type AggregateProfile = {
  schoolsTotal: number;
  schoolsSupported: number;
  enrolledLearners: number;
  trainings: number;
  visits: number;
  assessments: number;
  storyActivities: number;
  coachingCycles: number;
  participantsTotal: number;
  participantsTeachers: number;
  participantsLeaders: number;
  learnersAssessed: number;
  storiesPublished: number;
  evidenceUploads: number;
  statusCounts: AggregateStatusCounts;
};

function normalizeValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function resolveLevel(value: string): ProfileLevel {
  const normalized = value.trim().toLowerCase();
  if (normalized === "country") return "country";
  if (normalized === "region") return "region";
  if (normalized === "subregion" || normalized === "sub-region") return "subregion";
  if (normalized === "district") return "district";
  if (normalized === "subcounty" || normalized === "sub-county") return "subcounty";
  if (normalized === "parish") return "parish";
  return "school";
}

function toProfileHref(nextLevel: ProfileLevel, selection: ProfileSelection) {
  const params = new URLSearchParams();
  params.set("level", nextLevel);
  if (selection.region) params.set("region", selection.region);
  if (selection.subRegion) params.set("subRegion", selection.subRegion);
  if (selection.district) params.set("district", selection.district);
  if (selection.subCounty) params.set("subCounty", selection.subCounty);
  if (selection.parish) params.set("parish", selection.parish);
  if (selection.schoolId) params.set("schoolId", String(selection.schoolId));
  return `/portal/profiles?${params.toString()}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function deriveAggregateStatus(statusCounts: AggregateStatusCounts) {
  if (statusCounts.highPriority > 0) {
    return "High priority";
  }
  if (statusCounts.needsSupport > 0) {
    return "Needs support";
  }
  return "On track";
}

function getProfileIcon(level: ProfileLevel) {
  if (level === "country") return "UG";
  if (level === "region") return "RG";
  if (level === "subregion") return "SR";
  if (level === "district") return "DT";
  if (level === "subcounty") return "SU";
  if (level === "parish") return "PH";
  return "SC";
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function summarizeSchools(schools: SchoolWithGeo[]): AggregateProfile {
  const statusCounts: AggregateStatusCounts = {
    onTrack: 0,
    needsSupport: 0,
    highPriority: 0,
  };

  schools.forEach((school) => {
    if (school.status === "On track") statusCounts.onTrack += 1;
    if (school.status === "Needs support") statusCounts.needsSupport += 1;
    if (school.status === "High priority") statusCounts.highPriority += 1;
  });

  return {
    schoolsTotal: schools.length,
    schoolsSupported: schools.filter(
      (school) => school.trainings + school.visits + school.assessments + school.storyActivities > 0,
    ).length,
    enrolledLearners: schools.reduce((total, school) => total + school.enrolledLearners, 0),
    trainings: schools.reduce((total, school) => total + school.trainings, 0),
    visits: schools.reduce((total, school) => total + school.visits, 0),
    assessments: schools.reduce((total, school) => total + school.assessments, 0),
    storyActivities: schools.reduce((total, school) => total + school.storyActivities, 0),
    coachingCycles: schools.reduce((total, school) => total + school.coachingCycles, 0),
    participantsTotal: schools.reduce((total, school) => total + school.participantsTotal, 0),
    participantsTeachers: schools.reduce((total, school) => total + school.participantsTeachers, 0),
    participantsLeaders: schools.reduce((total, school) => total + school.participantsLeaders, 0),
    learnersAssessed: schools.reduce((total, school) => total + school.learnersAssessed, 0),
    storiesPublished: schools.reduce((total, school) => total + school.storiesPublished, 0),
    evidenceUploads: schools.reduce((total, school) => total + school.evidenceUploads, 0),
    statusCounts,
  };
}

function buildPublicDashboardHref(level: ProfileLevel, selection: ProfileSelection) {
  const query = new URLSearchParams();
  query.set("period", "FY");

  if (selection.region) {
    query.set("region", selection.region);
  }
  if (selection.subRegion) {
    query.set("subRegion", selection.subRegion);
  }
  if (selection.district) {
    query.set("district", selection.district);
  }
  if (level === "school" && selection.schoolId) {
    query.set("schoolId", String(selection.schoolId));
  }

  return `/impact?${query.toString()}`;
}

export default async function PortalProfilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePortalUser();
  const filters = await searchParams;
  const level = resolveLevel(normalizeValue(filters.level));
  const explorer = getImpactExplorerProfiles();

  const schools: SchoolWithGeo[] = explorer.schools.map((school) => {
    const district = school.district.trim();
    return {
      ...school,
      subRegion: inferSubRegionFromDistrict(district) ?? "Unknown Sub-region",
      subCountyName: school.subCounty?.trim() || "Unknown Sub-county",
      parishName: school.parish?.trim() || "Unknown Parish",
    };
  });

  const regionOptions = uniqueSorted(schools.map((school) => school.region));
  const selectedRegionRaw = normalizeValue(filters.region);
  const selectedRegion = regionOptions.includes(selectedRegionRaw)
    ? selectedRegionRaw
    : (regionOptions[0] ?? "");

  const subRegionOptions = uniqueSorted(
    schools
      .filter((school) => (selectedRegion ? school.region === selectedRegion : true))
      .map((school) => school.subRegion),
  );
  const selectedSubRegionRaw = normalizeValue(filters.subRegion);
  const selectedSubRegion = subRegionOptions.includes(selectedSubRegionRaw)
    ? selectedSubRegionRaw
    : (subRegionOptions[0] ?? "");

  const districtOptions = uniqueSorted(
    schools
      .filter((school) => (selectedRegion ? school.region === selectedRegion : true))
      .filter((school) => (selectedSubRegion ? school.subRegion === selectedSubRegion : true))
      .map((school) => school.district),
  );
  const selectedDistrictRaw = normalizeValue(filters.district);
  const selectedDistrict = districtOptions.includes(selectedDistrictRaw)
    ? selectedDistrictRaw
    : (districtOptions[0] ?? "");

  const subCountyOptions = uniqueSorted(
    schools
      .filter((school) => (selectedRegion ? school.region === selectedRegion : true))
      .filter((school) => (selectedSubRegion ? school.subRegion === selectedSubRegion : true))
      .filter((school) => (selectedDistrict ? school.district === selectedDistrict : true))
      .map((school) => school.subCountyName),
  );
  const selectedSubCountyRaw = normalizeValue(filters.subCounty);
  const selectedSubCounty = subCountyOptions.includes(selectedSubCountyRaw)
    ? selectedSubCountyRaw
    : (subCountyOptions[0] ?? "");

  const parishOptions = uniqueSorted(
    schools
      .filter((school) => (selectedRegion ? school.region === selectedRegion : true))
      .filter((school) => (selectedSubRegion ? school.subRegion === selectedSubRegion : true))
      .filter((school) => (selectedDistrict ? school.district === selectedDistrict : true))
      .filter((school) => (selectedSubCounty ? school.subCountyName === selectedSubCounty : true))
      .map((school) => school.parishName),
  );
  const selectedParishRaw = normalizeValue(filters.parish);
  const selectedParish = parishOptions.includes(selectedParishRaw)
    ? selectedParishRaw
    : (parishOptions[0] ?? "");

  const schoolOptions = schools.filter((school) => {
    if (selectedRegion && school.region !== selectedRegion) return false;
    if (selectedSubRegion && school.subRegion !== selectedSubRegion) return false;
    if (selectedDistrict && school.district !== selectedDistrict) return false;
    if (selectedSubCounty && school.subCountyName !== selectedSubCounty) return false;
    if (selectedParish && school.parishName !== selectedParish) return false;
    return true;
  });

  const selectedSchoolIdRaw = Number(normalizeValue(filters.schoolId));
  const selectedSchool =
    schoolOptions.find((school) => school.id === selectedSchoolIdRaw) ??
    schoolOptions.find((school) => school.id !== null) ??
    schoolOptions[0] ??
    null;

  const selection: ProfileSelection = {
    region: selectedRegion,
    subRegion: selectedSubRegion,
    district: selectedDistrict,
    subCounty: selectedSubCounty,
    parish: selectedParish,
    schoolId: selectedSchool?.id ?? null,
  };

  const regionScopedSchools = schools.filter((school) =>
    selectedRegion ? school.region === selectedRegion : true,
  );
  const subRegionScopedSchools = regionScopedSchools.filter((school) =>
    selectedSubRegion ? school.subRegion === selectedSubRegion : true,
  );
  const districtScopedSchools = subRegionScopedSchools.filter((school) =>
    selectedDistrict ? school.district === selectedDistrict : true,
  );
  const subCountyScopedSchools = districtScopedSchools.filter((school) =>
    selectedSubCounty ? school.subCountyName === selectedSubCounty : true,
  );
  const parishScopedSchools = subCountyScopedSchools.filter((school) =>
    selectedParish ? school.parishName === selectedParish : true,
  );

  const currentScopeSchools: SchoolWithGeo[] = (() => {
    if (level === "country") return schools;
    if (level === "region") return regionScopedSchools;
    if (level === "subregion") return subRegionScopedSchools;
    if (level === "district") return districtScopedSchools;
    if (level === "subcounty") return subCountyScopedSchools;
    if (level === "parish") return parishScopedSchools;
    if (selectedSchool) return [selectedSchool];
    return [];
  })();

  const aggregate = summarizeSchools(currentScopeSchools);

  const hierarchyCounts = {
    regions: uniqueSorted(currentScopeSchools.map((school) => school.region)).length,
    subRegions: uniqueSorted(currentScopeSchools.map((school) => school.subRegion)).length,
    districts: uniqueSorted(currentScopeSchools.map((school) => school.district)).length,
    subCounties: uniqueSorted(currentScopeSchools.map((school) => school.subCountyName)).length,
    parishes: uniqueSorted(currentScopeSchools.map((school) => school.parishName)).length,
    schools: currentScopeSchools.length,
  };

  const isStaffUser = user.role !== "Volunteer";
  const isAdminUser = user.isAdmin || user.isSuperAdmin;

  let profileTitle = "Uganda National Literacy Profile";
  let profileSubtitle = "Country";
  let metadataItems: Array<{ label: string; value: string }> = [];
  let duplicateNotice = "We found no potential duplicates of this account.";

  if (level === "country") {
    metadataItems = [
      { label: "Country", value: "Uganda" },
      { label: "Regions Covered", value: hierarchyCounts.regions.toLocaleString() },
      { label: "Sub-regions Covered", value: hierarchyCounts.subRegions.toLocaleString() },
      { label: "Districts Covered", value: hierarchyCounts.districts.toLocaleString() },
      { label: "Schools Supported", value: aggregate.schoolsSupported.toLocaleString() },
      { label: "Learners Assessed", value: aggregate.learnersAssessed.toLocaleString() },
    ];
  }

  if (level === "region") {
    profileTitle = `${selectedRegion || "Unknown Region"} Regional Literacy Profile`;
    profileSubtitle = "Region";
    metadataItems = [
      { label: "Country", value: "Uganda" },
      { label: "Region", value: selectedRegion || "Unknown Region" },
      { label: "Regional Status", value: deriveAggregateStatus(aggregate.statusCounts) },
      { label: "Sub-regions Covered", value: hierarchyCounts.subRegions.toLocaleString() },
      { label: "Districts Covered", value: hierarchyCounts.districts.toLocaleString() },
      { label: "Schools Supported", value: aggregate.schoolsSupported.toLocaleString() },
    ];
  }

  if (level === "subregion") {
    profileTitle = `${selectedSubRegion || "Unknown Sub-region"} Sub-region Literacy Profile`;
    profileSubtitle = "Sub-region";
    metadataItems = [
      { label: "Country", value: "Uganda" },
      { label: "Region", value: selectedRegion || "Unknown Region" },
      { label: "Sub-region", value: selectedSubRegion || "Unknown Sub-region" },
      { label: "Sub-region Status", value: deriveAggregateStatus(aggregate.statusCounts) },
      { label: "Districts Covered", value: hierarchyCounts.districts.toLocaleString() },
      { label: "Schools Supported", value: aggregate.schoolsSupported.toLocaleString() },
    ];
  }

  if (level === "district") {
    profileTitle = `${selectedDistrict || "Unknown District"} District Literacy Profile`;
    profileSubtitle = "District";
    metadataItems = [
      { label: "Country", value: "Uganda" },
      { label: "Region", value: selectedRegion || "Unknown Region" },
      { label: "Sub-region", value: selectedSubRegion || "Unknown Sub-region" },
      { label: "District", value: selectedDistrict || "Unknown District" },
      { label: "District Status", value: deriveAggregateStatus(aggregate.statusCounts) },
      { label: "Schools Supported", value: aggregate.schoolsSupported.toLocaleString() },
    ];
  }

  if (level === "subcounty") {
    profileTitle = `${selectedSubCounty || "Unknown Sub-county"} Sub-county Literacy Profile`;
    profileSubtitle = "Sub-county";
    metadataItems = [
      { label: "Country", value: "Uganda" },
      { label: "Region", value: selectedRegion || "Unknown Region" },
      { label: "Sub-region", value: selectedSubRegion || "Unknown Sub-region" },
      { label: "District", value: selectedDistrict || "Unknown District" },
      { label: "Sub-county", value: selectedSubCounty || "Unknown Sub-county" },
      { label: "Sub-county Status", value: deriveAggregateStatus(aggregate.statusCounts) },
    ];
  }

  if (level === "parish") {
    profileTitle = `${selectedParish || "Unknown Parish"} Parish Literacy Profile`;
    profileSubtitle = "Parish";
    metadataItems = [
      { label: "Country", value: "Uganda" },
      { label: "Region", value: selectedRegion || "Unknown Region" },
      { label: "Sub-region", value: selectedSubRegion || "Unknown Sub-region" },
      { label: "District", value: selectedDistrict || "Unknown District" },
      { label: "Sub-county", value: selectedSubCounty || "Unknown Sub-county" },
      { label: "Parish", value: selectedParish || "Unknown Parish" },
    ];
  }

  if (level === "school" && selectedSchool) {
    profileTitle = `${selectedSchool.name} - ${selectedSchool.district}`;
    profileSubtitle = "School";
    metadataItems = [
      { label: "Country", value: "Uganda" },
      { label: "Region", value: selectedSchool.region },
      { label: "Sub-region", value: selectedSchool.subRegion },
      { label: "District", value: selectedSchool.district },
      { label: "Sub-county", value: selectedSchool.subCountyName },
      { label: "Parish", value: selectedSchool.parishName },
      { label: "School Status", value: selectedSchool.status },
      { label: "School Status Date", value: formatDate(selectedSchool.lastActivityDate) },
      { label: "School Code", value: selectedSchool.schoolCode || "Not assigned" },
    ];
    duplicateNotice = "We found no potential duplicates of this Account.";
  }

  const hierarchyQuickLinks: QuickLinkItem[] = [
    {
      label: "Regional Profiles",
      count: level === "country" ? regionOptions.length : hierarchyCounts.regions,
      href: toProfileHref("region", selection),
      icon: "RG",
    },
    {
      label: "Sub-region Profiles",
      count: level === "country" ? uniqueSorted(schools.map((school) => school.subRegion)).length : hierarchyCounts.subRegions,
      href: toProfileHref("subregion", selection),
      icon: "SR",
    },
    {
      label: "District Profiles",
      count: level === "country" ? uniqueSorted(schools.map((school) => school.district)).length : hierarchyCounts.districts,
      href: toProfileHref("district", selection),
      icon: "DT",
    },
    {
      label: "Sub-county Profiles",
      count: level === "country" ? uniqueSorted(schools.map((school) => school.subCountyName)).length : hierarchyCounts.subCounties,
      href: toProfileHref("subcounty", selection),
      icon: "SU",
    },
    {
      label: "Parish Profiles",
      count: level === "country" ? uniqueSorted(schools.map((school) => school.parishName)).length : hierarchyCounts.parishes,
      href: toProfileHref("parish", selection),
      icon: "PH",
    },
    {
      label: "School Profiles",
      count: level === "country" ? schools.length : hierarchyCounts.schools,
      href: toProfileHref("school", selection),
      icon: "SC",
    },
  ];

  const entryActions: QuickLinkItem[] = [
    {
      label: "New Training",
      count: aggregate.trainings,
      href:
        level === "school" && selectedSchool?.id
          ? `/portal/trainings?new=1&schoolId=${selectedSchool.id}`
          : "/portal/trainings?new=1",
      icon: "TR",
      entryAction: true,
    },
    {
      label: "New School Visit",
      count: aggregate.visits,
      href:
        level === "school" && selectedSchool?.id
          ? `/portal/visits?new=1&schoolId=${selectedSchool.id}`
          : "/portal/visits?new=1",
      icon: "VS",
      entryAction: true,
    },
    {
      label: "New Assessment",
      count: aggregate.assessments,
      href:
        level === "school" && selectedSchool?.id
          ? `/portal/assessments?new=1&schoolId=${selectedSchool.id}`
          : "/portal/assessments?new=1",
      icon: "AS",
      entryAction: true,
    },
    {
      label: "New 1001 Story",
      count: aggregate.storyActivities,
      href:
        level === "school" && selectedSchool?.id
          ? `/portal/story?new=1&schoolId=${selectedSchool.id}`
          : "/portal/story?new=1",
      icon: "ST",
      entryAction: true,
    },
    {
      label: "Manage Schools",
      count: aggregate.schoolsTotal,
      href: "/portal/schools",
      icon: "MS",
      entryAction: true,
      staffOnly: true,
    },
    {
      label: "Upload Resources",
      count: 1,
      href: "/portal/resources",
      icon: "UP",
      entryAction: true,
      staffOnly: true,
    },
  ];

  const reportProfileQuickLinks: QuickLinkItem[] = [
    { label: "Report Profile Workspace", count: 1, href: "/portal/reports", icon: "RP" },
    { label: "Impact Reports", count: 1, href: "/portal/reports?tab=impact-reports", icon: "IM" },
    { label: "National Reports", count: 1, href: "/portal/reports?tab=national-reports", icon: "NR" },
    {
      label: "School Reading Performance Report",
      count: 1,
      href: "/portal/reports?tab=school-reading-performance",
      icon: "SR",
    },
    {
      label: "Training Reports",
      count: aggregate.trainings,
      href: "/portal/reports?tab=training-reports",
      icon: "TR",
    },
    {
      label: "Visit Reports",
      count: aggregate.visits,
      href: "/portal/reports?tab=operations&module=visit",
      icon: "VS",
    },
    {
      label: "Assessment Reports",
      count: aggregate.assessments,
      href: "/portal/reports?tab=operations&module=learner-assessment",
      icon: "AS",
    },
    {
      label: "Public Live Dashboard",
      count: 1,
      href: buildPublicDashboardHref(level, selection),
      icon: "PD",
    },
  ];

  const implementationLinks: QuickLinkItem[] = [
    { label: "Trainings", count: aggregate.trainings, href: "/portal/trainings", icon: "TR" },
    { label: "School Visits", count: aggregate.visits, href: "/portal/visits", icon: "VS" },
    { label: "Coaching Cycles", count: aggregate.coachingCycles, href: "/portal/visits", icon: "CC" },
    { label: "Assessments", count: aggregate.assessments, href: "/portal/assessments", icon: "AS" },
    { label: "1001 Story Activities", count: aggregate.storyActivities, href: "/portal/story", icon: "10" },
    { label: "Participants", count: aggregate.participantsTotal, href: "/portal/trainings", icon: "TP" },
    {
      label: "Teacher Participants",
      count: aggregate.participantsTeachers,
      href: "/portal/trainings",
      icon: "TC",
    },
    {
      label: "School Leaders",
      count: aggregate.participantsLeaders,
      href: "/portal/trainings",
      icon: "SL",
    },
    {
      label: "Learners Assessed",
      count: aggregate.learnersAssessed,
      href: "/portal/assessments",
      icon: "LA",
    },
    {
      label: "Stories Published",
      count: aggregate.storiesPublished,
      href: "/portal/story",
      icon: "PB",
    },
    {
      label: "Evidence Files",
      count: aggregate.evidenceUploads,
      href: "/portal/testimonials",
      icon: "EV",
    },
    { label: "Blog Manager", count: 1, href: "/portal/blog", icon: "BG", staffOnly: true },
    { label: "Data Dashboard", count: 1, href: "/portal/analytics", icon: "DB" },
    { label: "Super Admin", count: 1, href: "/portal/superadmin", icon: "SA", adminOnly: true },
  ];

  const schoolSpecificLinks: QuickLinkItem[] =
    level === "school" && selectedSchool
      ? [
        {
          label: "Account History",
          count: selectedSchool.timeline.length,
          href: selectedSchool.id
            ? `/portal/profiles?level=school&schoolId=${selectedSchool.id}`
            : "/portal/profiles?level=school",
          icon: "AH",
        },
        {
          label: "Enrollments",
          count: selectedSchool.enrolledLearners,
          href: "/portal/schools",
          icon: "EN",
        },
      ]
      : [];

  const quickLinks = [
    ...entryActions,
    ...hierarchyQuickLinks,
    ...implementationLinks,
    ...reportProfileQuickLinks,
    ...schoolSpecificLinks,
  ];

  const isLinkVisible = (item: QuickLinkItem) => {
    if (item.adminOnly && !isAdminUser) {
      return false;
    }
    if (item.staffOnly && !isStaffUser) {
      return false;
    }
    return true;
  };

  const visibleEntryActions = quickLinks.filter((item) => item.entryAction && isLinkVisible(item));
  const visibleLinks = quickLinks.filter((item) => !item.entryAction && isLinkVisible(item));

  return (
    <PortalShell
      user={user}
      activeHref="/portal/profiles"
      title="Profiles Explorer"
      description="Backend workspace organized by country, region, sub-region, district, sub-county, parish, and school profiles with report-profile quick links."
      shellClassName="portal-dashboard-shell"
    >
      <div className="portal-grid portal-profile-workspace">
        <section className="card portal-profile-toolbar">
          <div className="portal-profile-level-row">
            <p className="portal-filter-field-label">Explore Profiles</p>
            <div className="portal-profile-level-links">
              <Link
                className={level === "country" ? "portal-profile-level-link active" : "portal-profile-level-link"}
                href={toProfileHref("country", selection)}
              >
                Country
              </Link>
              <Link
                className={level === "region" ? "portal-profile-level-link active" : "portal-profile-level-link"}
                href={toProfileHref("region", selection)}
              >
                Region
              </Link>
              <Link
                className={level === "subregion" ? "portal-profile-level-link active" : "portal-profile-level-link"}
                href={toProfileHref("subregion", selection)}
              >
                Sub-region
              </Link>
              <Link
                className={level === "district" ? "portal-profile-level-link active" : "portal-profile-level-link"}
                href={toProfileHref("district", selection)}
              >
                District
              </Link>
              <Link
                className={level === "subcounty" ? "portal-profile-level-link active" : "portal-profile-level-link"}
                href={toProfileHref("subcounty", selection)}
              >
                Sub-county
              </Link>
              <Link
                className={level === "parish" ? "portal-profile-level-link active" : "portal-profile-level-link"}
                href={toProfileHref("parish", selection)}
              >
                Parish
              </Link>
              <Link
                className={level === "school" ? "portal-profile-level-link active" : "portal-profile-level-link"}
                href={toProfileHref("school", selection)}
              >
                School
              </Link>
            </div>
          </div>

          <form method="GET" className="portal-profile-picker portal-profile-picker-wide">
            <input type="hidden" name="level" value={level} />

            <label className="portal-filter-field">
              <span className="portal-filter-field-label">Region</span>
              <select name="region" defaultValue={selectedRegion}>
                {regionOptions.length === 0 ? (
                  <option value="">No regions</option>
                ) : (
                  regionOptions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="portal-filter-field">
              <span className="portal-filter-field-label">Sub-region</span>
              <select name="subRegion" defaultValue={selectedSubRegion}>
                {subRegionOptions.length === 0 ? (
                  <option value="">No sub-regions</option>
                ) : (
                  subRegionOptions.map((subRegion) => (
                    <option key={subRegion} value={subRegion}>
                      {subRegion}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="portal-filter-field">
              <span className="portal-filter-field-label">District</span>
              <select name="district" defaultValue={selectedDistrict}>
                {districtOptions.length === 0 ? (
                  <option value="">No districts</option>
                ) : (
                  districtOptions.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="portal-filter-field">
              <span className="portal-filter-field-label">Sub-county</span>
              <select name="subCounty" defaultValue={selectedSubCounty}>
                {subCountyOptions.length === 0 ? (
                  <option value="">No sub-counties</option>
                ) : (
                  subCountyOptions.map((subCounty) => (
                    <option key={subCounty} value={subCounty}>
                      {subCounty}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="portal-filter-field">
              <span className="portal-filter-field-label">Parish</span>
              <select name="parish" defaultValue={selectedParish}>
                {parishOptions.length === 0 ? (
                  <option value="">No parishes</option>
                ) : (
                  parishOptions.map((parish) => (
                    <option key={parish} value={parish}>
                      {parish}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="portal-filter-field">
              <span className="portal-filter-field-label">School</span>
              <select name="schoolId" defaultValue={selectedSchool?.id ? String(selectedSchool.id) : ""}>
                {schoolOptions.length === 0 ? (
                  <option value="">No schools</option>
                ) : (
                  schoolOptions.map((school) => (
                    <option
                      key={`${school.id ?? school.schoolCode}-${school.name}`}
                      value={school.id ? String(school.id) : ""}
                    >
                      {school.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <button className="portal-profile-open-button" type="submit">
              Open Profile
            </button>
          </form>
        </section>

        <section className="card portal-profile-account-card">
          <div className="portal-profile-account-head">
            <span className="portal-profile-account-icon" aria-hidden>
              {getProfileIcon(level)}
            </span>
            <div>
              <p className="portal-profile-account-kicker">Account</p>
              <h2>{profileTitle}</h2>
            </div>
          </div>

          <div className="portal-profile-meta-grid">
            {metadataItems.map((item) => (
              <article key={item.label} className="portal-profile-meta-item">
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="card portal-profile-notice">
          <span className="portal-profile-notice-icon" aria-hidden>
            ✓
          </span>
          <p>{duplicateNotice}</p>
        </section>

        {visibleEntryActions.length > 0 ? (
          <section className="card portal-profile-entry-card">
            <div className="portal-profile-links-header">
              <h3>Data Entry Actions</h3>
              <p>Launch forms directly from this profile workspace.</p>
            </div>
            <div className="portal-profile-entry-grid">
              {visibleEntryActions.map((item) => (
                <Link key={`${item.label}-${item.href}`} href={item.href} className="portal-profile-entry-action">
                  <span aria-hidden>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="card portal-profile-links-card">
          <div className="portal-profile-links-header">
            <h3>Related List Quick Links</h3>
            <p>Open implementation records and report-profile links from this {profileSubtitle.toLowerCase()} profile.</p>
          </div>
          <div className="portal-profile-links-grid">
            {visibleLinks.map((item) => (
              <Link key={`${item.label}-${item.href}`} href={item.href} className="portal-profile-link">
                <span className="portal-profile-link-icon" aria-hidden>
                  {item.icon}
                </span>
                <span className="portal-profile-link-label">
                  <span>{item.label}</span>
                  <strong>({item.count.toLocaleString()})</strong>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
