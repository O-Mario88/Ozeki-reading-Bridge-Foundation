import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import styles from "./page.module.css";

export const metadata = {
  title: "Leadership Team",
  description:
    "Meet the board, staff, and volunteers guiding literacy implementation at Ozeki Reading Bridge Foundation.",
};

type Profile = {
  name: string;
  role: string;
  biography: string;
  background: string;
  career: string;
  photoSrc?: string;
  photoAlt?: string;
};

const boardMembers: Profile[] = [
  {
    name: "Ruth Akena",
    role: "Board Chair",
    biography:
      "Ruth guides board oversight on governance, strategy, and partnership accountability.",
    background:
      "Background in education policy, school system reform, and organizational governance.",
    career:
      "Served in senior advisory roles supporting district education leadership and program quality assurance.",
  },
  {
    name: "David Okello",
    role: "Board Treasurer",
    biography:
      "David supports financial stewardship, transparency controls, and audit-readiness planning.",
    background:
      "Background in finance management, nonprofit controls, and resource accountability.",
    career:
      "Led finance and compliance functions across social-impact programs and grant-funded portfolios.",
  },
  {
    name: "Sarah Nakimuli",
    role: "Board Member, Learning Quality",
    biography:
      "Sarah advises on instructional quality, literacy pedagogy, and program implementation standards.",
    background:
      "Background in teacher development, coaching models, and early grade reading outcomes.",
    career:
      "Worked with school support teams to strengthen classroom instruction and supervision routines.",
  },
  {
    name: "Peter Ochan",
    role: "Board Member, Partnerships",
    biography:
      "Peter supports partner engagement strategy and long-term sustainability planning.",
    background:
      "Background in partnership development, district coordination, and education program scaling.",
    career:
      "Managed multi-stakeholder initiatives linking schools, local government, and development partners.",
  },
];

const staffTeam: Profile[] = [
  {
    name: "Program Lead",
    role: "Program Delivery",
    biography:
      "Leads implementation quality across training, coaching, and school follow-up pathways.",
    background:
      "Background in literacy programming and school-based teacher support.",
    career:
      "Coordinates field teams and ensures implementation standards are sustained across target geographies.",
  },
  {
    name: "MER Lead",
    role: "Monitoring, Evaluation & Reporting",
    biography:
      "Leads data quality, analytics workflows, and partner-ready evidence reporting.",
    background:
      "Background in education measurement, reporting systems, and learning analytics.",
    career:
      "Built reporting systems that track reading outcomes, teaching quality, and implementation coverage.",
  },
  {
    name: "Coaching Lead",
    role: "Teacher Coaching",
    biography:
      "Guides coaching standards for classroom observation, feedback, and follow-up action planning.",
    background:
      "Background in literacy instruction and instructional coaching.",
    career:
      "Supported school teams to move from one-off training to sustained classroom routines.",
  },
];

const volunteerTeam: Profile[] = [
  {
    name: "Community Literacy Volunteer Team",
    role: "Reading Support",
    biography:
      "Supports reading practice sessions and learner motivation activities with schools.",
    background:
      "Background in community literacy engagement and learner support.",
    career:
      "Contributes to reading clubs, termly activities, and school-community literacy events.",
  },
  {
    name: "Data Volunteers",
    role: "Field Data Support",
    biography:
      "Supports data completeness checks and record follow-up during implementation cycles.",
    background:
      "Background in data entry, quality checks, and field coordination.",
    career:
      "Assists MER teams to keep records current for dashboards and partner reporting.",
  },
];

function ProfileCard({ profile }: { profile: Profile }) {
  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <article className={styles.profileCard}>
      <div className={styles.profilePhotoWrap}>
        {profile.photoSrc ? (
          <img
            src={profile.photoSrc}
            alt={profile.photoAlt || `${profile.name} profile photo`}
            className={styles.profilePhoto}
            loading="lazy"
          />
        ) : (
          <div className={styles.profilePhotoFallback} aria-hidden="true">
            <span>{initials}</span>
          </div>
        )}
      </div>
      <div className={styles.profileContent}>
        <h3 className={styles.profileName}>{profile.name}</h3>
        <p className={styles.profileRole}>{profile.role}</p>
        <p className={styles.profileBio}>{profile.biography}</p>
        <p className={styles.profileMeta}>
          <strong>Background:</strong> {profile.background}
        </p>
        <p className={styles.profileMeta}>
          <strong>Career:</strong> {profile.career}
        </p>
      </div>
    </article>
  );
}

export default function LeadershipTeamPage() {
  return (
    <>
      <PageHero
        kicker="About"
        title="Leadership Team"
        description="Board, staff, and volunteers who guide literacy implementation quality and accountability."
      />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="kicker">Board Members</p>
            <h2>Board Governance</h2>
          </div>
          <div className={styles.profileGrid}>
            {boardMembers.map((profile) => (
              <ProfileCard key={profile.name} profile={profile} />
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-surface-container" style={{ backgroundColor: "var(--md-sys-color-surface-container)" }}>
        <div className="container">
          <div className="section-head">
            <p className="kicker">Staff</p>
            <h2>Core Staff Team</h2>
          </div>
          <div className={styles.profileGrid}>
            {staffTeam.map((profile) => (
              <ProfileCard key={profile.name} profile={profile} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="kicker">Volunteers</p>
            <h2>Volunteer Team</h2>
          </div>
          <div className={styles.profileGrid}>
            {volunteerTeam.map((profile) => (
              <ProfileCard key={profile.name} profile={profile} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <article className="card">
            <h2>Related pages</h2>
            <div className="action-row">
              <Link className="button button-compact" href="/about">
                Back to About
              </Link>
              <Link className="button button-ghost button-compact" href="/about/our-story">
                Our Story
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
