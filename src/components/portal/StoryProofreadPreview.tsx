"use client";

import { useState } from "react";
import type { StoryContentBlock } from "@/lib/types";
import { StoryReader } from "@/components/StoryReader";

interface DraftStory {
    title: string;
    publicAuthorDisplay: string;
    schoolName: string;
    coverImagePath?: string | null;
    consentStatus: "pending" | "approved" | "denied";
    contentBlocks: StoryContentBlock[];
}

interface Props {
    draft: DraftStory;
    onBackToEditor: () => void;
    onPublish: () => void;
    onUpdateDraft: (updates: Partial<DraftStory>) => void;
    saving: boolean;
}

export function StoryProofreadPreview({ draft, onBackToEditor, onPublish, onUpdateDraft, saving }: Props) {
    const [deviceView, setDeviceView] = useState<"desktop" | "tablet" | "mobile">("desktop");
    const [showChecklist, setShowChecklist] = useState(false);

    // Editing states
    const [editingTitle, setEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState("");

    const [editingAuthor, setEditingAuthor] = useState(false);
    const [tempAuthor, setTempAuthor] = useState("");

    const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);
    const [tempBlockText, setTempBlockText] = useState("");

    const hasTitle = draft.title.trim().length > 0;
    const hasBlocks = draft.contentBlocks.length > 0;
    const consentApproved = draft.consentStatus === "approved";
    // Check if illustration blocks have alt text
    const blocksValid = draft.contentBlocks.every(b =>
        b.type !== "illustration" || (b.image_url && b.alt_text)
    );

    // Can only publish if title exists, has content blocks, and if displaying an author name, consent must be approved.
    const canPublish = hasTitle && hasBlocks && blocksValid && (!draft.publicAuthorDisplay || consentApproved);

    const safeAuthorDisplay = consentApproved ? draft.publicAuthorDisplay : "Anonymous Learner";

    const handleSaveTitle = () => {
        onUpdateDraft({ title: tempTitle });
        setEditingTitle(false);
    };

    const handleSaveAuthor = () => {
        onUpdateDraft({ publicAuthorDisplay: tempAuthor });
        setEditingAuthor(false);
    };

    const handleSaveBlock = (index: number) => {
        const newBlocks = [...draft.contentBlocks];
        const block = newBlocks[index];
        if (block.type === "paragraph" || block.type === "heading") {
            newBlocks[index] = { ...block, text: tempBlockText };
        } else if (block.type === "illustration") {
            newBlocks[index] = { ...block, caption: tempBlockText };
        }
        onUpdateDraft({ contentBlocks: newBlocks });
        setEditingBlockIndex(null);
    };

    const handleEditBlock = (index: number) => {
        const block = draft.contentBlocks[index];
        if (block.type === "paragraph" || block.type === "heading") {
            setTempBlockText(block.text);
        } else if (block.type === "illustration") {
            setTempBlockText(block.caption || "");
        }
        setEditingBlockIndex(index);
    };

    const EditableField = ({
        value,
        isEditing,
        onEditHover,
        onStartEdit,
        onCancel,
        onSave,
        children
    }: {
        value: string,
        isEditing: boolean,
        onEditHover: (e: React.ChangeEvent<HTMLInputElement>) => void,
        onStartEdit: () => void,
        onCancel: () => void,
        onSave: () => void,
        children: React.ReactNode
    }) => {
        const [hovered, setHovered] = useState(false);

        if (isEditing) {
            return (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", width: "100%", margin: "0.5rem 0" }}>
                    <input
                        type="text"
                        value={value}
                        onChange={onEditHover}
                        style={{ flex: 1, padding: "0.2rem 0.5rem" }}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && onSave()}
                    />
                    <button className="button button-ghost" onClick={onSave} style={{ padding: "0.2rem 0.5rem" }}>Save</button>
                    <button className="button button-ghost" onClick={onCancel} style={{ padding: "0.2rem 0.5rem", color: "red" }}>Cancel</button>
                </div>
            );
        }

        return (
            <div
                style={{ position: "relative", display: "inline-block", width: "100%" }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {children}
                {hovered && (
                    <button
                        onClick={onStartEdit}
                        style={{
                            position: "absolute", top: 0, right: 0,
                            background: "var(--md-sys-color-primary)", color: "white",
                            border: "none", borderRadius: "4px", padding: "0.2rem 0.5rem",
                            cursor: "pointer", fontSize: "0.75rem", transform: "translate(50%, -50%)"
                        }}
                        title="Edit this field"
                    >
                        ✎
                    </button>
                )}
            </div>
        );
    };

    // We create a wrapper that maps the draft blocks into a format with editable paragraph/headings
    // Because StoryReader expects pure StoryContentBlocks but we want edit interactivity, 
    // we'll override the rendering slightly, or we can just render it directly here for the exact fidelity.
    // For maximum fidelity, we pass the exact blocks to StoryReader, but intercept it by mapping the blocks first.
    // Wait, StoryReader renders the blocks internally. To add the "pen" icon inside StoryReader, 
    // we would need to modify StoryReader to accept an 'onEditBlock' callback or wrap it.
    // Since non-negotiable requires EXACT matching, let's pass a modified block array that injects a wrapper.
    // However, StoryReader only renders what's in the standard types.
    // Let's modify StoryReader slightly to accept an optional `onEditBlock` prop, or we can implement the layout here for the cover page, and pass blocks to StoryReader.

    // Actually, Cover Page is rendered in `page.tsx`, so we should reproduce the Cover Page here exactly as in `[slug]/page.tsx`.

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

            {/* Top Toolbar */}
            <div style={{
                position: "sticky", top: 0, zIndex: 50,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "1rem", backgroundColor: "var(--md-sys-color-surface-container)",
                borderBottom: "1px solid var(--md-sys-color-outline-variant)"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <h3 style={{ margin: 0 }}>Proofread Preview</h3>
                    <span style={{
                        fontSize: "0.80rem", padding: "0.2rem 0.5rem", borderRadius: "12px",
                        backgroundColor: canPublish ? "var(--md-sys-color-primary-container)" : "var(--md-sys-color-error-container)",
                        color: canPublish ? "var(--md-sys-color-on-primary-container)" : "var(--md-sys-color-on-error-container)"
                    }}>
                        {canPublish ? "Ready to Publish" : "Not Ready"}
                    </span>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className={`button ${deviceView === "desktop" ? "" : "button-ghost"}`} onClick={() => setDeviceView("desktop")}>Desktop</button>
                    <button className={`button ${deviceView === "tablet" ? "" : "button-ghost"}`} onClick={() => setDeviceView("tablet")}>Tablet</button>
                    <button className={`button ${deviceView === "mobile" ? "" : "button-ghost"}`} onClick={() => setDeviceView("mobile")}>Mobile</button>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="button button-ghost" onClick={onBackToEditor}>← Back to Editor</button>
                    <button className="button button-ghost" onClick={() => setShowChecklist(!showChecklist)}>Review Checklist</button>
                    {canPublish && (
                        <button className="button button-ghost" onClick={() => window.open(`/api/pdf-engine?preview=true`)}>Preview PDF</button>
                    )}
                    <button className="button" onClick={onPublish} disabled={!canPublish || saving}>
                        {saving ? "Publishing..." : "Publish Final"}
                    </button>
                </div>
            </div>

            {/* Checklist Dropdown */}
            {showChecklist && (
                <div style={{
                    position: "absolute", top: "70px", right: "20px", width: "300px", zIndex: 100,
                    backgroundColor: "var(--md-sys-color-surface)", padding: "1rem",
                    borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    border: "1px solid var(--md-sys-color-outline-variant)"
                }}>
                    <h4 style={{ margin: "0 0 1rem 0" }}>Publish Readiness Checklist</h4>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
                        <li style={{ color: hasTitle ? "green" : "red" }}>{hasTitle ? "✅" : "❌"} Title present</li>
                        <li style={{ color: hasBlocks ? "green" : "red" }}>{hasBlocks ? "✅" : "❌"} Has content blocks</li>
                        <li style={{ color: blocksValid ? "green" : "red" }}>{blocksValid ? "✅" : "❌"} Illustration assets valid</li>
                        <li style={{ color: consentApproved || !draft.publicAuthorDisplay ? "green" : "red" }}>
                            {consentApproved || !draft.publicAuthorDisplay ? "✅" : "❌"} Author consent approved (or anonymous)
                        </li>
                    </ul>
                </div>
            )}

            {/* Preview Canvas */}
            <div style={{
                flex: 1, overflowY: "auto", padding: "2rem",
                backgroundColor: "var(--md-sys-color-surface-variant)",
                display: "flex", justifyContent: "center"
            }}>
                <div style={{
                    width: deviceView === "desktop" ? "100%" : deviceView === "tablet" ? "768px" : "375px",
                    maxWidth: "1000px",
                    transition: "width 0.3s ease",
                    backgroundColor: "var(--md-sys-color-surface)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    borderRadius: "8px",
                    overflow: "hidden"
                }}>

                    {/* Exact Public Story Page Structure (Mimicking [slug]/page.tsx) */}
                    <div className="page-hero" style={{ padding: "3rem 2rem", textAlign: "center" }}>
                        <p className="kicker">1001 Story Project</p>

                        <EditableField
                            value={tempTitle} isEditing={editingTitle}
                            onStartEdit={() => { setTempTitle(draft.title); setEditingTitle(true); }}
                            onEditHover={(e: any) => setTempTitle(e.target.value)}
                            onCancel={() => setEditingTitle(false)} onSave={handleSaveTitle}
                        >
                            <h1 style={{ margin: "1rem 0" }}>{draft.title || "Untitled Story"}</h1>
                        </EditableField>

                        <div className="story-detail-meta" style={{ justifyContent: "center", marginBottom: "1rem" }}>
                            <EditableField
                                value={tempAuthor} isEditing={editingAuthor}
                                onStartEdit={() => { setTempAuthor(draft.publicAuthorDisplay); setEditingAuthor(true); }}
                                onEditHover={(e: React.ChangeEvent<HTMLInputElement>) => setTempAuthor(e.target.value)}
                                onCancel={() => setEditingAuthor(false)} onSave={handleSaveAuthor}
                            >
                                <span className="story-detail-author">{safeAuthorDisplay}</span>
                            </EditableField>
                            <span className="story-detail-divider">•</span>
                            <span className="story-detail-school">{draft.schoolName || "Unknown School"}</span>
                        </div>
                    </div>

                    <div style={{ padding: "0 2rem 2rem 2rem" }}>
                        <article className="story-detail-content">
                            <div style={{ padding: "0.5rem 1rem", marginBottom: "1rem", backgroundColor: "var(--md-sys-color-surface-variant)", borderRadius: "6px", fontSize: "0.85rem", color: "var(--md-sys-color-on-surface-variant)" }}>
                                <em>Disclaimer: This work is published with the explicit written consent of the author's guardian and school. Standard safeguarding policies apply.</em>
                            </div>

                            {/* The reader is complex, to add inline editing inside StoryReader, we need to pass a context or prop to StoryReader. Let's assume we modify StoryReader loosely to accept `onEditBlock` and `editingIndex` etc. Since we are creating a Proofread mode, we can enhance StoryReader directly in a separate step if needed. */}
                            <StoryReader
                                title={draft.title}
                                author={safeAuthorDisplay}
                                blocks={draft.contentBlocks}
                                isPreviewMode={true}
                                editingBlockIndex={editingBlockIndex}
                                tempBlockText={tempBlockText}
                                onEditTempBlockText={setTempBlockText}
                                onStartEditBlock={handleEditBlock}
                                onCancelEditBlock={() => setEditingBlockIndex(null)}
                                onSaveEditBlock={handleSaveBlock}
                            />
                        </article>
                    </div>

                </div>
            </div>
        </div>
    );
}
