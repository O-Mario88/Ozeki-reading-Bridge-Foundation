"use client";

import { useState, useEffect } from "react";
import type { AnthologyRecord, PublishedStory } from "@/lib/types";

interface Props {
    anthology: AnthologyRecord;
    stories: PublishedStory[];
    initialPage?: number;
}

export function AnthologyPdfViewer({ anthology, stories, initialPage = 1 }: Props) {
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        if (anthology.pdfStoredPath) {
            // Force reload iframe source when page changes for built-in PDF viewers
            setPdfUrl(`${anthology.pdfStoredPath}#page=${currentPage}&view=FitH`);
        }
    }, [anthology.pdfStoredPath, currentPage]);

    if (!anthology.pdfStoredPath) {
        return (
            <div className="card" style={{ padding: "4rem 2rem", textAlign: "center", backgroundColor: "var(--md-sys-color-surface-container-low)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📄</div>
                <h3>PDF Coming Soon</h3>
                <p style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
                    The PDF for this anthology is being processed and will be available shortly.
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="card" style={{ padding: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Jump to Story</h2>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--md-sys-color-on-surface-variant)" }}>
                        Select a specific student's story to read
                    </p>
                </div>
                <div style={{ flexGrow: 1, minWidth: "250px", maxWidth: "400px" }}>
                    <select
                        className="story-search-input"
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem" }}
                    >
                        <option value={1}>Anthology Cover / Index (Page 1)</option>
                        {Array.from(new Set(stories.map(s => s.pageStart))).sort((a, b) => a - b).map(pageStart => {
                            const storiesOnPage = stories.filter(s => s.pageStart === pageStart);
                            const label = storiesOnPage.map(s => `"${s.title}" by ${s.publicAuthorDisplay}`).join(" & ");
                            return (
                                <option key={pageStart} value={pageStart}>
                                    Page {pageStart}: {label.length > 50 ? label.slice(0, 50) + "..." : label}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            <div className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column", backgroundColor: "#333", borderRadius: "8px", height: "85vh", minHeight: "600px" }}>
                {pdfUrl ? (
                    <iframe
                        key={pdfUrl} // key forces remount to ensure PDF viewer jumps to new page hash
                        src={pdfUrl}
                        width="100%"
                        height="100%"
                        style={{ border: "none", flexGrow: 1, backgroundColor: "white" }}
                        title={`${anthology.title} PDF Document`}
                        loading="lazy"
                    />
                ) : null}
            </div>
        </div>
    );
}
