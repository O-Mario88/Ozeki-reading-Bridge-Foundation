"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  AboutTeamSection,
  PortalCoreValueRecord,
  PortalLeadershipTeamMemberRecord,
} from "@/lib/types";

type LeadershipMemberView = PortalLeadershipTeamMemberRecord & {
  photoUrl: string | null;
};

type PortalAboutContentManagerProps = {
  initialMembers: LeadershipMemberView[];
  initialValues: PortalCoreValueRecord[];
};

type FeedbackState = {
  kind: "idle" | "success" | "error";
  message: string;
};

type LeadershipFormState = {
  id: number | null;
  section: AboutTeamSection;
  name: string;
  role: string;
  biography: string;
  background: string;
  career: string;
  photoAlt: string;
  sortOrder: number;
  isPublished: boolean;
  removePhoto: boolean;
};

type CoreValueFormState = {
  id: number | null;
  title: string;
  description: string;
  sortOrder: number;
  isPublished: boolean;
};

const sectionCopy: Record<
  AboutTeamSection,
  { kicker: string; title: string }
> = {
  board: { kicker: "Board Members", title: "Board Governance" },
  staff: { kicker: "Staff", title: "Core Staff Team" },
  volunteer: { kicker: "Volunteers", title: "Volunteer Team" },
};

const defaultLeadershipForm: LeadershipFormState = {
  id: null,
  section: "board",
  name: "",
  role: "",
  biography: "",
  background: "",
  career: "",
  photoAlt: "",
  sortOrder: 0,
  isPublished: true,
  removePhoto: false,
};

const defaultCoreValueForm: CoreValueFormState = {
  id: null,
  title: "",
  description: "",
  sortOrder: 0,
  isPublished: true,
};

function sortMembers(items: LeadershipMemberView[]) {
  const sectionOrder: Record<AboutTeamSection, number> = {
    board: 1,
    staff: 2,
    volunteer: 3,
  };
  return [...items].sort((left, right) => {
    const sectionDelta = sectionOrder[left.section] - sectionOrder[right.section];
    if (sectionDelta !== 0) {
      return sectionDelta;
    }
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function sortValues(items: PortalCoreValueRecord[]) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export function PortalAboutContentManager({
  initialMembers,
  initialValues,
}: PortalAboutContentManagerProps) {
  const [members, setMembers] = useState<LeadershipMemberView[]>(() =>
    sortMembers(initialMembers),
  );
  const [coreValues, setCoreValues] = useState<PortalCoreValueRecord[]>(() =>
    sortValues(initialValues),
  );
  const [leadershipForm, setLeadershipForm] =
    useState<LeadershipFormState>(defaultLeadershipForm);
  const [coreValueForm, setCoreValueForm] =
    useState<CoreValueFormState>(defaultCoreValueForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [savingLeadership, setSavingLeadership] = useState(false);
  const [savingCoreValue, setSavingCoreValue] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({
    kind: "idle",
    message: "",
  });
  const [formKey, setFormKey] = useState(0);

  const membersBySection = useMemo(() => {
    return {
      board: members.filter((item) => item.section === "board"),
      staff: members.filter((item) => item.section === "staff"),
      volunteer: members.filter((item) => item.section === "volunteer"),
    };
  }, [members]);

  function resetLeadershipForm() {
    setLeadershipForm(defaultLeadershipForm);
    setPhotoFile(null);
    setFormKey((prev) => prev + 1);
  }

  function resetCoreValueForm() {
    setCoreValueForm(defaultCoreValueForm);
  }

  function handleLeadershipChange(
    field: keyof LeadershipFormState,
    value: string | number | boolean,
  ) {
    setLeadershipForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCoreValueChange(
    field: keyof CoreValueFormState,
    value: string | number | boolean,
  ) {
    setCoreValueForm((prev) => ({ ...prev, [field]: value }));
  }

  function beginEditMember(member: LeadershipMemberView) {
    setLeadershipForm({
      id: member.id,
      section: member.section,
      name: member.name,
      role: member.role,
      biography: member.biography,
      background: member.background,
      career: member.career,
      photoAlt: member.photoAlt ?? "",
      sortOrder: member.sortOrder,
      isPublished: member.isPublished,
      removePhoto: false,
    });
    setPhotoFile(null);
    setFormKey((prev) => prev + 1);
  }

  function beginEditCoreValue(value: PortalCoreValueRecord) {
    setCoreValueForm({
      id: value.id,
      title: value.title,
      description: value.description,
      sortOrder: value.sortOrder,
      isPublished: value.isPublished,
    });
  }

  async function handleLeadershipSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingLeadership(true);
    setFeedback({ kind: "idle", message: "" });
    try {
      const formData = new FormData();
      if (leadershipForm.id) {
        formData.set("id", String(leadershipForm.id));
      }
      formData.set("section", leadershipForm.section);
      formData.set("name", leadershipForm.name);
      formData.set("role", leadershipForm.role);
      formData.set("biography", leadershipForm.biography);
      formData.set("background", leadershipForm.background);
      formData.set("career", leadershipForm.career);
      formData.set("photoAlt", leadershipForm.photoAlt);
      formData.set("sortOrder", String(leadershipForm.sortOrder));
      formData.set("isPublished", leadershipForm.isPublished ? "1" : "0");
      formData.set("removePhoto", leadershipForm.removePhoto ? "1" : "0");
      if (photoFile) {
        formData.set("photo", photoFile);
      }

      const response = await fetch("/api/portal/about/team", {
        method: leadershipForm.id ? "PATCH" : "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        member?: LeadershipMemberView;
      };
      if (!response.ok || !data.member) {
        throw new Error(data.error ?? "Could not save leadership team member.");
      }
      setMembers((prev) => {
        const next = leadershipForm.id
          ? prev.map((item) => (item.id === data.member!.id ? data.member! : item))
          : [data.member!, ...prev];
        return sortMembers(next);
      });
      setFeedback({
        kind: "success",
        message: leadershipForm.id
          ? "Leadership team member updated."
          : "Leadership team member created.",
      });
      resetLeadershipForm();
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not save leadership team member.",
      });
    } finally {
      setSavingLeadership(false);
    }
  }

  async function handleMemberPublishToggle(member: LeadershipMemberView) {
    setFeedback({ kind: "idle", message: "" });
    try {
      const formData = new FormData();
      formData.set("id", String(member.id));
      formData.set("section", member.section);
      formData.set("name", member.name);
      formData.set("role", member.role);
      formData.set("biography", member.biography);
      formData.set("background", member.background);
      formData.set("career", member.career);
      formData.set("photoAlt", member.photoAlt ?? "");
      formData.set("sortOrder", String(member.sortOrder));
      formData.set("isPublished", member.isPublished ? "0" : "1");
      const response = await fetch("/api/portal/about/team", {
        method: "PATCH",
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        member?: LeadershipMemberView;
      };
      if (!response.ok || !data.member) {
        throw new Error(data.error ?? "Could not update publish state.");
      }
      setMembers((prev) =>
        sortMembers(prev.map((item) => (item.id === data.member!.id ? data.member! : item))),
      );
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Could not update publish state.",
      });
    }
  }

  async function handleMemberDelete(member: LeadershipMemberView) {
    if (!window.confirm(`Delete ${member.name}? This cannot be undone.`)) {
      return;
    }
    setFeedback({ kind: "idle", message: "" });
    try {
      const response = await fetch("/api/portal/about/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete leadership team member.");
      }
      setMembers((prev) => prev.filter((item) => item.id !== member.id));
      if (leadershipForm.id === member.id) {
        resetLeadershipForm();
      }
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not delete leadership team member.",
      });
    }
  }

  async function handleCoreValueSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCoreValue(true);
    setFeedback({ kind: "idle", message: "" });
    try {
      const response = await fetch("/api/portal/about/core-values", {
        method: coreValueForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coreValueForm),
      });
      const data = (await response.json()) as {
        error?: string;
        value?: PortalCoreValueRecord;
      };
      if (!response.ok || !data.value) {
        throw new Error(data.error ?? "Could not save core value.");
      }
      setCoreValues((prev) => {
        const next = coreValueForm.id
          ? prev.map((item) => (item.id === data.value!.id ? data.value! : item))
          : [data.value!, ...prev];
        return sortValues(next);
      });
      setFeedback({
        kind: "success",
        message: coreValueForm.id ? "Core value updated." : "Core value created.",
      });
      resetCoreValueForm();
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not save core value.",
      });
    } finally {
      setSavingCoreValue(false);
    }
  }

  async function handleCoreValuePublishToggle(value: PortalCoreValueRecord) {
    setFeedback({ kind: "idle", message: "" });
    try {
      const response = await fetch("/api/portal/about/core-values", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: value.id,
          title: value.title,
          description: value.description,
          sortOrder: value.sortOrder,
          isPublished: !value.isPublished,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        value?: PortalCoreValueRecord;
      };
      if (!response.ok || !data.value) {
        throw new Error(data.error ?? "Could not update core value state.");
      }
      setCoreValues((prev) =>
        sortValues(prev.map((item) => (item.id === data.value!.id ? data.value! : item))),
      );
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not update core value state.",
      });
    }
  }

  async function handleCoreValueDelete(value: PortalCoreValueRecord) {
    if (!window.confirm(`Delete "${value.title}"? This cannot be undone.`)) {
      return;
    }
    setFeedback({ kind: "idle", message: "" });
    try {
      const response = await fetch("/api/portal/about/core-values", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: value.id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete core value.");
      }
      setCoreValues((prev) => prev.filter((item) => item.id !== value.id));
      if (coreValueForm.id === value.id) {
        resetCoreValueForm();
      }
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not delete core value.",
      });
    }
  }

  return (
    <div className="portal-grid">
      <section className="card">
        <h2>Leadership Team</h2>
        <p>
          Add board, staff, and volunteer profiles exactly as they appear on the public
          leadership page. Unpublished records stay hidden from the public site.
        </p>
        {feedback.message ? (
          <p
            role="status"
            className={`form-message ${
              feedback.kind === "error" ? "error" : "success"
            }`}
          >
            {feedback.message}
          </p>
        ) : null}

        <form
          key={formKey}
          onSubmit={(event) => void handleLeadershipSubmit(event)}
          style={{ display: "grid", gap: "0.9rem", marginTop: "1rem" }}
        >
          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label>
              Section
              <select
                value={leadershipForm.section}
                onChange={(event) =>
                  handleLeadershipChange("section", event.target.value as AboutTeamSection)
                }
              >
                <option value="board">Board</option>
                <option value="staff">Staff</option>
                <option value="volunteer">Volunteer</option>
              </select>
            </label>
            <label>
              Sort order
              <input
                type="number"
                min={0}
                value={leadershipForm.sortOrder}
                onChange={(event) =>
                  handleLeadershipChange("sortOrder", Number(event.target.value || 0))
                }
              />
            </label>
            <label>
              Publish now
              <select
                value={leadershipForm.isPublished ? "yes" : "no"}
                onChange={(event) =>
                  handleLeadershipChange("isPublished", event.target.value === "yes")
                }
              >
                <option value="yes">Published</option>
                <option value="no">Draft</option>
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label>
              Name
              <input
                type="text"
                value={leadershipForm.name}
                onChange={(event) => handleLeadershipChange("name", event.target.value)}
              />
            </label>
            <label>
              Role
              <input
                type="text"
                value={leadershipForm.role}
                onChange={(event) => handleLeadershipChange("role", event.target.value)}
              />
            </label>
          </div>

          <label>
            Biography
            <textarea
              rows={4}
              value={leadershipForm.biography}
              onChange={(event) => handleLeadershipChange("biography", event.target.value)}
            />
          </label>

          <label>
            Background
            <textarea
              rows={3}
              value={leadershipForm.background}
              onChange={(event) => handleLeadershipChange("background", event.target.value)}
            />
          </label>

          <label>
            Career
            <textarea
              rows={3}
              value={leadershipForm.career}
              onChange={(event) => handleLeadershipChange("career", event.target.value)}
            />
          </label>

          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label>
              Profile photo
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.avif"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setPhotoFile(event.target.files?.[0] ?? null)
                }
              />
            </label>
            <label>
              Photo alt text
              <input
                type="text"
                value={leadershipForm.photoAlt}
                onChange={(event) => handleLeadershipChange("photoAlt", event.target.value)}
              />
            </label>
          </div>

          {leadershipForm.id ? (
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <input
                type="checkbox"
                checked={leadershipForm.removePhoto}
                onChange={(event) =>
                  handleLeadershipChange("removePhoto", event.target.checked)
                }
              />
              Remove current profile photo
            </label>
          ) : null}

          <div className="action-row">
            <button className="button" type="submit" disabled={savingLeadership}>
              {savingLeadership
                ? "Saving..."
                : leadershipForm.id
                  ? "Update team member"
                  : "Add team member"}
            </button>
            {leadershipForm.id ? (
              <button
                className="button button-ghost"
                type="button"
                onClick={resetLeadershipForm}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Current Leadership Profiles</h2>
        {members.length === 0 ? (
          <p>No leadership profiles have been added yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {(["board", "staff", "volunteer"] as AboutTeamSection[]).map((section) => (
              <div key={section} style={{ display: "grid", gap: "0.75rem" }}>
                <div>
                  <p className="kicker">{sectionCopy[section].kicker}</p>
                  <h3 style={{ margin: 0 }}>{sectionCopy[section].title}</h3>
                </div>
                {membersBySection[section].length === 0 ? (
                  <p className="portal-muted">No profiles in this section yet.</p>
                ) : (
                  membersBySection[section].map((member) => (
                    <article
                      key={member.id}
                      className="card"
                      style={{
                        display: "grid",
                        gap: "0.9rem",
                        gridTemplateColumns: "160px minmax(0, 1fr)",
                      }}
                    >
                      <div>
                        {member.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.photoUrl}
                            alt={member.photoAlt || member.name}
                            style={{
                              width: "100%",
                              aspectRatio: "4 / 3",
                              borderRadius: "12px",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              aspectRatio: "4 / 3",
                              borderRadius: "12px",
                              display: "grid",
                              placeItems: "center",
                              background:
                                "linear-gradient(135deg, var(--color-brand-blue), #101828)",
                              color: "#fff",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                            }}
                          >
                            {member.name
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase() ?? "")
                              .join("")}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "grid", gap: "0.45rem" }}>
                        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                          <h3 style={{ margin: 0 }}>{member.name}</h3>
                          <span className="meta-pill">
                            {member.isPublished ? "Published" : "Draft"}
                          </span>
                        </div>
                        <p style={{ margin: 0, color: "var(--md-sys-color-on-surface-variant)", fontWeight: 600 }}>
                          {member.role}
                        </p>
                        <p style={{ margin: 0 }}>{member.biography}</p>
                        <p style={{ margin: 0 }}>
                          <strong>Background:</strong> {member.background}
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Career:</strong> {member.career}
                        </p>
                        <div className="action-row">
                          <button
                            className="button button-ghost"
                            type="button"
                            onClick={() => beginEditMember(member)}
                          >
                            Edit
                          </button>
                          <button
                            className="button button-ghost"
                            type="button"
                            onClick={() => void handleMemberPublishToggle(member)}
                          >
                            {member.isPublished ? "Unpublish" : "Publish"}
                          </button>
                          <button
                            className="button button-ghost"
                            type="button"
                            onClick={() => void handleMemberDelete(member)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Core Values</h2>
        <p>
          Add each public core value with only the title and description. These render as
          full-width cards on the About page.
        </p>
        <form
          onSubmit={(event) => void handleCoreValueSubmit(event)}
          style={{ display: "grid", gap: "0.9rem", marginTop: "1rem" }}
        >
          <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label>
              Title
              <input
                type="text"
                value={coreValueForm.title}
                onChange={(event) => handleCoreValueChange("title", event.target.value)}
              />
            </label>
            <label>
              Sort order
              <input
                type="number"
                min={0}
                value={coreValueForm.sortOrder}
                onChange={(event) =>
                  handleCoreValueChange("sortOrder", Number(event.target.value || 0))
                }
              />
            </label>
            <label>
              Publish now
              <select
                value={coreValueForm.isPublished ? "yes" : "no"}
                onChange={(event) =>
                  handleCoreValueChange("isPublished", event.target.value === "yes")
                }
              >
                <option value="yes">Published</option>
                <option value="no">Draft</option>
              </select>
            </label>
          </div>
          <label>
            Description
            <textarea
              rows={5}
              value={coreValueForm.description}
              onChange={(event) =>
                handleCoreValueChange("description", event.target.value)
              }
            />
          </label>
          <div className="action-row">
            <button className="button" type="submit" disabled={savingCoreValue}>
              {savingCoreValue
                ? "Saving..."
                : coreValueForm.id
                  ? "Update core value"
                  : "Add core value"}
            </button>
            {coreValueForm.id ? (
              <button
                className="button button-ghost"
                type="button"
                onClick={resetCoreValueForm}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Current Core Values</h2>
        {coreValues.length === 0 ? (
          <p>No core values have been added yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.9rem" }}>
            {coreValues.map((value) => (
              <article className="card" key={value.id}>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>{value.title}</h3>
                  <span className="meta-pill">
                    {value.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <p style={{ marginTop: "0.65rem", marginBottom: 0 }}>{value.description}</p>
                <div className="action-row" style={{ marginTop: "0.85rem" }}>
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => beginEditCoreValue(value)}
                  >
                    Edit
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => void handleCoreValuePublishToggle(value)}
                  >
                    {value.isPublished ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => void handleCoreValueDelete(value)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
