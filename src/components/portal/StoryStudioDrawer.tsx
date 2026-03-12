"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FloatingSurface } from "@/components/FloatingSurface";
import { StoryReader } from "@/components/StoryReader";
import {
  SchoolRosterPicker,
  type RosterEntry,
  type RosterLearner,
} from "@/components/portal/SchoolRosterPicker";
import type {
  AnthologyRecord,
  PortalUser,
  SchoolDirectoryRecord,
  StoryContentBlock,
  StoryRecord,
} from "@/lib/types";

type StudioMode = "edit" | "preview";

type StoryStudioDrawerProps = {
  open: boolean;
  story: StoryRecord | null;
  schools: SchoolDirectoryRecord[];
  anthologies: AnthologyRecord[];
  currentUser: PortalUser;
  onClose: () => void;
  onSaved: (story: StoryRecord) => void;
};

const DEFAULT_LANGUAGE = "English";
const MIN_WORD_COUNT = 120;
const MIN_BLOCKS = 3;

function normalizeTags(tagsInput: string, readingLevelTag: string): string[] {
  const tags = tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (readingLevelTag.trim()) {
    tags.unshift(`Reading level: ${readingLevelTag.trim()}`);
  }
  return Array.from(new Set(tags));
}

function splitTags(tags: string[]) {
  let readingLevel = "";
  const remaining: string[] = [];

  for (const tag of tags) {
    if (tag.toLowerCase().startsWith("reading level:")) {
      readingLevel = tag.slice("reading level:".length).trim();
      continue;
    }
    remaining.push(tag);
  }

  return { readingLevel, remaining: remaining.join(", ") };
}

function paragraphWordCount(blocks: StoryContentBlock[]) {
  return blocks.reduce((total, block) => {
    if (block.type === "illustration") {
      return total;
    }
    const words = block.text
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return total + words;
  }, 0);
}

function hasContentForPublish(blocks: StoryContentBlock[]) {
  const nonEmptyBlocks = blocks.filter((block) => {
    if (block.type === "illustration") {
      return Boolean(block.image_url.trim());
    }
    return Boolean(block.text.trim());
  });
  if (nonEmptyBlocks.length >= MIN_BLOCKS) {
    return true;
  }
  return paragraphWordCount(blocks) >= MIN_WORD_COUNT;
}

function storySignature(payload: {
  id: number | null;
  title: string;
  language: string;
  readingLevelTag: string;
  schoolId: number | "";
  anthologyId: number | "";
  learnerUid: string;
  publicAuthorDisplay: string;
  authorClass: string;
  authorAbout: string;
  storyBlurb: string;
  consentConfirmed: boolean;
  blocks: StoryContentBlock[];
  tagsInput: string;
}) {
  return JSON.stringify(payload);
}

export function StoryStudioDrawer({
  open,
  story,
  schools,
  anthologies,
  currentUser,
  onClose,
  onSaved,
}: StoryStudioDrawerProps) {
  const [mode, setMode] = useState<StudioMode>("edit");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showChecklist, setShowChecklist] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [storyId, setStoryId] = useState<number | null>(null);
  const [publishStatus, setPublishStatus] = useState<StoryRecord["publishStatus"]>("draft");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [readingLevelTag, setReadingLevelTag] = useState("");
  const [schoolId, setSchoolId] = useState<number | "">("");
  const [anthologyId, setAnthologyId] = useState<number | "">("");
  const [learnerUid, setLearnerUid] = useState("");
  const [selectedLearner, setSelectedLearner] = useState<RosterLearner | null>(null);
  const [publicAuthorDisplay, setPublicAuthorDisplay] = useState("");
  const [authorClass, setAuthorClass] = useState("");
  const [authorAbout, setAuthorAbout] = useState("");
  const [storyBlurb, setStoryBlurb] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [blocks, setBlocks] = useState<StoryContentBlock[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [pasteInput, setPasteInput] = useState("");
  const [lastSavedSignature, setLastSavedSignature] = useState("");

  const canEditAuthorIdentity = currentUser.isAdmin || currentUser.isSuperAdmin;
  const canUnpublish = currentUser.isSuperAdmin && publishStatus === "published" && storyId !== null;

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === Number(schoolId)) ?? null,
    [schoolId, schools],
  );

  const initializedAuthorDisplay = useMemo(() => {
    if (publicAuthorDisplay.trim()) return publicAuthorDisplay.trim();
    if (selectedLearner?.fullName) return selectedLearner.fullName;
    return "Learner Author";
  }, [publicAuthorDisplay, selectedLearner]);

  const publishChecklist = useMemo(() => {
    return [
      { label: "Add title", done: Boolean(title.trim()) },
      { label: "Select school", done: Boolean(schoolId) },
      { label: "Select learner author", done: Boolean(learnerUid) },
      { label: "Add story content", done: hasContentForPublish(blocks) },
      { label: "Confirm consent", done: consentConfirmed },
    ];
  }, [title, schoolId, learnerUid, blocks, consentConfirmed]);

  const canPublish = publishChecklist.every((item) => item.done);
  const wordCount = useMemo(() => paragraphWordCount(blocks), [blocks]);

  const currentSignature = storySignature({
    id: storyId,
    title,
    language,
    readingLevelTag,
    schoolId,
    anthologyId,
    learnerUid,
    publicAuthorDisplay,
    authorClass,
    authorAbout,
    storyBlurb,
    consentConfirmed,
    blocks,
    tagsInput,
  });
  const unsavedChanges = lastSavedSignature !== currentSignature;

  useEffect(() => {
    if (!open) return;

    const { readingLevel, remaining } = splitTags(story?.tags ?? []);
    const initialBlocks = story?.storyContentBlocks && story.storyContentBlocks.length > 0
      ? story.storyContentBlocks
      : story?.contentText
        ? story.contentText
          .split(/\n\s*\n/g)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph) => ({ type: "paragraph", text: paragraph } as StoryContentBlock))
        : [];

    setMode("edit");
    setSaving(false);
    setStatusMessage("");
    setErrorMessage("");
    setShowChecklist(false);
    setUploadingIndex(null);
    setDragIndex(null);

    setStoryId(story?.id ?? null);
    setPublishStatus(story?.publishStatus ?? "draft");
    setTitle(story?.title ?? "");
    setLanguage(story?.language ?? DEFAULT_LANGUAGE);
    setReadingLevelTag(readingLevel);
    setSchoolId(story?.schoolId ?? "");
    setAnthologyId(story?.anthologyId ?? "");
    setLearnerUid(story?.learnerUid ?? "");
    setSelectedLearner(null);
    setPublicAuthorDisplay(story?.publicAuthorDisplay ?? "");
    setAuthorClass(story?.grade ?? "");
    setAuthorAbout(story?.authorAbout ?? "");
    setStoryBlurb(story?.excerpt ?? "");
    setConsentConfirmed(story?.consentStatus === "approved");
    setBlocks(initialBlocks);
    setTagsInput(remaining);
    setPasteInput("");

    setLastSavedSignature(
      storySignature({
        id: story?.id ?? null,
        title: story?.title ?? "",
        language: story?.language ?? DEFAULT_LANGUAGE,
        readingLevelTag: readingLevel,
        schoolId: story?.schoolId ?? "",
        anthologyId: story?.anthologyId ?? "",
        learnerUid: story?.learnerUid ?? "",
        publicAuthorDisplay: story?.publicAuthorDisplay ?? "",
        authorClass: story?.grade ?? "",
        authorAbout: story?.authorAbout ?? "",
        storyBlurb: story?.excerpt ?? "",
        consentConfirmed: story?.consentStatus === "approved",
        blocks: initialBlocks,
        tagsInput: remaining,
      }),
    );
  }, [open, story]);

  const updateBlock = useCallback((index: number, block: StoryContentBlock) => {
    setBlocks((prev) => prev.map((item, i) => (i === index ? block : item)));
  }, []);

  const removeBlock = useCallback((index: number) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this block?")) {
      return;
    }
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addParagraph = useCallback(() => {
    setBlocks((prev) => [...prev, { type: "paragraph", text: "" }]);
  }, []);

  const addHeading = useCallback(() => {
    setBlocks((prev) => [...prev, { type: "heading", text: "" }]);
  }, []);

  const addIllustration = useCallback(() => {
    setBlocks((prev) => [
      ...prev,
      {
        type: "illustration",
        image_url: "",
        alt_text: "Story illustration",
        caption: "",
        layout: "center",
        keep_with_next: true,
      },
    ]);
  }, []);

  const insertPastedParagraphs = useCallback(() => {
    const chunks = pasteInput
      .split(/\n\s*\n/g)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    if (chunks.length === 0) return;
    setBlocks((prev) => [
      ...prev,
      ...chunks.map((text) => ({ type: "paragraph", text } as StoryContentBlock)),
    ]);
    setPasteInput("");
  }, [pasteInput]);

  const handleLearnerSelect = useCallback((entry: RosterEntry | null) => {
    if (!entry) {
      setSelectedLearner(null);
      setLearnerUid("");
      return;
    }
    if (!("learnerUid" in entry)) return;

    const learner = entry as RosterLearner;
    setSelectedLearner(learner);
    setLearnerUid(learner.learnerUid);
    setAuthorClass(learner.classGrade || "");
    if (!publicAuthorDisplay.trim() || !canEditAuthorIdentity) {
      setPublicAuthorDisplay(learner.fullName);
    }
  }, [canEditAuthorIdentity, publicAuthorDisplay]);

  const handleSchoolChange = useCallback((nextSchoolId: number | "") => {
    if (learnerUid && nextSchoolId !== schoolId && typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Changing school will reset selected learner. Continue?",
      );
      if (!confirmed) {
        return;
      }
    }
    setSchoolId(nextSchoolId);
    if (nextSchoolId !== schoolId) {
      setLearnerUid("");
      setSelectedLearner(null);
    }
  }, [learnerUid, schoolId]);

  const handleUploadIllustration = useCallback(async (index: number, file: File) => {
    setErrorMessage("");
    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/portal/stories/media", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to upload image.");
      }
      setBlocks((prev) =>
        prev.map((block, i) => {
          if (i !== index || block.type !== "illustration") return block;
          return {
            ...block,
            image_url: String(data.url || ""),
            alt_text: block.alt_text || "Story illustration",
          };
        }),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingIndex(null);
    }
  }, []);

  const handleDropBlock = useCallback((targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      return;
    }
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  }, [dragIndex]);

  const saveStoryDraft = useCallback(async () => {
    if (!title.trim()) {
      setErrorMessage("Add a story title before saving.");
      return null;
    }
    if (!schoolId) {
      setErrorMessage("Select a school before saving.");
      return null;
    }

    setSaving(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const response = await fetch("/api/portal/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-story",
          id: storyId ?? undefined,
          title: title.trim(),
          language: language.trim() || DEFAULT_LANGUAGE,
          schoolId: Number(schoolId),
          anthologyId: anthologyId ? Number(anthologyId) : null,
          publicAuthorDisplay: initializedAuthorDisplay,
          learnerUid: learnerUid || null,
          grade: authorClass.trim(),
          authorAbout: authorAbout.trim(),
          excerpt: storyBlurb.trim(),
          tags: normalizeTags(tagsInput, readingLevelTag),
          consentStatus: consentConfirmed ? "approved" : "pending",
          storyContentBlocks: blocks,
          contentText: blocks
            .filter((block) => block.type !== "illustration")
            .map((block) => block.text)
            .join("\n\n"),
          pageStart: story?.pageStart ?? 1,
          pageEnd: story?.pageEnd ?? 1,
          sortOrder: story?.sortOrder ?? 0,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save story draft.");
      }
      const savedStory = data.story as StoryRecord;
      setStoryId(savedStory.id);
      setPublishStatus(savedStory.publishStatus);
      setLastSavedSignature(currentSignature);
      onSaved(savedStory);
      setStatusMessage("Draft saved.");
      return savedStory;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save draft.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [
    title,
    schoolId,
    storyId,
    language,
    anthologyId,
    initializedAuthorDisplay,
    learnerUid,
    authorClass,
    authorAbout,
    storyBlurb,
    tagsInput,
    readingLevelTag,
    consentConfirmed,
    blocks,
    story,
    onSaved,
    currentSignature,
  ]);

  const publishStory = useCallback(async () => {
    setShowChecklist(true);
    if (!canPublish) {
      setErrorMessage("Complete the publish checklist first.");
      return;
    }
    const savedStory = await saveStoryDraft();
    if (!savedStory) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const response = await fetch("/api/portal/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          storyId: savedStory.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Publish failed.");
      }
      const published = data.story as StoryRecord;
      onSaved(published);
      setPublishStatus(published.publishStatus);
      setStatusMessage("Story published successfully.");
      setMode("preview");
      setLastSavedSignature(currentSignature);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Publish failed.");
    } finally {
      setSaving(false);
    }
  }, [canPublish, saveStoryDraft, onSaved, currentSignature]);

  const unpublishStory = useCallback(async () => {
    if (!canUnpublish || storyId === null) return;
    setSaving(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const response = await fetch("/api/portal/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unpublish",
          storyId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unpublish failed.");
      }
      const draft = data.story as StoryRecord;
      onSaved(draft);
      setPublishStatus(draft.publishStatus);
      setStatusMessage("Story unpublished.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unpublish failed.");
    } finally {
      setSaving(false);
    }
  }, [canUnpublish, storyId, onSaved]);

  const footer = (
    <div className="story-studio-footer">
      <button
        type="button"
        className="button button-ghost"
        onClick={onClose}
        disabled={saving}
      >
        Cancel / Close
      </button>
      <div className="story-studio-footer-actions">
        {canUnpublish ? (
          <button
            type="button"
            className="button button-ghost"
            onClick={unpublishStory}
            disabled={saving}
          >
            Unpublish
          </button>
        ) : null}
        <button
          type="button"
          className="button button-ghost"
          onClick={() => setMode((prev) => (prev === "edit" ? "preview" : "edit"))}
          disabled={saving}
        >
          {mode === "edit" ? "Preview" : "Edit"}
        </button>
        <button
          type="button"
          className="button button-ghost"
          onClick={() => {
            void saveStoryDraft();
          }}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Draft"}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            void publishStory();
          }}
          disabled={saving || !canPublish}
        >
          Publish
        </button>
      </div>
    </div>
  );

  return (
    <FloatingSurface
      open={open}
      onClose={onClose}
      variant="modal"
      maxWidth="780px"
      title={storyId ? "Story Studio — Edit Story" : "Story Studio — New Story"}
      description="Build story details, add simple content blocks, preview, then publish."
      statusChip={publishStatus.toUpperCase()}
      footer={footer}
      unsavedChanges={unsavedChanges}
      confirmCloseMessage="You have unsaved Story Studio changes. Close anyway?"
    >
      <div className="story-studio">
        {errorMessage ? <p className="story-studio-error">{errorMessage}</p> : null}
        {statusMessage ? <p className="story-studio-success">{statusMessage}</p> : null}

        {mode === "edit" ? (
          <>
            <section className="story-studio-section">
              <header className="story-studio-section-header">
                <h3>Story Details</h3>
                <p>Keep this simple. Select school and learner author first.</p>
              </header>

              <div className="story-studio-grid story-studio-grid--two">
                <label className="story-studio-field">
                  <span>Title *</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Enter story title"
                  />
                </label>
                <label className="story-studio-field">
                  <span>Language</span>
                  <input
                    type="text"
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    placeholder="English"
                  />
                </label>
              </div>

              <div className="story-studio-grid story-studio-grid--two">
                <label className="story-studio-field">
                  <span>Reading level (optional tag)</span>
                  <input
                    type="text"
                    value={readingLevelTag}
                    onChange={(event) => setReadingLevelTag(event.target.value)}
                    placeholder="e.g. Emerging Reader"
                  />
                </label>
                <label className="story-studio-field">
                  <span>Anthology (optional)</span>
                  <select
                    value={anthologyId}
                    onChange={(event) =>
                      setAnthologyId(event.target.value ? Number(event.target.value) : "")
                    }
                  >
                    <option value="">No anthology linked</option>
                    {anthologies.map((anthology) => (
                      <option key={anthology.id} value={anthology.id}>
                        {anthology.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="story-studio-grid story-studio-grid--two">
                <label className="story-studio-field">
                  <span>School *</span>
                  <select
                    value={schoolId}
                    onChange={(event) =>
                      handleSchoolChange(event.target.value ? Number(event.target.value) : "")
                    }
                  >
                    <option value="">Select school</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name} — {school.district}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="story-studio-field">
                  <span>Additional tags (optional)</span>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(event) => setTagsInput(event.target.value)}
                    placeholder="comma, separated, tags"
                  />
                </label>
              </div>

              <div className="story-studio-scope-chip">
                Saving to: {selectedSchool ? `${selectedSchool.name}, ${selectedSchool.district}` : "Select a school"}
              </div>

              <div className="story-studio-author-picker">
                <SchoolRosterPicker
                  schoolId={schoolId ? Number(schoolId) : null}
                  schoolName={selectedSchool?.name}
                  participantType="learner"
                  selectedUid={learnerUid}
                  onSelect={handleLearnerSelect}
                  label="Author (learner from school roster) *"
                />
              </div>

              <div className="story-studio-author-card">
                <div className="story-studio-author-avatar" aria-hidden>
                  {(selectedLearner?.fullName || initializedAuthorDisplay || "L")
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="story-studio-author-meta">
                  <p>
                    <strong>Name:</strong>{" "}
                    {canEditAuthorIdentity ? (
                      <input
                        type="text"
                        value={publicAuthorDisplay}
                        onChange={(event) => setPublicAuthorDisplay(event.target.value)}
                        placeholder="Author display name"
                      />
                    ) : (
                      initializedAuthorDisplay
                    )}
                  </p>
                  <p>
                    <strong>Age:</strong> {selectedLearner?.age ?? "Not available in roster"}
                  </p>
                  <p>
                    <strong>Class:</strong>{" "}
                    <input
                      type="text"
                      value={authorClass}
                      onChange={(event) => setAuthorClass(event.target.value)}
                      placeholder="e.g. P4"
                      disabled={!canEditAuthorIdentity && Boolean(selectedLearner?.classGrade)}
                    />
                  </p>
                  <p>
                    <strong>Photo:</strong> Learner profile photo is not available in roster data.
                  </p>
                </div>
              </div>

              <div className="story-studio-grid">
                <label className="story-studio-field">
                  <span>About the author</span>
                  <textarea
                    rows={3}
                    value={authorAbout}
                    onChange={(event) => setAuthorAbout(event.target.value)}
                    placeholder="Short bio about the learner author."
                  />
                </label>
                <label className="story-studio-field">
                  <span>About this story (blurb)</span>
                  <textarea
                    rows={3}
                    value={storyBlurb}
                    onChange={(event) => setStoryBlurb(event.target.value)}
                    placeholder="Two to three lines about what this story is about."
                  />
                </label>
              </div>

              <label className="story-studio-consent">
                <input
                  type="checkbox"
                  checked={consentConfirmed}
                  onChange={(event) => setConsentConfirmed(event.target.checked)}
                />
                <span>
                  I confirm written parent + school consent has been obtained for publishing learner
                  name/photo/age/class details.
                </span>
              </label>
            </section>

            <section className="story-studio-section">
              <header className="story-studio-section-header">
                <h3>Story Content</h3>
                <p>
                  Add simple blocks only: paragraphs, headings, and illustrations. Drag to reorder.
                </p>
              </header>

              <div className="story-studio-block-actions">
                <button type="button" className="button button-ghost" onClick={addParagraph}>
                  Add paragraph
                </button>
                <button type="button" className="button button-ghost" onClick={addHeading}>
                  Add section heading
                </button>
                <button type="button" className="button button-ghost" onClick={addIllustration}>
                  Add illustration
                </button>
              </div>

              <div className="story-studio-paste">
                <label className="story-studio-field">
                  <span>Paste story text (optional)</span>
                  <textarea
                    rows={4}
                    value={pasteInput}
                    onChange={(event) => setPasteInput(event.target.value)}
                    placeholder="Paste text here. Blank lines will split into paragraph blocks."
                  />
                </label>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={insertPastedParagraphs}
                  disabled={!pasteInput.trim()}
                >
                  Paste story text into blocks
                </button>
              </div>

              {blocks.length === 0 ? (
                <div className="story-studio-empty">
                  Add your first paragraph or paste story text to begin.
                </div>
              ) : (
                <div className="story-studio-block-list">
                  {blocks.map((block, index) => (
                    <article
                      key={`${block.type}-${index}`}
                      className="story-studio-block"
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDropBlock(index)}
                    >
                      <header className="story-studio-block-header">
                        <strong>{block.type}</strong>
                        <div className="story-studio-block-header-actions">
                          <button
                            type="button"
                            className="button button-ghost"
                            onClick={() => removeBlock(index)}
                          >
                            Delete
                          </button>
                        </div>
                      </header>

                      {block.type === "paragraph" || block.type === "heading" ? (
                        <textarea
                          rows={block.type === "heading" ? 2 : 5}
                          value={block.text}
                          onChange={(event) =>
                            updateBlock(index, { ...block, text: event.target.value })
                          }
                          placeholder={
                            block.type === "heading"
                              ? "Section heading"
                              : "Write paragraph text..."
                          }
                        />
                      ) : (
                        <div className="story-studio-illustration-fields">
                          <label className="story-studio-field">
                            <span>Image URL</span>
                            <input
                              type="text"
                              value={block.image_url}
                              onChange={(event) =>
                                updateBlock(index, { ...block, image_url: event.target.value })
                              }
                              placeholder="/uploads/stories/2026/03/image.png"
                            />
                          </label>
                          <label className="story-studio-field">
                            <span>Upload image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  void handleUploadIllustration(index, file);
                                }
                              }}
                            />
                          </label>
                          <label className="story-studio-field">
                            <span>Caption (optional)</span>
                            <input
                              type="text"
                              value={block.caption ?? ""}
                              onChange={(event) =>
                                updateBlock(index, { ...block, caption: event.target.value })
                              }
                            />
                          </label>
                          <label className="story-studio-field">
                            <span>Alt text</span>
                            <input
                              type="text"
                              value={block.alt_text}
                              onChange={(event) =>
                                updateBlock(index, { ...block, alt_text: event.target.value })
                              }
                            />
                          </label>
                          <div className="story-studio-grid story-studio-grid--two">
                            <label className="story-studio-field">
                              <span>Alignment</span>
                              <select
                                value={block.layout ?? "center"}
                                onChange={(event) =>
                                  updateBlock(index, {
                                    ...block,
                                    layout: event.target.value as
                                      | "full"
                                      | "center"
                                      | "inset-left"
                                      | "inset-right",
                                  })
                                }
                              >
                                <option value="full">Full width</option>
                                <option value="center">Center</option>
                                <option value="inset-left">Inset left</option>
                                <option value="inset-right">Inset right</option>
                              </select>
                            </label>
                            <div className="story-studio-field story-studio-checkbox-field">
                              <span>Placement</span>
                              <label className="story-studio-inline-check">
                                <input
                                  type="checkbox"
                                  checked={Boolean(block.keep_with_next)}
                                  onChange={(event) =>
                                    updateBlock(index, {
                                      ...block,
                                      keep_with_next: event.target.checked,
                                    })
                                  }
                                />
                                Keep with next paragraph
                              </label>
                            </div>
                          </div>

                          {uploadingIndex === index ? (
                            <p className="story-studio-upload-status">Uploading image…</p>
                          ) : null}
                          {block.image_url ? (
                            <img
                              src={block.image_url}
                              alt={block.alt_text || "Story illustration preview"}
                              className="story-studio-image-preview"
                            />
                          ) : null}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="story-studio-section">
              <header className="story-studio-section-header">
                <h3>Publish Checklist</h3>
                <p>Publish is enabled only when all required items are complete.</p>
              </header>
              <ul className="story-studio-checklist">
                {publishChecklist.map((item) => (
                  <li key={item.label} data-done={item.done}>
                    <span aria-hidden>{item.done ? "✓" : "•"}</span> {item.label}
                  </li>
                ))}
              </ul>
              <p className="story-studio-wordcount">
                Content: {blocks.length} blocks • {wordCount} words
                {showChecklist && !hasContentForPublish(blocks)
                  ? ` (Need at least ${MIN_BLOCKS} blocks or ${MIN_WORD_COUNT}+ words.)`
                  : ""}
              </p>
            </section>
          </>
        ) : (
          <section className="story-studio-section">
            <header className="story-studio-section-header">
              <h3>Preview Mode</h3>
              <p>This preview mirrors the public story page layout and reader behavior.</p>
            </header>

            <div className="story-studio-preview-cover">
              <p className="kicker">1001 Story Project</p>
              <h1>{title || "Untitled story"}</h1>
              {storyBlurb.trim() ? <p className="story-studio-preview-blurb">{storyBlurb}</p> : null}

              {consentConfirmed ? (
                <div className="story-studio-preview-author-card">
                  <div className="story-studio-author-avatar" aria-hidden>
                    {(initializedAuthorDisplay || "L").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p>
                      <strong>{initializedAuthorDisplay}</strong>
                    </p>
                    <p>{authorClass || "Class not set"} • {selectedSchool?.name || "School not selected"}</p>
                  </div>
                </div>
              ) : (
                <div className="story-studio-preview-anon">
                  Personal learner details remain hidden until consent is confirmed.
                </div>
              )}

              <p className="story-studio-preview-disclaimer">
                Learner name, photo, age, and school details are published with written consent from
                the parent/guardian and the school.
              </p>
            </div>

            <StoryReader
              title={title || "Untitled story"}
              author={consentConfirmed ? initializedAuthorDisplay : "Anonymous Learner"}
              blocks={blocks}
            />
          </section>
        )}
      </div>
    </FloatingSurface>
  );
}
