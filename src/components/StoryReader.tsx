"use client";

import { useState, useEffect, useRef } from "react";
import type { StoryContentBlock } from "@/lib/types";

interface Props {
    title: string;
    author: string;
    blocks: StoryContentBlock[];
    isPreviewMode?: boolean;
    editingBlockIndex?: number | null;
    tempBlockText?: string;
    onStartEditBlock?: (index: number) => void;
    onEditTempBlockText?: (text: string) => void;
    onCancelEditBlock?: () => void;
    onSaveEditBlock?: (index: number) => void;
}

type Theme = "light" | "sepia" | "night";
type FontFamily = "sans" | "serif";

export function StoryReader({
    title, author, blocks,
    isPreviewMode, editingBlockIndex, tempBlockText,
    onStartEditBlock, onEditTempBlockText, onCancelEditBlock, onSaveEditBlock
}: Props) {
    const [theme, setTheme] = useState<Theme>("light");
    const [fontFamily, setFontFamily] = useState<FontFamily>("sans");
    const [fontSize, setFontSize] = useState<number>(18);

    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Load preferences from local storage
    useEffect(() => {
        const storedTheme = localStorage.getItem("reader_theme");
        const storedFont = localStorage.getItem("reader_font");
        const storedSize = localStorage.getItem("reader_fontSize");

        if (storedTheme) setTheme(storedTheme as Theme);
        if (storedFont) setFontFamily(storedFont as FontFamily);
        if (storedSize) setFontSize(Number(storedSize));
    }, []);

    // Save preferences
    useEffect(() => {
        localStorage.setItem("reader_theme", theme);
        localStorage.setItem("reader_font", fontFamily);
        localStorage.setItem("reader_fontSize", String(fontSize));
    }, [theme, fontFamily, fontSize]);

    // Calculate total pages based on scrollWidth
    const calculatePages = () => {
        if (!containerRef.current || !contentRef.current) return;

        // Use column layout width to determine how many "columns" exist
        const containerWidth = containerRef.current.clientWidth;
        const scrollWidth = contentRef.current.scrollWidth;

        // Total pages is scrollWidth divided by the viewport width
        // Multicol layout uses gap, so it exactly aligns to containerWidth increments
        const pages = Math.round(scrollWidth / containerWidth);
        setTotalPages(Math.max(1, pages));

        // Optional: snap to nearest page to avoid stranding
        if (currentPage >= Math.max(1, pages)) {
            setCurrentPage(Math.max(0, pages - 1));
        }
    };

    useEffect(() => {
        calculatePages();
        window.addEventListener("resize", calculatePages);
        // Add a slight delay observation because fonts/images load
        const timeout = setTimeout(calculatePages, 500);
        return () => {
            window.removeEventListener("resize", calculatePages);
            clearTimeout(timeout);
        };
    }, [fontSize, fontFamily, blocks]);

    const nextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(prev => prev - 1);
        }
    };

    // Styling maps
    const themeStyles: Record<Theme, { bg: string, text: string, ui: string }> = {
        light: { bg: "#ffffff", text: "#1a1c1e", ui: "#f0f2f5" },
        sepia: { bg: "#fbf0d9", text: "#5f4b32", ui: "#eadbbf" },
        night: { bg: "#121212", text: "#e0e2e4", ui: "#242424" }
    };

    const activeTheme = themeStyles[theme];

    return (
        <div
            className="story-reader-wrapper"
            style={{
                backgroundColor: activeTheme.bg,
                color: activeTheme.text,
                fontFamily: fontFamily === "sans" ? "var(--font-lexend), sans-serif" : "'Merriweather', serif",
                fontSize: `${fontSize}px`,
                lineHeight: 1.6,
                minHeight: "75vh",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
                borderRadius: "12px",
                border: `1px solid ${activeTheme.ui}`
            }}
        >
            {/* HUD / Navbar */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.5rem",
                borderBottom: `1px solid ${activeTheme.ui}`,
                backgroundColor: activeTheme.bg,
                zIndex: 10
            }}>
                <div style={{ fontSize: "0.9rem", opacity: 0.8, fontWeight: 500, fontFamily: "var(--font-lexend), sans-serif" }}>
                    {title} <span style={{ opacity: 0.5 }}>by {author}</span>
                </div>

                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    {/* Font Size */}
                    <div style={{ display: "flex", background: activeTheme.ui, borderRadius: "6px", padding: "2px" }}>
                        <button onClick={() => setFontSize(f => Math.max(14, f - 2))} style={{ background: "none", border: "none", padding: "0.2rem 0.6rem", cursor: "pointer", color: activeTheme.text }}>A-</button>
                        <button onClick={() => setFontSize(f => Math.min(32, f + 2))} style={{ background: "none", border: "none", padding: "0.2rem 0.6rem", cursor: "pointer", color: activeTheme.text }}>A+</button>
                    </div>

                    {/* Font Family */}
                    <div style={{ display: "flex", background: activeTheme.ui, borderRadius: "6px", padding: "2px" }}>
                        <button onClick={() => setFontFamily("sans")} style={{ background: fontFamily === "sans" ? activeTheme.bg : "none", border: "none", padding: "0.2rem 0.6rem", borderRadius: "4px", cursor: "pointer", color: activeTheme.text, fontFamily: "var(--font-lexend), sans-serif" }}>Sans</button>
                        <button onClick={() => setFontFamily("serif")} style={{ background: fontFamily === "serif" ? activeTheme.bg : "none", border: "none", padding: "0.2rem 0.6rem", borderRadius: "4px", cursor: "pointer", color: activeTheme.text, fontFamily: "'Merriweather', serif" }}>Serif</button>
                    </div>

                    {/* Theme */}
                    <div style={{ display: "flex", gap: "0.3rem" }}>
                        <button onClick={() => setTheme("light")} style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#ffffff", border: theme === "light" ? "2px solid #000" : "1px solid #ccc", cursor: "pointer" }} title="Light Mode" />
                        <button onClick={() => setTheme("sepia")} style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#fbf0d9", border: theme === "sepia" ? "2px solid #5f4b32" : "1px solid #ccc", cursor: "pointer" }} title="Sepia Mode" />
                        <button onClick={() => setTheme("night")} style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#121212", border: theme === "night" ? "2px solid #fff" : "1px solid #333", cursor: "pointer" }} title="Night Mode" />
                    </div>
                </div>
            </div>

            {/* Reader Stage */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    position: "relative",
                    overflow: "hidden", // Hide the horizontal scroll, we will control it via transform
                    padding: "2rem 0",
                    margin: "0 3rem"
                }}
            >
                {/* CSS Multi-column layout container */}
                <div
                    ref={contentRef}
                    style={{
                        columnWidth: `calc(100% - 2rem)`,
                        columnGap: "4rem",
                        columnFill: "auto",
                        height: "100%", // Force paginated columns
                        transform: `translateX(calc(-${currentPage * 100}% - ${currentPage * 4}rem))`,
                        transition: "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                        // we need absolute width 100% logic but css multicolumn handles the expansion naturally
                    }}
                >
                    {blocks.map((block, i) => {
                        const isEditing = editingBlockIndex === i;

                        // Inline Editor Render
                        if (isEditing && isPreviewMode && onEditTempBlockText && onCancelEditBlock && onSaveEditBlock) {
                            return (
                                <div key={i} style={{ marginBottom: "1.2rem", breakInside: "avoid", display: "flex", flexDirection: "column", gap: "0.5rem", background: "var(--md-sys-color-surface-container-high)", padding: "1rem", borderRadius: "8px", zIndex: 100 }}>
                                    <textarea
                                        value={tempBlockText}
                                        onChange={e => onEditTempBlockText(e.target.value)}
                                        rows={4}
                                        style={{ width: "100%", padding: "0.5rem", fontFamily: "inherit", fontSize: "0.9em" }}
                                        autoFocus
                                    />
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <button className="button" onClick={() => onSaveEditBlock(i)}>Save</button>
                                        <button className="button button-ghost" onClick={onCancelEditBlock}>Cancel</button>
                                    </div>
                                </div>
                            );
                        }

                        // Hover Wrapper for Edit Pen
                        const renderEditableWrapper = (content: React.ReactNode, index: number) => {
                            if (!isPreviewMode || !onStartEditBlock) return content;
                            return (
                                <div
                                    key={index}
                                    style={{ position: "relative", display: "inline-block", width: "100%", breakInside: "avoid" }}
                                    className="preview-editable-block"
                                    onMouseEnter={(e) => {
                                        const btn = e.currentTarget.querySelector('.edit-pen-btn') as HTMLElement;
                                        if (btn) btn.style.display = 'block';
                                    }}
                                    onMouseLeave={(e) => {
                                        const btn = e.currentTarget.querySelector('.edit-pen-btn') as HTMLElement;
                                        if (btn) btn.style.display = 'none';
                                    }}
                                >
                                    {content}
                                    <button
                                        className="edit-pen-btn"
                                        onClick={() => onStartEditBlock(index)}
                                        style={{
                                            position: "absolute", top: 0, right: 0,
                                            background: "var(--md-sys-color-primary)", color: "white",
                                            border: "none", borderRadius: "4px", padding: "0.2rem 0.6rem",
                                            cursor: "pointer", fontSize: "0.85rem", transform: "translate(50%, -50%)",
                                            display: "none", zIndex: 20
                                        }}
                                        title="Edit block"
                                    >
                                        ✎
                                    </button>
                                </div>
                            );
                        };

                        if (block.type === "paragraph") {
                            return renderEditableWrapper(
                                <p key={i} style={{
                                    marginBottom: "1.2em",
                                    lineHeight: "1.6"
                                }}>
                                    {block.text}
                                </p>, i
                            );
                        }
                        if (block.type === "heading") {
                            return renderEditableWrapper(
                                <h2 key={i} style={{
                                    fontFamily: "var(--font-nunito), sans-serif",
                                    fontSize: "1.5em",
                                    fontWeight: 800,
                                    marginTop: "1.5em",
                                    marginBottom: "0.8em",
                                    breakAfter: "avoid"
                                }}>
                                    {block.text}
                                </h2>, i
                            );
                        }
                        if (block.type === "illustration") {
                            return renderEditableWrapper(
                                <div key={i} style={{
                                    margin: "2em 0",
                                    textAlign: block.layout === "center" || block.layout === "full" ? "center" : block.layout === "inset-left" ? "left" : "right",
                                    breakAfter: block.keep_with_next ? "avoid" : "auto", // Glue to next text!
                                    float: block.layout === "inset-left" ? "left" : block.layout === "inset-right" ? "right" : "none",
                                    width: block.layout === "inset-left" || block.layout === "inset-right" ? "50%" : "100%",
                                    padding: block.layout === "inset-left" ? "0 1.5rem 1rem 0" : block.layout === "inset-right" ? "0 0 1rem 1.5rem" : "0"
                                }}>
                                    <img
                                        src={block.image_url}
                                        alt={block.alt_text}
                                        loading="lazy"
                                        style={{
                                            maxWidth: "100%",
                                            maxHeight: block.max_height_px ? `${block.max_height_px}px` : "50vh",
                                            borderRadius: "8px",
                                            objectFit: "contain",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                                        }}
                                    />
                                    {block.caption && (
                                        <p style={{ fontSize: "0.85em", opacity: 0.8, marginTop: "0.5rem", fontStyle: "italic" }}>
                                            {block.caption}
                                        </p>
                                    )}
                                </div>, i
                            );
                        }
                        return null;
                    })}
                </div>
            </div>

            {/* Pagination Controls */}
            <div style={{
                position: "absolute", top: "50%", left: "0", right: "0",
                display: "flex", justifyContent: "space-between",
                padding: "0 0.5rem", transform: "translateY(-50%)",
                pointerEvents: "none" // Let clicks pass except on buttons
            }}>
                <button
                    onClick={prevPage}
                    disabled={currentPage === 0}
                    style={{
                        pointerEvents: "auto",
                        width: "40px", height: "40px", borderRadius: "50%",
                        border: "none", background: activeTheme.ui, color: activeTheme.text,
                        cursor: currentPage === 0 ? "default" : "pointer",
                        opacity: currentPage === 0 ? 0 : 0.8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.2rem", boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }}
                >
                    ‹
                </button>
                <button
                    onClick={nextPage}
                    disabled={currentPage >= totalPages - 1}
                    style={{
                        pointerEvents: "auto",
                        width: "40px", height: "40px", borderRadius: "50%",
                        border: "none", background: activeTheme.ui, color: activeTheme.text,
                        cursor: currentPage >= totalPages - 1 ? "default" : "pointer",
                        opacity: currentPage >= totalPages - 1 ? 0 : 0.8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.2rem", boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }}
                >
                    ›
                </button>
            </div>

            {/* Footer Progress */}
            <div style={{
                padding: "1rem",
                textAlign: "center",
                fontSize: "0.85rem",
                opacity: 0.6,
                fontFamily: "var(--font-lexend), sans-serif",
                borderTop: `1px solid ${activeTheme.ui}`
            }}>
                Page {currentPage + 1} of {Math.max(1, totalPages)}
            </div>
        </div>
    );
}
