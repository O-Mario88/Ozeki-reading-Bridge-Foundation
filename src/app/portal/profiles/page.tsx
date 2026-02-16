import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";
import { getImpactExplorerProfiles } from "@/lib/db";
import { requirePortalUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profiles Explorer",
  description:
    "Backend profile explorer for country, region, district, and school with direct links to all data entry and tracking modules.",
};

type ProfileLevel = "country" | "region" | "district" | "school";

type QuickLinkItem = {
  label: string;
  count: number;
  href: string;
  icon: string;
  entryAction?: boolean;
  staffOnly?: boolean;
  adminOnly?: boolean;
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
  if (normalized === "district") return "district";
  return "school";
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

function deriveAggregateStatus(statusCounts: {
  onTrack: number;
  needsSupport: number;
  highPriority: number;
}) {
  if (statusCounts.highPriority > 0) {
    return "High priority";
  }
  if (statusCounts.needsSupport > 0) {
    return "Needs support";
  }
  return "On track";
}

function toProfileHref(nextLevel: ProfileLevel, region: string, district: string, schoolId: number | null) {
  const params = new URLSearchParams();
  params.set("level", nextLevel);
  if (region) params.set("region", region);
  if (district) params.set("district", district);
  if (schoolId) params.set("schoolId", String(schoolId));
  return `/portal/profiles?${params.toString()}`;
}

function getProfileIcon(level: ProfileLevel) {
  if (level === "country") return "UG";
  if (level === "region") return "RG";
  if (level === "district") return "DT";
  return "SC";
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

  const regionOptions = explorer.regions.map((region) => region.region);
  const selectedRegion = regionOptions.includes(normalizeValue(filters.region))
    ? normalizeValue(filters.region)
    : (regionOptions[0] ?? "");

  const districtOptions = explorer.districts.filter((district) =>
    selectedRegion ? district.region === selectedRegion : true,
  );
  const districtNames = districtOptions.map((district) => district.district);
  const selectedDistrict = districtNames.includes(normalizeValue(filters.district))
    ? normalizeValue(filters.district)
    : (districtNames[0] ?? "");

  const schoolOptions = explorer.schools.filter((school) => {
    if (level === "region") {
      return selectedRegion ? school.region === selectedRegion : true;
    }
    if (level === "district" || level === "school") {
      return selectedDistrict ? school.district === selectedDistrict : true;
    }
    return true;
  });

  const selectedSchoolId = Number(normalizeValue(filters.schoolId));
  const selectedSchool =
    schoolOptions.find((school) => school.id === selectedSchoolId) ??
    schoolOptions.find((school) => school.id !== null) ??
    schoolOptions[0] ??
    null;
  const selectedDistrictProfile =
    explorer.districts.find((district) => district.district === selectedDistrict) ?? null;
  const selectedRegionProfile =
    explorer.regions.find((region) => region.region === selectedRegion) ?? null;

  const isStaffUser = user.role !== "Volunteer";
  const isAdminUser = user.isAdmin || user.isSuperAdmin;

  let profileTitle = "Uganda Literacy Profile";
  let profileSubtitle = "Country";
  let metadataItems: Array<{ label: string; value: string }> = [];
  let quickLinks: QuickLinkItem[] = [];
  let duplicateNotice = "We found no potential duplicates of this account.";

  if (level === "school" && selectedSchool) {
    profileTitle = `${selectedSchool.name} - ${selectedSchool.district}`;
    profileSubtitle = "School";
    metadataItems = [
      { label: "Country", value: "Uganda" },
      { label: "Region", value: selectedSchool.region },
      { label: "School Status", value: selectedSchool.status },
      { label: "Current Partner Type", value: "Direct School Support" },
      { label: "School Status Date", value: formatDate(selectedSchool.lastActivityDate) },
      { label: "School Code", value: selectedSchool.schoolCode || "Not assigned" },
    ];
    duplicateNotice = "We found no potential duplicates of this Account.";
    quickLinks = [
      {
        label: "New Training",
        count: selectedSchool.trainings,
        href: selectedSchool.id
          ? `/portal/trainings?new=1&schoolId=${selectedSchool.id}`
          : "/portal/trainings",
        icon: "TR",
        entryAction: true,
      },
      {
        label: "New School Visit",
        count: selectedSchool.visits,
        href: selectedSchool.id ? `/portal/visits?new=1&schoolId=${selectedSchool.id}` : "/portal/visits",
        icon: "VS",
        entryAction: true,
      },
      {
        label: "New Assessment",
        count: selectedSchool.assessments,
        href: selectedSchool.id
          ? `/portal/assessments?new=1&schoolId=${selectedSchool.id}`
          : "/portal/assessments",
        icon: "AS",
        entryAction: true,
      },
      {
        label: "New 1001 Story",
        count: selectedSchool.storyActivities,
        href: selectedSchool.id ? `/portal/story?new=1&schoolId=${selectedSchool.id}` : "/portal/story",
        icon: "ST",
        entryAction: true,
      },
      {
        label: "Update School Profile",
        count: 1,
        href: "/portal/schools",
        icon: "SC",
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
      {
        label: "Account History",
        count: selectedSchool.timeline.length,
        href: selectedSchool.id ? `/portal/profiles?level=school&schoolId=${selectedSchool.id}` : "/portal/profiles",
        icon: "AH",
      },
      {
        label: "Contacts",
        count: 1,
        href: "/portal/schools",
        icon: "CT",
        staffOnly: true,
      },
      {
        label: "Trainings",
        count: selectedSchool.trainings,
        href: "/portal/trainings",
        icon: "TR",
      },
      {
        label: "School Visits",
        count: selectedSchool.visits,
        href: "/portal/visits",
        icon: "VS",
      },
      {
        label: "Coaching Cycles",
        count: selectedSchool.coachingCycles,
        href: "/portal/visits",
        icon: "CC",
      },
      {
        label: "Assessments",
        count: selectedSchool.assessments,
        href: "/portal/assessments",
        icon: "AS",
      },
      {
        label: "Training Participants",
        count: selectedSchool.participantsTotal,
        href: "/portal/trainings",
        icon: "TP",
      },
      {
        label: "Teacher Participants",
        count: selectedSchool.participantsTeachers,
        href: "/portal/trainings",
        icon: "TC",
      },
      {
        label: "School Leaders",
        count: selectedSchool.participantsLeaders,
        href: "/portal/trainings",
        icon: "SL",
      },
      {
        label: "Enrollments",
        count: selectedSchool.enrolledLearners,
        href: "/portal/schools",
        icon: "EN",
      },
      {
        label: "Learners Assessed",
        count: selectedSchool.learnersAssessed,
        href: "/portal/assessments",
        icon: "LA",
      },
      {
        label: "1001 Story Activities",
        count: selectedSchool.storyActivities,
        href: "/portal/story",
        icon: "10",
      },
      {
        label: "Stories Published",
        count: selectedSchool.storiesPublished,
        href: "/portal/story",
        icon: "PB",
      },
      {
        label: "Evidence Files",
        count: selectedSchool.evidenceUploads,
        href: "/portal/testimonials",
        icon: "EV",
      },
      {
        label: "Reports",
        count: 1,
        href: "/portal/reports",
        icon: "RP",
        staffOnly: true,
      },
      {
        label: "Data Dashboard",
        count: 1,
        href: "/portal/analytics",
        icon: "DB",
        staffOnly: true,
      },
    ];
  }

  if (level === "district" && selectedDistrictProfile) {
    profileTitle = `${selectedDistrictProfile.district} District Literacy Profile`;
    profileSubtitle = "District";
    metadataItems = [
      { label: "Country", value: "Uganda" },
      { label: "Region", value: selectedDistrictProfile.region },
      { label: "District Status", value: deriveAggregateStatus(selectedDistrictProfile.statusCounts) },
      { label: "Schools Supported", value: selectedDistrictProfile.schoolsSupported.toLocaleString() },
      { label: "Learners Enrolled", value: selectedDistrictProfile.enrolledLearners.toLocaleString() },
      { label: "Learners Assessed", value: selectedDistrictProfile.learnersAssessed.toLocaleString() },
    ];
    quickLinks = [
      { label: "New Training", count: selectedDistrictProfile.trainings, href: "/portal/trainings?new=1", icon: "TR", entryAction: true },
      { label: "New School Visit", count: selectedDistrictProfile.visits, href: "/portal/visits?new=1", icon: "VS", entryAction: true },
      { label: "New Assessment", count: selectedDistrictProfile.assessments, href: "/portal/assessments?new=1", icon: "AS", entryAction: true },
      { label: "New 1001 Story", count: selectedDistrictProfile.storyActivities, href: "/portal/story?new=1", icon: "ST", entryAction: true },
      { label: "New School", count: selectedDistrictProfile.schoolsTotal, href: "/portal/schools", icon: "SC", entryAction: true, staffOnly: true },
      {
        label: "District Schools",
        count: selectedDistrictProfile.schoolsTotal,
        href: `/portal/profiles?level=school&region=${encodeURIComponent(selectedDistrictProfile.region)}&district=${encodeURIComponent(selectedDistrictProfile.district)}`,
        icon: "DS",
      },
      {
        label: "High Priority Schools",
        count: selectedDistrictProfile.statusCounts.highPriority,
        href: `/portal/profiles?level=school&region=${encodeURIComponent(selectedDistrictProfile.region)}&district=${encodeURIComponent(selectedDistrictProfile.district)}`,
        icon: "HP",
      },
      {
        label: "Needs Support Schools",
        count: selectedDistrictProfile.statusCounts.needsSupport,
        href: `/portal/profiles?level=school&region=${encodeURIComponent(selectedDistrictProfile.region)}&district=${encodeURIComponent(selectedDistrictProfile.district)}`,
        icon: "NS",
      },
      { label: "Trainings", count: selectedDistrictProfile.trainings, href: "/portal/trainings", icon: "TR" },
      { label: "School Visits", count: selectedDistrictProfile.visits, href: "/portal/visits", icon: "VS" },
      { label: "Assessments", count: selectedDistrictProfile.assessments, href: "/portal/assessments", icon: "AS" },
      { label: "1001 Story Activities", count: selectedDistrictProfile.storyActivities, href: "/portal/story", icon: "10" },
      { label: "Participants", count: selectedDistrictProfile.participantsTotal, href: "/portal/trainings", icon: "TP" },
      { label: "Learners Assessed", count: selectedDistrictProfile.learnersAssessed, href: "/portal/assessments", icon: "LA" },
      { label: "Stories Published", count: selectedDistrictProfile.storiesPublished, href: "/portal/story", icon: "PB" },
      { label: "Reports", count: 1, href: "/portal/reports", icon: "RP", staffOnly: true },
      { label: "Data Dashboard", count: 1, href: "/portal/analytics", icon: "DB", staffOnly: true },
    ];
  }

  if (level === "region" && selectedRegionProfile) {
    profileTitle = `${selectedRegionProfile.region} Regional Literacy Profile`;
    profileSubtitle = "Region";
    metadataItems = [
      { label: "Country", value: "Uganda" },
      { label: "Region", value: selectedRegionProfile.region },
      { label: "Regional Status", value: deriveAggregateStatus(selectedRegionProfile.statusCounts) },
      {
        label: "Districts Covered",
        value: `${selectedRegionProfile.districtsCovered}/${selectedRegionProfile.districtsTotal}`,
      },
      { label: "Schools Supported", value: selectedRegionProfile.schoolsSupported.toLocaleString() },
      { label: "Learners Assessed", value: selectedRegionProfile.learnersAssessed.toLocaleString() },
    ];
    quickLinks = [
      { label: "New Training", count: selectedRegionProfile.trainings, href: "/portal/trainings?new=1", icon: "TR", entryAction: true },
      { label: "New School Visit", count: selectedRegionProfile.visits, href: "/portal/visits?new=1", icon: "VS", entryAction: true },
      { label: "New Assessment", count: selectedRegionProfile.assessments, href: "/portal/assessments?new=1", icon: "AS", entryAction: true },
      { label: "New 1001 Story", count: selectedRegionProfile.storyActivities, href: "/portal/story?new=1", icon: "ST", entryAction: true },
      { label: "District Profiles", count: selectedRegionProfile.districtsTotal, href: `/portal/profiles?level=district&region=${encodeURIComponent(selectedRegionProfile.region)}`, icon: "DT" },
      { label: "High Priority Schools", count: selectedRegionProfile.statusCounts.highPriority, href: `/portal/profiles?level=district&region=${encodeURIComponent(selectedRegionProfile.region)}`, icon: "HP" },
      { label: "Needs Support Schools", count: selectedRegionProfile.statusCounts.needsSupport, href: `/portal/profiles?level=district&region=${encodeURIComponent(selectedRegionProfile.region)}`, icon: "NS" },
      { label: "Trainings", count: selectedRegionProfile.trainings, href: "/portal/trainings", icon: "TR" },
      { label: "School Visits", count: selectedRegionProfile.visits, href: "/portal/visits", icon: "VS" },
      { label: "Assessments", count: selectedRegionProfile.assessments, href: "/portal/assessments", icon: "AS" },
      { label: "1001 Story Activities", count: selectedRegionProfile.storyActivities, href: "/portal/story", icon: "10" },
      { label: "Participants", count: selectedRegionProfile.participantsTotal, href: "/portal/trainings", icon: "TP" },
      { label: "Learners Assessed", count: selectedRegionProfile.learnersAssessed, href: "/portal/assessments", icon: "LA" },
      { label: "Reports", count: 1, href: "/portal/reports", icon: "RP", staffOnly: true },
      { label: "Data Dashboard", count: 1, href: "/portal/analytics", icon: "DB", staffOnly: true },
    ];
  }

  if (level === "country") {
    profileTitle = "Uganda National Literacy Profile";
    profileSubtitle = "Country";
    metadataItems = [
      { label: "Country", value: explorer.country.country },
      {
        label: "Regions Covered",
        value: `${explorer.country.regionsCovered}/${explorer.country.regionsTotal}`,
      },
      {
        label: "Districts Covered",
        value: `${explorer.country.districtsCovered}/${explorer.country.districtsTotal}`,
      },
      { label: "Schools Supported", value: explorer.country.schoolsSupported.toLocaleString() },
      { label: "Learners Enrolled", value: explorer.country.enrolledLearners.toLocaleString() },
      { label: "Learners Assessed", value: explorer.country.learnersAssessed.toLocaleString() },
    ];
    quickLinks = [
      { label: "New Training", count: explorer.country.trainings, href: "/portal/trainings?new=1", icon: "TR", entryAction: true },
      { label: "New School Visit", count: explorer.country.visits, href: "/portal/visits?new=1", icon: "VS", entryAction: true },
      { label: "New Assessment", count: explorer.country.assessments, href: "/portal/assessments?new=1", icon: "AS", entryAction: true },
      { label: "New 1001 Story", count: explorer.country.storyActivities, href: "/portal/story?new=1", icon: "ST", entryAction: true },
      { label: "Manage Schools", count: explorer.country.schoolsTotal, href: "/portal/schools", icon: "SC", entryAction: true, staffOnly: true },
      { label: "Regional Profiles", count: explorer.country.regionsTotal, href: "/portal/profiles?level=region", icon: "RG" },
      { label: "District Profiles", count: explorer.country.districtsTotal, href: "/portal/profiles?level=district", icon: "DT" },
      { label: "School Profiles", count: explorer.country.schoolsTotal, href: "/portal/profiles?level=school", icon: "SC" },
      { label: "Trainings", count: explorer.country.trainings, href: "/portal/trainings", icon: "TR" },
      { label: "School Visits", count: explorer.country.visits, href: "/portal/visits", icon: "VS" },
      { label: "Assessments", count: explorer.country.assessments, href: "/portal/assessments", icon: "AS" },
      { label: "1001 Story Activities", count: explorer.country.storyActivities, href: "/portal/story", icon: "10" },
      { label: "Participants", count: explorer.country.participantsTotal, href: "/portal/trainings", icon: "TP" },
      { label: "Learners Assessed", count: explorer.country.learnersAssessed, href: "/portal/assessments", icon: "LA" },
      { label: "Resources", count: 1, href: "/portal/resources", icon: "RS", staffOnly: true },
      { label: "Reports", count: 1, href: "/portal/reports", icon: "RP", staffOnly: true },
      { label: "Data Dashboard", count: 1, href: "/portal/analytics", icon: "DB", staffOnly: true },
      { label: "Super Admin", count: 1, href: "/portal/superadmin", icon: "SA", adminOnly: true },
    ];
  }

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
  const selectedSchoolIdForHref = selectedSchool?.id ?? null;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/profiles"
      title="Profiles Explorer"
      description="Backend workspace for volunteers, staff, and admins to enter and review school, district, region, and country data."
      shellClassName="portal-dashboard-shell"
    >
      <div className="portal-grid portal-profile-workspace">
        <section className="card portal-profile-toolbar">
          <div className="portal-profile-level-row">
            <p className="portal-filter-field-label">Explore Profiles</p>
            <div className="portal-profile-level-links">
              <Link
                className={level === "country" ? "portal-profile-level-link active" : "portal-profile-level-link"}
                href={toProfileHref("country", selectedRegion, selectedDistrict, selectedSchoolIdForHref)}
              >
                Country
              </Link>
              <Link
                className={level === "region" ? "portal-profile-level-link active" : "portal-profile-level-link"}
                href={toProfileHref("region", selectedRegion, selectedDistrict, selectedSchoolIdForHref)}
              >
                Region
              </Link>
              <Link
                className={level === "district" ? "portal-profile-level-link active" : "portal-profile-level-link"}
                href={toProfileHref("district", selectedRegion, selectedDistrict, selectedSchoolIdForHref)}
              >
                District
              </Link>
              <Link
                className={level === "school" ? "portal-profile-level-link active" : "portal-profile-level-link"}
                href={toProfileHref("school", selectedRegion, selectedDistrict, selectedSchoolIdForHref)}
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
                {regionOptions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>

            <label className="portal-filter-field">
              <span className="portal-filter-field-label">District</span>
              <select name="district" defaultValue={selectedDistrict}>
                {districtOptions.map((district) => (
                  <option key={district.district} value={district.district}>
                    {district.district}
                  </option>
                ))}
              </select>
            </label>

            <label className="portal-filter-field">
              <span className="portal-filter-field-label">School</span>
              <select
                name="schoolId"
                defaultValue={selectedSchool?.id ? String(selectedSchool.id) : ""}
              >
                {schoolOptions.map((school) => (
                  <option
                    key={`${school.id ?? school.schoolCode}-${school.name}`}
                    value={school.id ? String(school.id) : ""}
                  >
                    {school.name}
                  </option>
                ))}
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
            <p>Open implementation records and evidence from this {profileSubtitle.toLowerCase()} profile.</p>
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
