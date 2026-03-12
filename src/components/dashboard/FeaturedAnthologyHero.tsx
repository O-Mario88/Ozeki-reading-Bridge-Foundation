import Link from "next/link";
import type { AnthologyRecord } from "@/lib/types";

export function FeaturedAnthologyHero({ anthology }: { anthology: AnthologyRecord }) {
    if (!anthology) return null;

    return (
        <section className="section" style={{ backgroundColor: "var(--md-sys-color-primary-container)", padding: "4rem 0" }}>
            <div className="container">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div style={{
                            display: "inline-block",
                            padding: "0.25rem 0.75rem",
                            backgroundColor: "var(--md-sys-color-on-primary-container)",
                            color: "var(--md-sys-color-primary-container)",
                            borderRadius: "99px",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            width: "max-content"
                        }}>
                            ⭐ Featured Anthology
                        </div>
                        <h2 style={{ fontSize: "2.5rem", margin: 0, color: "var(--md-sys-color-on-primary-container)" }}>
                            {anthology.title}
                        </h2>
                        <p style={{ fontSize: "1.1rem", color: "var(--md-sys-color-on-primary-container)", opacity: 0.9 }}>
                            {anthology.edition && <span style={{ fontWeight: 600 }}>{anthology.edition} • </span>}
                            {anthology.scopeType === "school" ? anthology.schoolName : `${anthology.districtScope || anthology.scopeType} Anthology`}
                            {anthology.pdfPageCount > 0 && ` • ${anthology.pdfPageCount} pages`}
                        </p>
                        <div style={{ marginTop: "1rem" }}>
                            <Link href={`/anthologies/${anthology.slug}`} className="button" style={{ fontSize: "1.1rem", padding: "0.75rem 1.5rem" }}>
                                Read Anthology
                            </Link>
                        </div>
                    </div>
                    <div>
                        {anthology.coverImagePath ? (
                            <img
                                src={anthology.coverImagePath}
                                alt={`Cover of ${anthology.title}`}
                                style={{
                                    width: "100%",
                                    maxWidth: "400px",
                                    borderRadius: "1rem",
                                    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                                    transform: "rotate(2deg)"
                                }}
                            />
                        ) : (
                            <div style={{
                                width: "100%",
                                maxWidth: "400px",
                                aspectRatio: "3/4",
                                backgroundColor: "rgba(255,255,255,0.5)",
                                borderRadius: "1rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "4rem",
                                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                                transform: "rotate(2deg)"
                            }}>
                                📚
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
