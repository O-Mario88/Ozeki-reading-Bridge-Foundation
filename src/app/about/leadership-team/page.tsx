/* eslint-disable @next/next/no-img-element */

import { Users } from "lucide-react";
import type { PortalLeadershipTeamMemberRecord } from "@/lib/types";
import { listPortalLeadershipTeamMembersPostgres } from "@/lib/server/postgres/repositories/public-content";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CTAStrip } from "@/components/public/CTAStrip";

export const metadata = {
  title: "Meet The Leadership Team | Ozeki Reading Bridge Foundation",
  description:
    "Meet the dedicated team behind Ozeki Reading Bridge Foundation — the people driving literacy implementation across schools and communities.",
};

export const revalidate = 300;

const accentColors = [
  { bg: "#006b61", shape: "#1dc9ba" },
  { bg: "#fe8b5c", shape: "#ffb899" },
  { bg: "#1dc9ba", shape: "#006b61" },
  { bg: "#FA7D15", shape: "#fec89a" },
  { bg: "#2563eb", shape: "#93c5fd" },
  { bg: "#006b61", shape: "#fe8b5c" },
];

function ProfileCard({
  profile,
  index,
}: {
  profile: PortalLeadershipTeamMemberRecord;
  index: number;
}) {
  const color = accentColors[index % accentColors.length];
  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="leadership-card group relative flex flex-col items-center">
      {/* Accent shape behind the portrait */}
      <div className="leadership-card__accent" aria-hidden="true">
        <div
          className="absolute w-40 h-40 rounded-3xl opacity-20 -rotate-12 -top-2 -left-2 transition-transform duration-500 group-hover:rotate-[-6deg]"
          style={{ backgroundColor: color.shape }}
        />
        <div
          className="absolute w-36 h-36 rounded-3xl opacity-15 rotate-12 top-1 left-3 transition-transform duration-500 group-hover:rotate-[6deg]"
          style={{ backgroundColor: color.bg }}
        />
      </div>

      {/* Floating circular portrait */}
      <div className="relative z-10 mb-[-3.5rem]">
        {profile.photoFileName ? (
          <img
            src={`/api/about/team/${profile.id}/photo?v=${encodeURIComponent(profile.updatedAt)}`}
            alt={`${profile.name}, ${profile.role}`}
            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="w-32 h-32 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-3xl font-extrabold text-white tracking-tight"
            style={{ background: `linear-gradient(135deg, ${color.bg}, ${color.shape})` }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="relative z-0 bg-white rounded-2xl shadow-soft pt-16 pb-8 px-6 text-center w-full transition-shadow duration-300 group-hover:shadow-panel">
        <h3 className="text-xl font-bold text-brand-primary mb-1 leading-snug">
          {profile.name}
        </h3>
        <p
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: color.bg }}
        >
          {profile.role}
        </p>
        {profile.about && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-4">
            {profile.about}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function LeadershipTeamPage() {
  let profiles: PortalLeadershipTeamMemberRecord[] = [];
  try {
    profiles = await listPortalLeadershipTeamMembersPostgres();
  } catch {
    // Database table may not exist yet — show empty state gracefully
  }

  const hasProfiles = profiles.length > 0;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-grow pt-[72px] md:pt-20">
        {/* Section heading */}
        <section className="relative overflow-hidden bg-brand-background pt-24 pb-10 md:pt-32 md:pb-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#006b61]/10 via-brand-background to-brand-background pointer-events-none" />
          <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#006b61]/10 text-[#006b61] font-bold text-sm mb-6 shadow-sm border border-[#006b61]/20">
              <Users className="w-4 h-4" /> Our People
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-brand-primary tracking-tight leading-tight mb-6">
              Meet The Leadership Team
            </h1>
            <div className="w-24 h-1.5 bg-[#006b61] mx-auto rounded-full mb-6" />
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Dedicated professionals committed to transforming literacy outcomes across schools and communities.
            </p>
          </div>
        </section>

        {/* Team grid */}
        {!hasProfiles ? (
          <section className="py-20 bg-brand-background">
            <div className="max-w-4xl mx-auto text-center px-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-3xl font-bold text-brand-primary mb-4">Leadership profiles will appear here</h2>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                Once records are published from the administrative staff portal, the leadership directory will populate automatically.
              </p>
            </div>
          </section>
        ) : (
          <section className="py-16 md:py-24 bg-brand-background">
            <div className="container mx-auto px-4 md:px-6 max-w-7xl">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-20">
                {profiles.map((profile, index) => (
                  <ProfileCard key={profile.id} profile={profile} index={index} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <CTAStrip
          heading="Discover our history"
          subheading="Learn about where Ozeki began and how our mission has evolved over the years."
          primaryButtonText="View Our Story"
          primaryButtonHref="/about/our-story"
          primaryButtonColor="bg-[#006b61]"
          primaryButtonHoverColor="hover:bg-[#006b61]/90"
          secondaryButtonText="Back to About"
          secondaryButtonHref="/about"
          theme="light"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
