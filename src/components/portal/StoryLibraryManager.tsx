"use client";

import { useState, useCallback } from "react";
import type { StoryRecord, AnthologyRecord, SchoolDirectoryRecord, PortalUser } from "@/lib/types";
import { StoryProofreadPreview } from "@/components/portal/StoryProofreadPreview";

interface Props {
    initialStories: StoryRecord[];
    initialAnthologies: AnthologyRecord[];
    schools: SchoolDirectoryRecord[];
    currentUser: PortalUser;
}

type Tab = "stories" | "anthologies";
type View = "list" | "editor" | "proofread";

const STATUS_COLORS: Record<string, string> = {
    draft: "#78909c",
    review: "#f9a825",
    published: "#2e7d32",
    pending: "#78909c",
    approved: "#2e7d32",
    denied: "#c62828",
};

function Badge({ label, color }: { label: string; color: string }) {
    return (
        <span
            style={{
                display: "inline-block",
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                padding: "0.2rem 0.6rem",
                borderRadius: "var(--shape-full, 999px)",
                backgroundColor: `${color}18`,
                color,
                border: `1px solid ${color}40`,
            }}
        >
            {label}
        </span>
    );
}

export function StoryLibraryManager({ initialStories, initialAnthologies, schools }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>("stories");
    const [view, setView] = useState<View>("list");
    const [saving, setSaving] = useState(false);

    // Data
    const [stories, setStories] = useState(initialStories);
    const [anthologies, setAnthologies] = useState(initialAnthologies);

    // Editing State
    const [editingStory, setEditingStory] = useState<StoryRecord | null>(null);
    const [editingAnthology, setEditingAnthology] = useState<AnthologyRecord | null>(null);

    // Story Form
    const [storyEditTab, setStoryEditTab] = useState<"metadata" | "author" | "blocks">("metadata");
    const [sContentBlocks, setSContentBlocks] = useState<import("@/lib/types").StoryContentBlock[]>([]);

    const [sTitle, setSTitle] = useState("");
    const [sExcerpt, setSExcerpt] = useState("");
    const [sContentText, setSContentText] = useState("");
    const [sSchoolId, setSSchoolId] = useState<number | "">("");
    const [sGrade, setSGrade] = useState("");
    const [sLanguage, setSLanguage] = useState("English");
    const [sTags, setSTags] = useState("");
    const [sConsentStatus, setSConsentStatus] = useState<"pending" | "approved" | "denied">("pending");
    const [sPublicAuthorDisplay, setSPublicAuthorDisplay] = useState("");
    const [sAnthologyId, setSAnthologyId] = useState<number | "">("");
    const [sPageStart, setSPageStart] = useState<number>(1);
    const [sPageEnd, setSPageEnd] = useState<number>(1);
    const [sSortOrder, setSSortOrder] = useState<number>(0);

    // Anthology Form
    const [aTitle, setATitle] = useState("");
    const [aScopeType, setAScopeType] = useState<AnthologyRecord["scopeType"]>("school");
    const [aScopeId, setAScopeId] = useState<number | "">("");
    const [aSchoolId, setASchoolId] = useState<number | "">("");
    const [aDistrictScope, setADistrictScope] = useState("");
    const [aEdition, setAEdition] = useState("");
    const [aPdfStoredPath, setAPdfStoredPath] = useState("");
    const [aCoverImagePath, setACoverImagePath] = useState("");
    const [aPdfPageCount, setAPdfPageCount] = useState<number>(0);
    const [aFeatured, setAFeatured] = useState(false);
    const [aConsentStatus, setAConsentStatus] = useState<"pending" | "approved" | "denied">("pending");
    const [aPublishStatus, setAPublishStatus] = useState<"draft" | "review" | "published">("draft");

    const resetStoryForm = useCallback(() => {
        setStoryEditTab("metadata");
        setSContentBlocks([]);
        setSTitle("");
        setSExcerpt("");
        setSContentText("");
        setSSchoolId("");
        setSGrade("");
        setSLanguage("English");
        setSTags("");
        setSConsentStatus("pending");
        setSPublicAuthorDisplay("");
        setSAnthologyId("");
        setSPageStart(1);
        setSPageEnd(1);
        setSSortOrder(0);
        setEditingStory(null);
    }, []);

    const resetAnthologyForm = useCallback(() => {
        setATitle("");
        setAScopeType("school");
        setAScopeId("");
        setASchoolId("");
        setADistrictScope("");
        setAEdition("");
        setAPdfStoredPath("");
        setACoverImagePath("");
        setAPdfPageCount(0);
        setAFeatured(false);
        setAConsentStatus("pending");
        setAPublishStatus("draft");
        setEditingAnthology(null);
    }, []);

    const openStoryEditor = useCallback((story?: StoryRecord) => {
        if (story) {
            setEditingStory(story);
            setStoryEditTab("metadata");
            setSContentBlocks(story.storyContentBlocks ?? []);
            setSTitle(story.title);
            setSExcerpt(story.excerpt);
            setSContentText(story.contentText ?? "");
            setSSchoolId(story.schoolId);
            setSGrade(story.grade);
            setSLanguage(story.language);
            setSTags(story.tags.join(", "));
            setSConsentStatus(story.consentStatus);
            setSPublicAuthorDisplay(story.publicAuthorDisplay);
            setSAnthologyId(story.anthologyId ?? "");
            setSPageStart(story.pageStart ?? 1);
            setSPageEnd(story.pageEnd ?? 1);
            setSSortOrder(story.sortOrder ?? 0);
        } else {
            resetStoryForm();
        }
        setView("editor");
    }, [resetStoryForm]);

    const openAnthologyEditor = useCallback((anthology?: AnthologyRecord) => {
        if (anthology) {
            setEditingAnthology(anthology);
            setATitle(anthology.title);
            setAScopeType(anthology.scopeType || "school");
            setAScopeId(anthology.scopeId ?? "");
            setASchoolId(anthology.schoolId ?? "");
            setADistrictScope(anthology.districtScope ?? "");
            setAEdition(anthology.edition);
            setAPdfStoredPath(anthology.pdfStoredPath ?? "");
            setACoverImagePath(anthology.coverImagePath ?? "");
            setAPdfPageCount(anthology.pdfPageCount ?? 0);
            setAFeatured(anthology.featured ?? false);
            setAConsentStatus(anthology.consentStatus ?? "pending");
            setAPublishStatus(anthology.publishStatus ?? "draft");
        } else {
            resetAnthologyForm();
        }
        setView("editor");
    }, [resetAnthologyForm]);

    const handleSaveStory = useCallback(async () => {
        if (!sTitle.trim() || !sSchoolId) return;
        setSaving(true);
        try {
            const res = await fetch("/api/portal/stories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "save-story",
                    id: editingStory?.id,
                    title: sTitle.trim(),
                    excerpt: sExcerpt.trim(),
                    contentText: sContentText.trim() || null,
                    storyContentBlocks: sContentBlocks,
                    schoolId: Number(sSchoolId),
                    grade: sGrade,
                    language: sLanguage,
                    tags: sTags.split(",").map(t => t.trim()).filter(Boolean),
                    consentStatus: sConsentStatus,
                    publicAuthorDisplay: sPublicAuthorDisplay.trim(),
                    anthologyId: sAnthologyId ? Number(sAnthologyId) : null,
                    pageStart: sPageStart,
                    pageEnd: sPageEnd,
                    sortOrder: sSortOrder,
                }),
            });
            const data = await res.json();
            if (data.story) {
                setStories(prev => {
                    const idx = prev.findIndex(s => s.id === data.story.id);
                    if (idx >= 0) {
                        const updated = [...prev];
                        updated[idx] = data.story;
                        return updated;
                    }
                    return [data.story, ...prev];
                });
                resetStoryForm();
                setView("list");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    }, [sTitle, sExcerpt, sContentText, sSchoolId, sGrade, sLanguage, sTags, sConsentStatus, sPublicAuthorDisplay, sAnthologyId, sPageStart, sPageEnd, sSortOrder, editingStory, resetStoryForm]);

    const handleSaveAnthology = useCallback(async () => {
        if (!aTitle.trim()) return;
        setSaving(true);
        try {
            const res = await fetch("/api/portal/stories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "save-anthology",
                    id: editingAnthology?.id,
                    title: aTitle.trim(),
                    scopeType: aScopeType,
                    scopeId: aScopeId ? Number(aScopeId) : null,
                    schoolId: aSchoolId ? Number(aSchoolId) : null,
                    districtScope: aDistrictScope.trim() || null,
                    edition: aEdition.trim(),
                    pdfStoredPath: aPdfStoredPath.trim() || null,
                    coverImagePath: aCoverImagePath.trim() || null,
                    pdfPageCount: aPdfPageCount,
                    featured: aFeatured,
                    consentStatus: aConsentStatus,
                    publishStatus: aPublishStatus,
                }),
            });
            const data = await res.json();
            if (data.anthology) {
                setAnthologies(prev => {
                    const idx = prev.findIndex(a => a.id === data.anthology.id);
                    if (idx >= 0) {
                        const updated = [...prev];
                        updated[idx] = data.anthology;
                        return updated;
                    }
                    return [data.anthology, ...prev];
                });
                resetAnthologyForm();
                setView("list");
            }
        } finally {
            setSaving(false);
        }
    }, [aTitle, aScopeType, aScopeId, aSchoolId, aDistrictScope, aEdition, aPdfStoredPath, aCoverImagePath, aPdfPageCount, aFeatured, aConsentStatus, aPublishStatus, editingAnthology, resetAnthologyForm]);

    const handlePublishStory = useCallback(async (storyId: number) => {
        const res = await fetch("/api/portal/stories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "publish", storyId }),
        });
        const data = await res.json();
        if (data.error) {
            alert(data.error);
            return;
        }
        if (data.story) {
            setStories(prev => prev.map(s => s.id === data.story.id ? data.story : s));
        }
    }, []);

    const handleUnpublishStory = useCallback(async (storyId: number) => {
        const res = await fetch("/api/portal/stories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "unpublish", storyId }),
        });
        const data = await res.json();
        if (data.story) {
            setStories(prev => prev.map(s => s.id === data.story.id ? data.story : s));
        }
    }, []);

    const handleDeleteStory = useCallback(async (storyId: number) => {
        if (!confirm("Delete this story permanently?")) return;
        await fetch("/api/portal/stories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", storyId }),
        });
        setStories(prev => prev.filter(s => s.id !== storyId));
    }, []);

    if (view === "proofread") {
        const selectedSchool = schools.find(s => s.id === Number(sSchoolId));
        return (
            <StoryProofreadPreview
                saving={saving}
                draft={{
                    title: sTitle,
                    publicAuthorDisplay: sPublicAuthorDisplay,
                    schoolName: selectedSchool ? selectedSchool.name : "",
                    consentStatus: sConsentStatus,
                    contentBlocks: sContentBlocks
                }}
                onBackToEditor={() => setView("editor")}
                onPublish={() => {
                    handleSaveStory();
                }}
                onUpdateDraft={(updates) => {
                    if (updates.title !== undefined) setSTitle(updates.title);
                    if (updates.publicAuthorDisplay !== undefined) setSPublicAuthorDisplay(updates.publicAuthorDisplay);
                    if (updates.consentStatus !== undefined) setSConsentStatus(updates.consentStatus);
                    if (updates.contentBlocks !== undefined) setSContentBlocks(updates.contentBlocks);
                }}
            />
        );
    }

    // render editor
    if (view === "editor") {
        if (activeTab === "stories") {
            const selectedSchool = schools.find(s => s.id === Number(sSchoolId));
            return (
                <div className="card" style={{ padding: "1.5rem", marginTop: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                        <h2 style={{ margin: 0 }}>{editingStory ? "Edit Story" : "New Story"}</h2>
                        <button className="button button-ghost" onClick={() => { resetStoryForm(); setView("list"); }}>← Back to list</button>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--md-sys-color-outline-variant)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
                        <button className={`button ${storyEditTab === "metadata" ? "" : "button-ghost"}`} onClick={() => setStoryEditTab("metadata")}>Metadata</button>
                        <button className={`button ${storyEditTab === "author" ? "" : "button-ghost"}`} onClick={() => setStoryEditTab("author")}>Author & Consent</button>
                        <button className={`button ${storyEditTab === "blocks" ? "" : "button-ghost"}`} onClick={() => setStoryEditTab("blocks")}>Block Editor</button>
                    </div>

                    <div style={{ display: "grid", gap: "1rem" }}>
                        {storyEditTab === "metadata" && (
                            <>
                                <div>
                                    <label><strong>Title *</strong></label>
                                    <input type="text" value={sTitle} onChange={e => setSTitle(e.target.value)} placeholder="Story title" style={{ width: "100%" }} />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                    <div>
                                        <label><strong>School *</strong></label>
                                        <select value={sSchoolId} onChange={e => setSSchoolId(e.target.value ? Number(e.target.value) : "")} style={{ width: "100%" }}>
                                            <option value="">Select school…</option>
                                            {schools.map(s => <option key={s.id} value={s.id}>{s.name} — {s.district}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label><strong>Anthology Link (Catalog)</strong></label>
                                        <select value={sAnthologyId} onChange={e => setSAnthologyId(e.target.value ? Number(e.target.value) : "")} style={{ width: "100%" }}>
                                            <option value="">(None)</option>
                                            {anthologies.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {sAnthologyId !== "" && (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                                        <div>
                                            <label><strong>Page Start</strong></label>
                                            <input type="number" min="1" value={sPageStart} onChange={e => setSPageStart(Number(e.target.value))} style={{ width: "100%" }} />
                                        </div>
                                        <div>
                                            <label><strong>Page End</strong></label>
                                            <input type="number" min="1" value={sPageEnd} onChange={e => setSPageEnd(Number(e.target.value))} style={{ width: "100%" }} />
                                        </div>
                                        <div>
                                            <label><strong>Sort Order</strong></label>
                                            <input type="number" value={sSortOrder} onChange={e => setSSortOrder(Number(e.target.value))} style={{ width: "100%" }} />
                                        </div>
                                    </div>
                                )}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                                    <div>
                                        <label><strong>Grade</strong></label>
                                        <select value={sGrade} onChange={e => setSGrade(e.target.value)} style={{ width: "100%" }}>
                                            <option value="">Select grade…</option>
                                            {["P1", "P2", "P3", "P4", "P5", "P6", "P7"].map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label><strong>Language</strong></label>
                                        <input type="text" value={sLanguage} onChange={e => setSLanguage(e.target.value)} style={{ width: "100%" }} />
                                    </div>
                                    <div>
                                        <label><strong>Tags</strong> <small>(comma-separated)</small></label>
                                        <input type="text" value={sTags} onChange={e => setSTags(e.target.value)} placeholder="e.g. community" style={{ width: "100%" }} />
                                    </div>
                                </div>
                                <div>
                                    <label><strong>Excerpt</strong></label>
                                    <textarea value={sExcerpt} onChange={e => setSExcerpt(e.target.value)} rows={2} style={{ width: "100%" }} />
                                </div>
                            </>
                        )}

                        {storyEditTab === "author" && (
                            <>
                                <div>
                                    <label><strong>Public Author Display</strong></label>
                                    <input type="text" value={sPublicAuthorDisplay}
                                        onChange={e => setSPublicAuthorDisplay(e.target.value)}
                                        placeholder={selectedSchool ? `e.g. ${sGrade || "P5"} Learner, ${selectedSchool.name}` : "e.g. P5 Learner, School Name"}
                                        style={{ width: "100%" }}
                                    />
                                    <small style={{ opacity: 0.7 }}>Will only display to the public if Consent Status is Approved.</small>
                                </div>
                                <div style={{ padding: "1rem", backgroundColor: "var(--md-sys-color-surface-variant)", borderRadius: "8px" }}>
                                    <label><strong>Staff Policy: Consent Status</strong></label>
                                    <select value={sConsentStatus} onChange={e => setSConsentStatus(e.target.value as "pending" | "approved" | "denied")} style={{ width: "100%", marginTop: "0.5rem" }}>
                                        <option value="pending">Pending (Unpublishable)</option>
                                        <option value="approved">Approved (Safe to Publish)</option>
                                        <option value="denied">Denied (Unpublishable)</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {storyEditTab === "blocks" && (
                            <div style={{ minHeight: "300px", border: "1px dashed var(--md-sys-color-outline-variant)", padding: "1rem", borderRadius: "8px" }}>
                                <label style={{ display: "block", marginBottom: "1rem" }}><strong>Story Content Blocks</strong></label>
                                {sContentBlocks.length === 0 ? (
                                    <p style={{ opacity: 0.6, fontSize: "0.9rem" }}>No blocks added yet.</p>
                                ) : (
                                    <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
                                        {sContentBlocks.map((block, idx) => (
                                            <div key={idx} style={{ padding: "0.75rem", background: "var(--md-sys-color-surface-variant)", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                <div style={{ flex: 1 }}>
                                                    <Badge label={block.type} color="#000" />
                                                    {block.type === "paragraph" && <p style={{ fontSize: "0.9rem", margin: "0.5rem 0 0" }}>{block.text.substring(0, 100)}{block.text.length > 100 ? "..." : ""}</p>}
                                                    {block.type === "heading" && <h4 style={{ margin: "0.5rem 0 0" }}>{block.text}</h4>}
                                                    {block.type === "illustration" && (
                                                        <div style={{ marginTop: "0.5rem" }}>
                                                            <div style={{ fontSize: "0.8rem", color: "var(--md-sys-color-primary)" }}>[Image: {block.image_url.split('/').pop()}]</div>
                                                            <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>Keep with next: {block.keep_with_next ? "Yes" : "No"}</div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ display: "flex", gap: "0.25rem", marginLeft: "1rem" }}>
                                                    <button className="button button-ghost" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => {
                                                        const newBlocks = [...sContentBlocks];
                                                        if (idx > 0) {
                                                            const temp = newBlocks[idx];
                                                            newBlocks[idx] = newBlocks[idx - 1];
                                                            newBlocks[idx - 1] = temp;
                                                            setSContentBlocks(newBlocks);
                                                        }
                                                    }}>↑</button>
                                                    <button className="button button-ghost" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => {
                                                        const newBlocks = [...sContentBlocks];
                                                        if (idx < newBlocks.length - 1) {
                                                            const temp = newBlocks[idx];
                                                            newBlocks[idx] = newBlocks[idx + 1];
                                                            newBlocks[idx + 1] = temp;
                                                            setSContentBlocks(newBlocks);
                                                        }
                                                    }}>↓</button>
                                                    <button className="button button-ghost" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", color: "red" }} onClick={() => {
                                                        setSContentBlocks(sContentBlocks.filter((_, i) => i !== idx));
                                                    }}>×</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
                                    <button className="button button-ghost" onClick={() => {
                                        const text = prompt("Enter paragraph text:");
                                        if (text) setSContentBlocks([...sContentBlocks, { type: "paragraph", text }]);
                                    }}>+ Paragraph</button>
                                    <button className="button button-ghost" onClick={() => {
                                        const text = prompt("Enter heading text:");
                                        if (text) setSContentBlocks([...sContentBlocks, { type: "heading", text }]);
                                    }}>+ Heading</button>
                                    <button className="button button-ghost" onClick={() => {
                                        const url = prompt("Enter Image URL (e.g. /illustrations/forest.jpg):");
                                        if (url) {
                                            const alt = prompt("Enter Alt Text:") || "Illustration";
                                            const layout = (prompt("Layout (full, center, inset-left, inset-right):", "full") || "full") as "full" | "center" | "inset-left" | "inset-right";
                                            setSContentBlocks([...sContentBlocks, { type: "illustration", image_url: url, alt_text: alt, layout, keep_with_next: true }]);
                                        }
                                    }}>+ Illustration</button>
                                </div>
                                <div style={{ marginTop: "1.5rem" }}>
                                    <label><strong>Legacy Fallback Content Text</strong> (Optional)</label>
                                    <textarea value={sContentText} onChange={e => setSContentText(e.target.value)} rows={3} style={{ width: "100%", fontSize: "0.85rem" }} />
                                </div>
                            </div>
                        )}

                        <div className="action-row" style={{ marginTop: "1rem", borderTop: "1px solid var(--md-sys-color-outline-variant)", paddingTop: "1rem", display: "flex", gap: "1rem" }}>
                            <button className="button button-ghost" onClick={() => setView("list")} disabled={saving}>
                                Cancel
                            </button>
                            <button className="button" onClick={() => setView("proofread")} disabled={saving || !sTitle.trim() || !sSchoolId}>
                                Next: Proofread Preview
                            </button>
                        </div>
                    </div>
                </div>
            );
        } else {
            // Anthology Editor
            return (
                <div className="card" style={{ padding: "1.5rem", marginTop: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                        <h2 style={{ margin: 0 }}>{editingAnthology ? "Edit Anthology" : "New Anthology"}</h2>
                        <button className="button button-ghost" onClick={() => { resetAnthologyForm(); setView("list"); }}>← Back to list</button>
                    </div>
                    <div style={{ display: "grid", gap: "1rem" }}>
                        <div>
                            <label><strong>Title *</strong></label>
                            <input type="text" value={aTitle} onChange={e => setATitle(e.target.value)} placeholder="Anthology title" style={{ width: "100%" }} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div>
                                <label><strong>Scope Type</strong></label>
                                <select value={aScopeType} onChange={e => setAScopeType(e.target.value as "school" | "district" | "subregion" | "region")} style={{ width: "100%" }}>
                                    <option value="school">School</option>
                                    <option value="district">District</option>
                                    <option value="subregion">Sub-Region</option>
                                    <option value="region">Region</option>
                                </select>
                            </div>
                            <div>
                                <label><strong>School Link (Optional)</strong></label>
                                <select value={aSchoolId} onChange={e => setASchoolId(e.target.value ? Number(e.target.value) : "")} style={{ width: "100%" }}>
                                    <option value="">(None)</option>
                                    {schools.map(s => <option key={s.id} value={s.id}>{s.name} — {s.district}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div>
                                <label><strong>Edition</strong></label>
                                <input type="text" value={aEdition} onChange={e => setAEdition(e.target.value)} placeholder="e.g. 2024 Vol 1" style={{ width: "100%" }} />
                            </div>
                            <div>
                                <label><strong>PDF Page Count</strong></label>
                                <input type="number" min="0" value={aPdfPageCount} onChange={e => setAPdfPageCount(Number(e.target.value))} style={{ width: "100%" }} />
                            </div>
                        </div>
                        <div>
                            <label><strong>PDF URL / Stored Path</strong></label>
                            <input type="text" value={aPdfStoredPath} onChange={e => setAPdfStoredPath(e.target.value)} placeholder="/uploads/anthologies/pdf-name.pdf" style={{ width: "100%" }} />
                        </div>
                        <div>
                            <label><strong>Cover Image URL / Path</strong></label>
                            <input type="text" value={aCoverImagePath} onChange={e => setACoverImagePath(e.target.value)} placeholder="/uploads/anthologies/cover.jpg" style={{ width: "100%" }} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div>
                                <label><strong>Publish Status</strong></label>
                                <select value={aPublishStatus} onChange={e => setAPublishStatus(e.target.value as "draft" | "review" | "published")} style={{ width: "100%" }}>
                                    <option value="draft">Draft</option>
                                    <option value="review">Review</option>
                                    <option value="published">Published</option>
                                </select>
                            </div>
                            <div>
                                <label><strong>Consent Status</strong></label>
                                <select value={aConsentStatus} onChange={e => setAConsentStatus(e.target.value as "pending" | "approved" | "denied")} style={{ width: "100%" }}>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="denied">Denied</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                                <input type="checkbox" checked={aFeatured} onChange={e => setAFeatured(e.target.checked)} />
                                <strong>Featured Anthology (Appears on Homepage)</strong>
                            </label>
                        </div>

                        <div className="action-row" style={{ marginTop: "1rem" }}>
                            <button className="button" onClick={handleSaveAnthology} disabled={saving || !aTitle.trim()}>
                                {saving ? "Saving…" : editingAnthology ? "Update Anthology" : "Create Anthology"}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
    }

    return (
        <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--md-sys-color-outline-variant)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
                <button
                    className={`button ${activeTab === "stories" ? "" : "button-ghost"}`}
                    onClick={() => setActiveTab("stories")}
                >
                    Stories ({stories.length})
                </button>
                <button
                    className={`button ${activeTab === "anthologies" ? "" : "button-ghost"}`}
                    onClick={() => setActiveTab("anthologies")}
                >
                    Anthologies ({anthologies.length})
                </button>
            </div>

            <div className="action-row" style={{ marginBottom: "1rem" }}>
                {activeTab === "stories" ? (
                    <button className="button" onClick={() => openStoryEditor()}>+ New Story Note / Catalog Entry</button>
                ) : (
                    <button className="button" onClick={() => openAnthologyEditor()}>+ New Anthology</button>
                )}
            </div>

            {activeTab === "stories" && (
                stories.length === 0 ? (
                    <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                        <p>No stories yet. Click <strong>+ New Story Note / Catalog Entry</strong> to create one.</p>
                    </div>
                ) : (
                    <div className="card" style={{ overflow: "auto" }}>
                        <table className="portal-table" style={{ width: "100%", fontSize: "0.88rem" }}>
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Anthology Link</th>
                                    <th>Page</th>
                                    <th>Status</th>
                                    <th>Consent</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stories.map(story => (
                                    <tr key={story.id}>
                                        <td><strong>{story.title}</strong><br /><span style={{ fontSize: "0.8em", opacity: 0.8 }}>{story.schoolName}</span></td>
                                        <td>{story.anthologyId ? anthologies.find(a => a.id === story.anthologyId)?.title ?? `ID#${story.anthologyId}` : "—"}</td>
                                        <td>{story.anthologyId ? `${story.pageStart}-${story.pageEnd}` : "—"}</td>
                                        <td>
                                            <Badge label={story.publishStatus} color={STATUS_COLORS[story.publishStatus] ?? "#666"} />
                                        </td>
                                        <td>
                                            <Badge label={story.consentStatus} color={STATUS_COLORS[story.consentStatus] ?? "#666"} />
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                                <button className="button button-ghost" style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem" }} onClick={() => openStoryEditor(story)}>Edit</button>
                                                {story.publishStatus !== "published" && story.consentStatus === "approved" && (
                                                    <button className="button" style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem" }} onClick={() => handlePublishStory(story.id)}>Publish</button>
                                                )}
                                                {story.publishStatus === "published" && (
                                                    <button className="button button-ghost" style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem" }} onClick={() => handleUnpublishStory(story.id)}>Unpublish</button>
                                                )}
                                                <button className="button button-ghost" style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem", color: "var(--md-sys-color-error)" }} onClick={() => handleDeleteStory(story.id)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {activeTab === "anthologies" && (
                anthologies.length === 0 ? (
                    <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                        <p>No anthologies yet. Click <strong>+ New Anthology</strong> to create one.</p>
                    </div>
                ) : (
                    <div className="card" style={{ overflow: "auto" }}>
                        <table className="portal-table" style={{ width: "100%", fontSize: "0.88rem" }}>
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Scope</th>
                                    <th>Edition</th>
                                    <th>Consent</th>
                                    <th>Publish Status</th>
                                    <th>Featured</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {anthologies.map(anth => (
                                    <tr key={anth.id}>
                                        <td><strong>{anth.title}</strong></td>
                                        <td>{anth.scopeType}</td>
                                        <td>{anth.edition || "—"}</td>
                                        <td>
                                            <Badge label={anth.consentStatus} color={STATUS_COLORS[anth.consentStatus] ?? "#666"} />
                                        </td>
                                        <td>
                                            <Badge label={anth.publishStatus} color={STATUS_COLORS[anth.publishStatus] ?? "#666"} />
                                        </td>
                                        <td>{anth.featured ? "⭐ Yes" : "No"}</td>
                                        <td>
                                            <button className="button button-ghost" style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem" }} onClick={() => openAnthologyEditor(anth)}>Edit</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}
