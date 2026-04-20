import { ImageResponse } from "next/og";
import { organizationName, tagline } from "@/lib/content";

export const runtime = "edge";
export const alt = `${organizationName} — Phonics, assessments, and coaching for Uganda's schools`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #f97316 160%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 28,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#fb923c",
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background: "#fb923c",
            }}
          />
          Reading outcomes for Uganda
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1.5,
            }}
          >
            {organizationName}
          </div>
          <div
            style={{
              fontSize: 34,
              lineHeight: 1.3,
              color: "#e2e8f0",
              maxWidth: 960,
            }}
          >
            {tagline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.18)",
            paddingTop: 24,
            fontSize: 26,
          }}
        >
          <div style={{ color: "#f8fafc", fontWeight: 600 }}>
            Phonics · Assessments · Coaching · Decodables
          </div>
          <div style={{ color: "#fb923c", fontWeight: 700 }}>ozekiread.org</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
