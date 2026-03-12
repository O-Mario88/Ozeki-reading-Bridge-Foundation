"use client";

import { useCallback, useMemo, useState } from "react";
import type { AnthologyRecord, PortalUser, SchoolDirectoryRecord, StoryRecord } from "@/lib/types";
import { StoryStudioDrawer } from "@/components/portal/StoryStudioDrawer";

interface Props {
  initialStories: StoryRecord[];
  initialAnthologies: AnthologyRecord[];
  schools: SchoolDirectoryRecord[];
  currentUser: PortalUser;
}

type Tab = "stories" | "anthologies";

const STATUS_COLORS: Record<string, string> = {
  draft: "#78909c",
  review: "#f9a825",
  published: "#C35D0E",
  pending: "#78909c",
  approved: "#C35D0E",
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

export function StoryLibraryManager({
  initialStories,
  initialAnthologies,
  schools,
  currentUser,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("stories");
  const [stories, setStories] = useState(initialStories);
  const [anthologies, setAnthologies] = useState(initialAnthologies);
  const [savingAnthology, setSavingAnthology] = useState(false);

  const [storyStudioOpen, setStoryStudioOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<StoryRecord | null>(null);

  const [editingAnthology, setEditingAnthology] = useState<AnthologyRecord | null>(null);
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
  const [aConsentStatus, setAConsentStatus] =
    useState<"pending" | "approved" | "denied">("pending");
  const [aPublishStatus, setAPublishStatus] =
    useState<"draft" | "review" | "published">("draft");

  const canUnpublish = useMemo(() => currentUser.isSuperAdmin, [currentUser.isSuperAdmin]);

  const resetAnthologyForm = useCallback(() => {
    setEditingAnthology(null);
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
  }, []);

  const openStoryStudio = useCallback((story?: StoryRecord) => {
    setEditingStory(story ?? null);
    setStoryStudioOpen(true);
  }, []);

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
      return;
    }
    resetAnthologyForm();
  }, [resetAnthologyForm]);

  const handleStorySaved = useCallback((story: StoryRecord) => {
    setStories((prev) => {
      const index = prev.findIndex((item) => item.id === story.id);
      if (index === -1) {
        return [story, ...prev];
      }
      const updated = [...prev];
      updated[index] = story;
      return updated;
    });
    setEditingStory(story);
  }, []);

  const handlePublishStory = useCallback(async (storyId: number) => {
    const response = await fetch("/api/portal/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", storyId }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error ?? "Unable to publish story.");
      return;
    }
    if (data.story) {
      setStories((prev) => prev.map((story) => (story.id === data.story.id ? data.story : story)));
    }
  }, []);

  const handleUnpublishStory = useCallback(async (storyId: number) => {
    const response = await fetch("/api/portal/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unpublish", storyId }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error ?? "Unable to unpublish story.");
      return;
    }
    if (data.story) {
      setStories((prev) => prev.map((story) => (story.id === data.story.id ? data.story : story)));
    }
  }, []);

  const handleDeleteStory = useCallback(async (storyId: number) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this story permanently?")) {
      return;
    }
    const response = await fetch("/api/portal/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", storyId }),
    });
    if (response.ok) {
      setStories((prev) => prev.filter((story) => story.id !== storyId));
    }
  }, []);

  const handleSaveAnthology = useCallback(async () => {
    if (!aTitle.trim()) return;
    setSavingAnthology(true);
    try {
      const response = await fetch("/api/portal/stories", {
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
      const data = await response.json();
      if (data.anthology) {
        setAnthologies((prev) => {
          const index = prev.findIndex((anthology) => anthology.id === data.anthology.id);
          if (index === -1) return [data.anthology, ...prev];
          const updated = [...prev];
          updated[index] = data.anthology;
          return updated;
        });
        resetAnthologyForm();
      }
    } finally {
      setSavingAnthology(false);
    }
  }, [
    aTitle,
    aScopeType,
    aScopeId,
    aSchoolId,
    aDistrictScope,
    aEdition,
    aPdfStoredPath,
    aCoverImagePath,
    aPdfPageCount,
    aFeatured,
    aConsentStatus,
    aPublishStatus,
    editingAnthology,
    resetAnthologyForm,
  ]);

  return (
    <div style={{ marginTop: "1rem" }}>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          borderBottom: "1px solid var(--md-sys-color-outline-variant)",
          paddingBottom: "0.5rem",
          marginBottom: "1rem",
        }}
      >
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
          <button className="button" onClick={() => openStoryStudio()}>
            + Open Story Studio
          </button>
        ) : (
          <button className="button" onClick={() => openAnthologyEditor()}>
            + New Anthology
          </button>
        )}
      </div>

      {activeTab === "stories" ? (
        stories.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            <p>
              No stories yet. Click <strong>+ Open Story Studio</strong> to create one.
            </p>
          </div>
        ) : (
          <div className="card" style={{ overflow: "auto" }}>
            <table className="portal-table" style={{ width: "100%", fontSize: "0.88rem" }}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>School</th>
                  <th>Author link</th>
                  <th>Status</th>
                  <th>Consent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((story) => (
                  <tr key={story.id}>
                    <td>
                      <strong>{story.title}</strong>
                      <br />
                      <span style={{ fontSize: "0.8em", opacity: 0.8 }}>
                        {story.language || "English"}
                      </span>
                    </td>
                    <td>{story.schoolName || "—"}</td>
                    <td>{story.learnerUid ? `Learner linked` : "Not linked"}</td>
                    <td>
                      <Badge label={story.publishStatus} color={STATUS_COLORS[story.publishStatus] ?? "#666"} />
                    </td>
                    <td>
                      <Badge label={story.consentStatus} color={STATUS_COLORS[story.consentStatus] ?? "#666"} />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        <button
                          className="button button-ghost"
                          style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem" }}
                          onClick={() => openStoryStudio(story)}
                        >
                          Open studio
                        </button>
                        {story.publishStatus !== "published" && story.consentStatus === "approved" ? (
                          <button
                            className="button"
                            style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem" }}
                            onClick={() => {
                              void handlePublishStory(story.id);
                            }}
                          >
                            Publish
                          </button>
                        ) : null}
                        {story.publishStatus === "published" && canUnpublish ? (
                          <button
                            className="button button-ghost"
                            style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem" }}
                            onClick={() => {
                              void handleUnpublishStory(story.id);
                            }}
                          >
                            Unpublish
                          </button>
                        ) : null}
                        <button
                          className="button button-ghost"
                          style={{
                            fontSize: "0.78rem",
                            padding: "0.25rem 0.5rem",
                            color: "var(--md-sys-color-error)",
                          }}
                          onClick={() => {
                            void handleDeleteStory(story.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="card" style={{ padding: "1.2rem" }}>
          <h3 style={{ marginTop: 0 }}>
            {editingAnthology ? "Edit Anthology" : "New Anthology"}
          </h3>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label>
                <strong>Title *</strong>
              </label>
              <input
                type="text"
                value={aTitle}
                onChange={(event) => setATitle(event.target.value)}
                placeholder="Anthology title"
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label>
                  <strong>Scope Type</strong>
                </label>
                <select
                  value={aScopeType}
                  onChange={(event) =>
                    setAScopeType(
                      event.target.value as "school" | "district" | "subregion" | "region",
                    )
                  }
                  style={{ width: "100%" }}
                >
                  <option value="school">School</option>
                  <option value="district">District</option>
                  <option value="subregion">Sub-Region</option>
                  <option value="region">Region</option>
                </select>
              </div>
              <div>
                <label>
                  <strong>School Link (optional)</strong>
                </label>
                <select
                  value={aSchoolId}
                  onChange={(event) =>
                    setASchoolId(event.target.value ? Number(event.target.value) : "")
                  }
                  style={{ width: "100%" }}
                >
                  <option value="">(None)</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name} — {school.district}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label>
                  <strong>Scope ID (optional)</strong>
                </label>
                <input
                  type="number"
                  min={0}
                  value={aScopeId}
                  onChange={(event) =>
                    setAScopeId(event.target.value ? Number(event.target.value) : "")
                  }
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label>
                  <strong>District Scope (optional)</strong>
                </label>
                <input
                  type="text"
                  value={aDistrictScope}
                  onChange={(event) => setADistrictScope(event.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label>
                  <strong>Edition</strong>
                </label>
                <input
                  type="text"
                  value={aEdition}
                  onChange={(event) => setAEdition(event.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label>
                  <strong>PDF Page Count</strong>
                </label>
                <input
                  type="number"
                  min={0}
                  value={aPdfPageCount}
                  onChange={(event) => setAPdfPageCount(Number(event.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div>
              <label>
                <strong>PDF Path (optional)</strong>
              </label>
              <input
                type="text"
                value={aPdfStoredPath}
                onChange={(event) => setAPdfStoredPath(event.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label>
                <strong>Cover Image Path (optional)</strong>
              </label>
              <input
                type="text"
                value={aCoverImagePath}
                onChange={(event) => setACoverImagePath(event.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label>
                  <strong>Consent Status</strong>
                </label>
                <select
                  value={aConsentStatus}
                  onChange={(event) =>
                    setAConsentStatus(event.target.value as "pending" | "approved" | "denied")
                  }
                  style={{ width: "100%" }}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                </select>
              </div>
              <div>
                <label>
                  <strong>Publish Status</strong>
                </label>
                <select
                  value={aPublishStatus}
                  onChange={(event) =>
                    setAPublishStatus(event.target.value as "draft" | "review" | "published")
                  }
                  style={{ width: "100%" }}
                >
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={aFeatured}
                onChange={(event) => setAFeatured(event.target.checked)}
              />
              <strong>Featured anthology</strong>
            </label>

            <div className="action-row">
              <button
                className="button"
                onClick={() => {
                  void handleSaveAnthology();
                }}
                disabled={savingAnthology || !aTitle.trim()}
              >
                {savingAnthology
                  ? "Saving…"
                  : editingAnthology
                    ? "Update Anthology"
                    : "Create Anthology"}
              </button>
              {editingAnthology ? (
                <button
                  className="button button-ghost"
                  onClick={resetAnthologyForm}
                  disabled={savingAnthology}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            {anthologies.length > 0 ? (
              <div style={{ overflow: "auto", marginTop: "1rem" }}>
                <table className="portal-table" style={{ width: "100%", fontSize: "0.88rem" }}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Scope</th>
                      <th>Edition</th>
                      <th>Consent</th>
                      <th>Status</th>
                      <th>Featured</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anthologies.map((anthology) => (
                      <tr key={anthology.id}>
                        <td>
                          <strong>{anthology.title}</strong>
                        </td>
                        <td>{anthology.scopeType}</td>
                        <td>{anthology.edition || "—"}</td>
                        <td>
                          <Badge
                            label={anthology.consentStatus}
                            color={STATUS_COLORS[anthology.consentStatus] ?? "#666"}
                          />
                        </td>
                        <td>
                          <Badge
                            label={anthology.publishStatus}
                            color={STATUS_COLORS[anthology.publishStatus] ?? "#666"}
                          />
                        </td>
                        <td>{anthology.featured ? "Yes" : "No"}</td>
                        <td>
                          <button
                            className="button button-ghost"
                            style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem" }}
                            onClick={() => openAnthologyEditor(anthology)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <StoryStudioDrawer
        open={storyStudioOpen}
        story={editingStory}
        schools={schools}
        anthologies={anthologies}
        currentUser={currentUser}
        onClose={() => {
          setStoryStudioOpen(false);
          setEditingStory(null);
        }}
        onSaved={handleStorySaved}
      />
    </div>
  );
}
