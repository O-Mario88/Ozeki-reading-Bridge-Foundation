import Image from "next/image";
import Link from "next/link";
import { isPostgresConfigured } from "@/lib/server/postgres/client";
import { listImpactGalleryEntriesPostgres } from "@/lib/server/postgres/repositories/impact-gallery";
import type { ImpactGalleryEntryRecord } from "@/lib/server/postgres/repositories/impact-gallery";
import { PageHero } from "@/components/public/PageHero";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { CTAStrip } from "@/components/public/CTAStrip";

export const revalidate = 300;

export const metadata = {
  title: "Evidence Gallery — Ozeki Reading Bridge Foundation",
  description:
    "Photos and testimonials from literacy training sessions, school coaching visits, and learner assessment events across Uganda.",
};

export default async function ImpactGalleryPage() {
  let entries: ImpactGalleryEntryRecord[] = [];

  if (isPostgresConfigured()) {
    try {
      entries = await listImpactGalleryEntriesPostgres(200);
    } catch (error) {
      console.error("Failed to load impact gallery entries.", error);
    }
  }

  return (
    <>
      <PageHero
        tagline="Field evidence"
        title="Evidence Gallery"
        subtitle="Photos and testimonials from our teacher training sessions, coaching visits, and learner assessments across Uganda."
        imageSrc="/photos/20.jpeg"
      />

      <SectionWrapper theme="charius-beige">
        {entries.length > 0 ? (
          <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100"
              >
                {entry.imageUrl ? (
                  <div className="relative aspect-[4/3] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.imageUrl}
                      alt={`${entry.activityType} — ${entry.district}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : null}

                <div className="p-6 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="px-3 py-1 bg-[#006b61]/10 text-[#006b61] rounded-full">
                      {entry.activityType}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {entry.district}
                    </span>
                  </div>

                  {entry.quoteText ? (
                    <blockquote className="text-gray-600 text-[15px] leading-relaxed italic">
                      &ldquo;{entry.quoteText}&rdquo;
                    </blockquote>
                  ) : null}

                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-[#006b61]/10 text-[#006b61] flex items-center justify-center text-sm font-bold">
                      {entry.personName?.[0] || "O"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#111]">{entry.personName}</p>
                      <p className="text-xs text-gray-500">{entry.personRole} · {entry.recordedYear}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-[#006b61]/10 flex items-center justify-center">
              <span className="text-3xl">📸</span>
            </div>
            <h2 className="text-2xl font-bold text-[#111] mb-4">Gallery Coming Soon</h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              Our team is preparing evidence photos from the latest field activities.
              Gallery entries are uploaded by staff through the portal and appear here automatically.
            </p>
            <Link
              href="/impact/case-studies"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-charius-orange text-white font-bold tracking-wide hover:bg-[#e06b0b] transition-colors"
            >
              View Case Studies
            </Link>
          </div>
        )}
      </SectionWrapper>

      <CTAStrip
        heading="Have field evidence to share?"
        subheading="Staff can upload gallery photos through the secure portal."
        primaryButtonText="Access Staff Portal"
        primaryButtonHref="/portal/login"
        theme="charius"
      />
    </>
  );
}
