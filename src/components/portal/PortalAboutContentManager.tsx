"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import type { PortalLeadershipTeamMemberRecord } from "@/lib/types";

type LeadershipMemberView = PortalLeadershipTeamMemberRecord & {
  photoUrl: string | null;
};

type PortalAboutContentManagerProps = {
  initialMembers: LeadershipMemberView[];
};

type FeedbackState = {
  kind: "idle" | "success" | "error";
  message: string;
};

type LeadershipFormState = {
  id: number | null;
  name: string;
  role: string;
  about: string;
  removePhoto: boolean;
};

const defaultLeadershipForm: LeadershipFormState = {
  id: null,
  name: "",
  role: "",
  about: "",
  removePhoto: false,
};

export function PortalAboutContentManager({
  initialMembers,
}: PortalAboutContentManagerProps) {
  const [members, setMembers] = useState<LeadershipMemberView[]>(() =>
    [...initialMembers].sort((a, b) => a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt)),
  );
  const [leadershipForm, setLeadershipForm] =
    useState<LeadershipFormState>(defaultLeadershipForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [savingLeadership, setSavingLeadership] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({
    kind: "idle",
    message: "",
  });
  const [formKey, setFormKey] = useState(0);

  function resetLeadershipForm() {
    setLeadershipForm(defaultLeadershipForm);
    setPhotoFile(null);
    setFormKey((prev) => prev + 1);
  }

  function handleLeadershipChange(
    field: keyof LeadershipFormState,
    value: string | number | boolean,
  ) {
    setLeadershipForm((prev) => ({ ...prev, [field]: value }));
  }

  function beginEditMember(member: LeadershipMemberView) {
    setLeadershipForm({
      id: member.id,
      name: member.name,
      role: member.role,
      about: member.about,
      removePhoto: false,
    });
    setPhotoFile(null);
    setFormKey((prev) => prev + 1);
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
      formData.set("name", leadershipForm.name);
      formData.set("role", leadershipForm.role);
      formData.set("about", leadershipForm.about);
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
        return next;
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

  return (
    <div className="portal-grid">
      <section className="card">
        <h2>Leadership Team</h2>
        <p>
          Add leadership profiles. Each member is shown on the public leadership
          team page with their name, role, about text, and photo.
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
              Name
              <input
                type="text"
                value={leadershipForm.name}
                onChange={(event) => handleLeadershipChange("name", event.target.value)}
                required
              />
            </label>
            <label>
              Role
              <input
                type="text"
                value={leadershipForm.role}
                onChange={(event) => handleLeadershipChange("role", event.target.value)}
                required
              />
            </label>
          </div>

          <label>
            About
            <textarea
              rows={4}
              value={leadershipForm.about}
              onChange={(event) => handleLeadershipChange("about", event.target.value)}
              placeholder="A short description about this person..."
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
            {members.map((member) => (
              <article
                key={member.id}
                className="card"
                style={{
                  display: "grid",
                  gap: "0.9rem",
                  gridTemplateColumns: "120px minmax(0, 1fr)",
                }}
              >
                <div>
                  {member.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.photoUrl}
                      alt={member.name}
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        borderRadius: "50%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background:
                          "linear-gradient(135deg, var(--color-brand-blue), #101828)",
                        color: "#fff",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        fontSize: "1.4rem",
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
                <div style={{ display: "grid", gap: "0.35rem" }}>
                  <h3 style={{ margin: 0 }}>{member.name}</h3>
                  <p style={{ margin: 0, color: "var(--md-sys-color-on-surface-variant)", fontWeight: 600 }}>
                    {member.role}
                  </p>
                  {member.about && (
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#555" }}>
                      {member.about}
                    </p>
                  )}
                  <div className="action-row" style={{ marginTop: "0.5rem" }}>
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
                      onClick={() => void handleMemberDelete(member)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
