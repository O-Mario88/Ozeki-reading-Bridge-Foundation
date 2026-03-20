"use client";

import { FormEvent, useState } from "react";

type Status = {
  tone: "success" | "error";
  message: string;
};

export function PortalForcePasswordChange() {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword.length < 8) {
      setStatus({ tone: "error", message: "New password must be at least 8 characters." });
      setSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ tone: "error", message: "Passwords do not match." });
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string; redirectTo?: string };

      if (!response.ok) {
        setStatus({ tone: "error", message: data.error ?? "Failed to change password." });
        return;
      }

      setStatus({ tone: "success", message: "Password changed successfully. Redirecting..." });
      setTimeout(() => {
        window.location.href = data.redirectTo ?? "/portal/dashboard";
      }, 1200);
    } catch {
      setStatus({ tone: "error", message: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h2>Change Your Password</h2>
        <p className="portal-muted" style={{ marginBottom: "1.5rem" }}>
          You must set a new password before continuing. This is required for security purposes.
        </p>

        <form className="form-grid portal-form-grid" onSubmit={handleSubmit}>
          <label>
            <span className="portal-field-label">Current / Temporary Password</span>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>

          <label>
            <span className="portal-field-label">New Password</span>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
            />
          </label>

          <label>
            <span className="portal-field-label">Confirm New Password</span>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          {status && (
            <p className={`form-message ${status.tone === "success" ? "success" : "error"}`}>
              {status.message}
            </p>
          )}

          <div className="full-width action-row portal-form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Set New Password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
