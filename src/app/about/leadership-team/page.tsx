import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import type { PortalLeadershipTeamMemberRecord } from "@/lib/types";
import { listPortalLeadershipTeamMembersPostgres } from "@/lib/server/postgres/repositories/public-content";
import styles from "./page.module.css";

export const metadata = {
  title: "Leadership Team",
  description:
    "Meet the board, staff, and volunteers guiding literacy implementation at Ozeki Reading Bridge Foundation.",
};

export const dynamic = "force-dynamic";

type Profile = PortalLeadershipTeamMemberRecord;

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
        {profile.photoFileName ? (
          <img
            src={`/api/about/team/${profile.id}/photo?v=${encodeURIComponent(profile.updatedAt)}`}
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

export default async function LeadershipTeamPage() {
  const profiles = await listPortalLeadershipTeamMembersPostgres();
  const boardMembers = profiles.filter((profile) => profile.section === "board");
  const staffTeam = profiles.filter((profile) => profile.section === "staff");
  const volunteerTeam = profiles.filter((profile) => profile.section === "volunteer");
  const hasProfiles = profiles.length > 0;

  return (
    <>
      <PageHero
        kicker="About"
        title="Leadership Team"
        description="Board, staff, and volunteers who guide literacy implementation quality and accountability."
      />

      {!hasProfiles ? (
        <section className="section">
          <div className="container">
            <article className="card">
              <h2>Leadership profiles will appear here</h2>
              <p>
                Publish leadership team records from the staff portal to show them on this
                page.
              </p>
            </article>
          </div>
        </section>
      ) : (
        <>
          {boardMembers.length > 0 ? (
            <section className="section">
              <div className="container">
                <div className="section-head">
                  <p className="kicker">Board Members</p>
                  <h2>Board Governance</h2>
                </div>
                <div className={styles.profileGrid}>
                  {boardMembers.map((profile) => (
                    <ProfileCard key={profile.id} profile={profile} />
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {staffTeam.length > 0 ? (
            <section className="section bg-surface-container" style={{ backgroundColor: "var(--md-sys-color-surface-container)" }}>
              <div className="container">
                <div className="section-head">
                  <p className="kicker">Staff</p>
                  <h2>Core Staff Team</h2>
                </div>
                <div className={styles.profileGrid}>
                  {staffTeam.map((profile) => (
                    <ProfileCard key={profile.id} profile={profile} />
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {volunteerTeam.length > 0 ? (
            <section className="section">
              <div className="container">
                <div className="section-head">
                  <p className="kicker">Volunteers</p>
                  <h2>Volunteer Team</h2>
                </div>
                <div className={styles.profileGrid}>
                  {volunteerTeam.map((profile) => (
                    <ProfileCard key={profile.id} profile={profile} />
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}

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
