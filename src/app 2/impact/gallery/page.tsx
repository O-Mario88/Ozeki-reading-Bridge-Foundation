import Link from "next/link";
import { getMediaShowcase } from "@/lib/media-showcase";
import { allUgandaDistricts, inferRegionFromDistrict, ugandaRegions } from "@/lib/uganda-locations";

export const metadata = {
  title: "Impact Gallery",
  description:
    "Verified photos from trainings, coaching, and assessments—captioned with location and date (with consent).",
};

export const dynamic = "force-dynamic";

function normalizeValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

type ActivityType = "Training" | "Coaching" | "Assessments" | "Materials" | "Story Project";

function inferActivityType(caption: string, kind: "photo" | "video"): ActivityType {
  const text = caption.toLowerCase();
  if (text.includes("coach")) return "Coaching";
  if (text.includes("assessment")) return "Assessments";
  if (text.includes("story")) return "Story Project";
  if (text.includes("material") || text.includes("reader")) return "Materials";
  if (kind === "video") return "Coaching";
  return "Training";
}

function inferDistrict(caption: string) {
  const lower = caption.toLowerCase();
  return allUgandaDistricts.find((district) => lower.includes(district.toLowerCase())) ?? null;
}

function inferYear(caption: string) {
  const matched = caption.match(/(20\d{2})/);
  return matched?.[1] ?? "Unspecified";
}

function toYouTubeWatchUrl(embedUrl: string | null, videoId: string | null) {
  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  if (!embedUrl) {
    return "https://www.youtube.com/@ozekiRead";
  }
  const matched = embedUrl.match(/\/embed\/([^?&/]+)/i);
  if (matched?.[1]) {
    return `https://www.youtube.com/watch?v=${matched[1]}`;
  }
  return "https://www.youtube.com/@ozekiRead";
}

export default async function ImpactGalleryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selectedYear = normalizeValue(params.year);
  const selectedRegion = normalizeValue(params.region);
  const selectedActivity = normalizeValue(params.activity);

  const mediaShowcase = await getMediaShowcase();
  const items = mediaShowcase.featuredItems.map((item) => {
    const district = inferDistrict(item.caption);
    const region = district ? inferRegionFromDistrict(district) : null;
    return {
      ...item,
      activity: inferActivityType(item.caption, item.kind),
      district,
      region,
      year: inferYear(item.caption),
    };
  });

  const years = [...new Set(items.map((item) => item.year))].sort((a, b) => b.localeCompare(a));
  const activities: ActivityType[] = ["Training", "Coaching", "Assessments", "Materials", "Story Project"];

  const filtered = items.filter((item) => {
    const yearOk = !selectedYear || selectedYear === item.year;
    const regionOk = !selectedRegion || selectedRegion === item.region;
    const activityOk = !selectedActivity || selectedActivity === item.activity;
    return yearOk && regionOk && activityOk;
  });

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Impact</p>
          <h1>Impact Gallery</h1>
          <p>
            Verified photos and videos from trainings, coaching, and assessments,
            captioned with location and date (with consent).
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container card impact-filter-card">
          <form method="GET" className="filters impact-filter-grid">
            <label>
              <span>Year</span>
              <select name="year" defaultValue={selectedYear}>
                <option value="">All years</option>
                {years.map((year) => (
                  <option value={year} key={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Region</span>
              <select name="region" defaultValue={selectedRegion}>
                <option value="">All regions</option>
                {ugandaRegions.map((region) => (
                  <option value={region.region} key={region.region}>
                    {region.region}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Activity type</span>
              <select name="activity" defaultValue={selectedActivity}>
                <option value="">All activities</option>
                {activities.map((activity) => (
                  <option value={activity} key={activity}>
                    {activity}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="button">
              Apply filters
            </button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="container media-showcase-grid">
          {filtered.map((item) => (
            <article className={`card media-showcase-card ${item.kind}`} key={item.id}>
              <div className="media-showcase-asset">
                {item.kind === "photo" ? (
                  <img src={item.url} alt={item.alt} loading="lazy" decoding="async" />
                ) : (
                  <a
                    className="media-showcase-thumbnail-button"
                    href={toYouTubeWatchUrl(item.youtubeEmbedUrl, item.youtubeVideoId)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Watch ${item.alt} on YouTube`}
                  >
                    <img
                      src={
                        item.youtubeThumbnailUrl ||
                        (item.youtubeVideoId
                          ? `https://img.youtube.com/vi/${item.youtubeVideoId}/hqdefault.jpg`
                          : "/images/ozeki-logo.jpg")
                      }
                      alt={item.alt}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="media-showcase-play-overlay">
                      <svg width="16" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M23 7.5A4.5 4.5 0 0 0 19.5 4C16.7 3.5 12 3.5 12 3.5s-4.7 0-7.5.5A4.5 4.5 0 0 0 1 7.5 47 47 0 0 0 .5 12 47 47 0 0 0 1 16.5 4.5 4.5 0 0 0 4.5 20c2.8.5 7.5.5 7.5.5s4.7 0 7.5-.5a4.5 4.5 0 0 0 3.5-3.5A47 47 0 0 0 23.5 12 47 47 0 0 0 23 7.5Z"
                          fill="#FF0000"
                        />
                        <path d="M10 15.5V8.5L16.25 12L10 15.5Z" fill="#fff" />
                      </svg>
                      YouTube
                    </span>
                  </a>
                )}
              </div>
              <div className="media-showcase-content">
                <p className="meta-pill">{item.activity}</p>
                <p className="media-showcase-quote">"{item.quote}"</p>
                <p className="media-showcase-meta">
                  <strong>{item.person}</strong> · {item.role}
                </p>
                <p className="media-showcase-caption">
                  {item.caption}
                  {item.region ? ` · ${item.region}` : ""}
                </p>
              </div>
            </article>
          ))}

          {filtered.length === 0 ? (
            <article className="card media-showcase-empty">
              <h3>No media found for these filters</h3>
              <p>Adjust your filter options and try again.</p>
            </article>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <p className="meta-line">
            This gallery shows implementation evidence and is published with consent-focused safeguards.
          </p>
          <div className="action-row">
            <Link className="button" href="/partner">
              Partner With Us
            </Link>
            <Link className="inline-download-link" href="/donor-pack">
              Download Donor Pack
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
