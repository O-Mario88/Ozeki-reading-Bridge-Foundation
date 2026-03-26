/* eslint-disable @next/next/no-img-element */

import { Users, ShieldCheck, HeartPulse } from "lucide-react";
import type { PortalLeadershipTeamMemberRecord } from "@/lib/types";
import { listPortalLeadershipTeamMembersPostgres } from "@/lib/server/postgres/repositories/public-content";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";

export const metadata = {
  title: "Leadership Team | Ozeki Reading Bridge Foundation",
  description:
    "Meet the board, staff, and volunteers guiding literacy implementation at Ozeki Reading Bridge Foundation.",
};

export const revalidate = 300;

type Profile = PortalLeadershipTeamMemberRecord;

function ProfileCard({ profile }: { profile: Profile }) {
  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <PremiumCard className="flex flex-col h-full bg-white overflow-hidden p-0 rounded-3xl group" withHover>
      {/* Photo Header */}
      <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
        {profile.photoFileName ? (
          <img
            src={`/api/about/team/${profile.id}/photo?v=${encodeURIComponent(profile.updatedAt)}`}
            alt={profile.photoAlt || `${profile.name} profile photo`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#006b61]/5" aria-hidden="true">
            <span className="text-4xl font-extrabold text-[#006b61]/20 tracking-tighter">{initials}</span>
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-6 md:p-8 flex-grow flex flex-col">
        <h3 className="text-2xl font-bold text-brand-primary mb-1">{profile.name}</h3>
        <p className="text-[#006b61] font-semibold text-sm uppercase tracking-wide mb-4">
          {profile.role}
        </p>

        <p className="text-gray-600 leading-relaxed mb-6 text-sm flex-grow">
          {profile.biography}
        </p>

        {/* Meta Attributes */}
        <div className="pt-5 border-t border-gray-100 mt-auto space-y-3">
          {profile.background && (
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Background</span>
              <span className="text-sm text-gray-700 font-medium">{profile.background}</span>
            </div>
          )}
          {profile.career && (
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Career</span>
              <span className="text-sm text-gray-700 font-medium">{profile.career}</span>
            </div>
          )}
        </div>
      </div>
    </PremiumCard>
  );
}

export default async function LeadershipTeamPage() {
  let profiles: Profile[] = [];
  try {
    profiles = await listPortalLeadershipTeamMembersPostgres();
  } catch {
    // Database table may not exist yet — show empty state gracefully
  }

  const boardMembers = profiles.filter((profile) => profile.section === "board");
  const staffTeam = profiles.filter((profile) => profile.section === "staff");
  const volunteerTeam = profiles.filter((profile) => profile.section === "volunteer");
  const hasProfiles = profiles.length > 0;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-grow pt-[72px] md:pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-32 border-b border-gray-100">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#006b61]/10 via-brand-background to-brand-background pointer-events-none" />
          <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FA7D15]/10 text-[#FA7D15] font-bold text-sm mb-6 shadow-sm border border-[#FA7D15]/20">
              <Users className="w-4 h-4" /> About Us
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-brand-primary tracking-tight leading-tight mb-8">
              Leadership Team
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-6">
              Meet the dedicated board members, core staff, and volunteers committed to driving our literacy implementation forward.
            </p>
          </div>
        </section>

        {!hasProfiles ? (
          <SectionWrapper theme="light">
            <div className="max-w-4xl mx-auto text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-3xl font-bold text-brand-primary mb-4">Leadership profiles will appear here</h2>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                Once records are published from the administrative staff portal, the leadership directory will populate automatically.
              </p>
            </div>
          </SectionWrapper>
        ) : (
          <>
            {/* Board Governance */}
            {boardMembers.length > 0 && (
              <SectionWrapper theme="light" id="board">
                <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#006b61]/10 text-[#006b61] mb-6">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-4xl font-bold text-brand-primary mb-4">Board Governance</h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                      Providing strategic accountability, oversight, and guidance to ensure organizational integrity and mission focus.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {boardMembers.map((profile) => (
                      <ProfileCard key={profile.id} profile={profile} />
                    ))}
                  </div>
                </div>
              </SectionWrapper>
            )}

            {/* Core Staff Team */}
            {staffTeam.length > 0 && (
              <SectionWrapper theme="off-white" id="staff">
                <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FA7D15]/10 text-[#FA7D15] mb-6">
                      <HeartPulse className="w-8 h-8" />
                    </div>
                    <h2 className="text-4xl font-bold text-brand-primary mb-4">Core Staff Team</h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                      The professionals designing, managing, and evaluating our programs on the ground every single day.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {staffTeam.map((profile) => (
                      <ProfileCard key={profile.id} profile={profile} />
                    ))}
                  </div>
                </div>
              </SectionWrapper>
            )}

            {/* Volunteers */}
            {volunteerTeam.length > 0 && (
              <SectionWrapper theme="light" id="volunteers">
                <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-brand-primary mb-4">Volunteer Team</h2>
                    <div className="w-24 h-1 bg-[#006b61]/20 mx-auto rounded-full" />
                  </div>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {volunteerTeam.map((profile) => (
                      <ProfileCard key={profile.id} profile={profile} />
                    ))}
                  </div>
                </div>
              </SectionWrapper>
            )}
          </>
        )}

        {/* Global CTA */}
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
