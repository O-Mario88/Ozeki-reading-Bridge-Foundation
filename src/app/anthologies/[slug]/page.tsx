import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAnthologyBySlug, listPublishedStoriesByAnthology } from "@/lib/db";
import { AnthologyPdfViewer } from "@/components/AnthologyPdfViewer";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const { slug } = await params;
    const anthology = getAnthologyBySlug(slug);

    if (!anthology) {
        return { title: "Anthology Not Found" };
    }

    return {
        title: `${anthology.title} — 1001 Story Library`,
        description: `Read the ${anthology.title} anthology published by the Ozeki Reading Bridge Foundation.`,
        openGraph: {
            title: anthology.title,
            description: `Read the ${anthology.edition ? anthology.edition + " " : ""}anthology from ${anthology.schoolName || anthology.districtScope || "Uganda"}.`,
            type: "article",
            images: anthology.coverImagePath ? [{ url: anthology.coverImagePath }] : [],
        },
    };
}

export default async function AnthologyPage({ params }: { params: Params }) {
    const { slug } = await params;
    const anthology = getAnthologyBySlug(slug);

    if (!anthology) {
        notFound();
    }

    const stories = listPublishedStoriesByAnthology(anthology.id);

    return (
        <>
            <section className="page-hero" style={{ paddingBottom: "2rem" }}>
                <div className="container">
                    <nav className="impact-dash-breadcrumb" aria-label="Breadcrumb">
                        <Link href="/stories">1001 Story Library</Link>
                        <span aria-hidden>›</span>
                        <span>{anthology.title}</span>
                    </nav>

                    <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", marginTop: "2rem", flexWrap: "wrap" }}>
                        {anthology.coverImagePath && (
                            <img
                                src={anthology.coverImagePath}
                                alt=""
                                style={{ width: "200px", borderRadius: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
                            />
                        )}
                        <div style={{ flex: 1, minWidth: "300px" }}>
                            {anthology.featured && (
                                <span style={{ display: "inline-block", marginBottom: "0.5rem", padding: "0.2rem 0.6rem", backgroundColor: "var(--md-sys-color-primary)", color: "var(--md-sys-color-on-primary)", borderRadius: "99px", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase" }}>
                                    ⭐ Featured Anthology
                                </span>
                            )}
                            <h1 style={{ margin: "0 0 0.5rem 0" }}>{anthology.title}</h1>
                            <p style={{ fontSize: "1.2rem", margin: "0 0 1rem 0", opacity: 0.9 }}>
                                {anthology.edition && <span style={{ fontWeight: 600 }}>{anthology.edition} • </span>}
                                {anthology.scopeType === "school" ? anthology.schoolName : `${anthology.districtScope || anthology.scopeType} Anthology`}
                                {anthology.pdfPageCount > 0 && ` • ${anthology.pdfPageCount} pages`}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section" style={{ backgroundColor: "var(--md-sys-color-surface-container-low)" }}>
                <div className="container" style={{ maxWidth: "1000px" }}>
                    <AnthologyPdfViewer
                        anthology={anthology}
                        stories={stories}
                    />
                </div>
            </section>
        </>
    );
}
