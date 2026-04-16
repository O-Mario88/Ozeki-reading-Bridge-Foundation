"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type OrganizationProfile = {
  id: string | null;
  name: string;
  address: string;
  poBox: string;
  telephone: string;
  email: string;
  tin: string;
  registrationNumber: string;
  logoStorageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Feedback = {
  kind: "idle" | "success" | "error";
  message: string;
};

const emptyProfile: OrganizationProfile = {
  id: null,
  name: "",
  address: "",
  poBox: "",
  telephone: "",
  email: "",
  tin: "",
  registrationNumber: "",
  logoStorageUrl: null,
  isActive: true,
  createdAt: "",
  updatedAt: "",
};

export function OrganizationProfileManager() {
  const [profile, setProfile] = useState<OrganizationProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle", message: "" });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch("/api/portal/admin/organization-profile", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as { profile?: OrganizationProfile; error?: string };
        if (!response.ok || !json.profile) {
          throw new Error(json.error ?? "Could not load organization profile.");
        }
        if (mounted) {
          setProfile(json.profile);
        }
      })
      .catch((error) => {
        if (mounted) {
          setFeedback({
            kind: "error",
            message: error instanceof Error ? error.message : "Could not load organization profile.",
          });
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const logoPreviewUrl = useMemo(() => {
    const value = profile.logoStorageUrl?.trim();
    if (!value) {
      return "/photos/PXL_20260217_124415441.MP.jpg";
    }
    return value;
  }, [profile.logoStorageUrl]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback({ kind: "idle", message: "" });

    try {
      const response = await fetch("/api/portal/admin/organization-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          address: profile.address,
          poBox: profile.poBox,
          telephone: profile.telephone,
          email: profile.email,
          tin: profile.tin,
          registrationNumber: profile.registrationNumber,
          logoStorageUrl: profile.logoStorageUrl || "",
        }),
      });
      const json = (await response.json()) as { profile?: OrganizationProfile; error?: string };
      if (!response.ok || !json.profile) {
        throw new Error(json.error ?? "Could not save organization profile.");
      }
      setProfile(json.profile);
      setFeedback({ kind: "success", message: "Organization profile saved." });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not save organization profile.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card">Loading organization profile...</div>;
  }

  return (
    <section className="card" style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h2>Organization Profile (PDF Branding)</h2>
        <p className="meta-line">
          This profile is the single source of truth for PDF headers, watermark identity, and document metadata.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="portal-grid" style={{ gap: "0.9rem" }}>
        <label className="portal-field-label">
          Organization Name
          <input
            value={profile.name}
            onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </label>
        <label className="portal-field-label">
          Address
          <input
            value={profile.address}
            onChange={(event) => setProfile((prev) => ({ ...prev, address: event.target.value }))}
            required
          />
        </label>
        <label className="portal-field-label">
          P.O. Box
          <input
            value={profile.poBox}
            onChange={(event) => setProfile((prev) => ({ ...prev, poBox: event.target.value }))}
            required
          />
        </label>
        <label className="portal-field-label">
          Telephone
          <input
            value={profile.telephone}
            onChange={(event) => setProfile((prev) => ({ ...prev, telephone: event.target.value }))}
            required
          />
        </label>
        <label className="portal-field-label">
          Email
          <input
            type="email"
            value={profile.email}
            onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </label>
        <label className="portal-field-label">
          TIN
          <input
            value={profile.tin}
            onChange={(event) => setProfile((prev) => ({ ...prev, tin: event.target.value }))}
            required
          />
        </label>
        <label className="portal-field-label">
          Registration Number
          <input
            value={profile.registrationNumber}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, registrationNumber: event.target.value }))
            }
            required
          />
        </label>
        <label className="portal-field-label">
          Logo URL (optional)
          <input
            placeholder="https://... or /photos/14.jpeg"
            value={profile.logoStorageUrl ?? ""}
            onChange={(event) =>
              setProfile((prev) => ({
                ...prev,
                logoStorageUrl: event.target.value.trim() ? event.target.value : null,
              }))
            }
          />
        </label>

        <div style={{ display: "grid", gap: "0.35rem" }}>
          <span className="portal-field-label">Logo Preview</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoPreviewUrl}
            alt="Organization logo preview"
            style={{ maxWidth: "220px", maxHeight: "120px", objectFit: "contain", border: "1px solid #d1d5db", padding: "0.35rem", borderRadius: "0.5rem", background: "#fff" }}
          />
        </div>

        <div className="action-row">
          <button className="button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Organization Profile"}
          </button>
          <a className="button button-ghost" href="/api/portal/admin/pdf-branding-sample" target="_blank" rel="noreferrer">
            Preview PDF Branding
          </a>
        </div>
      </form>

      {feedback.kind !== "idle" ? (
        <p className={feedback.kind === "error" ? "portal-feedback error" : "portal-feedback success"}>
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
