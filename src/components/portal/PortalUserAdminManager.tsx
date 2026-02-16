"use client";

import { FormEvent, useState } from "react";
import { PortalUserAdminRecord, PortalUserRole } from "@/lib/types";

interface PortalUserAdminManagerProps {
  initialUsers: PortalUserAdminRecord[];
}

type UserStatus = {
  tone: "success" | "error";
  message: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function parseApiResponse(response: Response) {
  const data = (await response.json()) as {
    error?: string;
    users?: PortalUserAdminRecord[];
  };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  if (!data.users) {
    throw new Error("Server did not return updated users.");
  }
  return data.users;
}

export function PortalUserAdminManager({ initialUsers }: PortalUserAdminManagerProps) {
  const [users, setUsers] = useState(initialUsers);
  const [saving, setSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [status, setStatus] = useState<UserStatus | null>(null);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    const formData = new FormData(event.currentTarget);
    const volunteerAccount = formData.get("isVolunteer") === "on";
    const payload = {
      fullName: String(formData.get("fullName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      role: (volunteerAccount ? "Volunteer" : "Staff") as PortalUserRole,
      password: String(formData.get("password") ?? ""),
      isSupervisor: !volunteerAccount && formData.get("isSupervisor") === "on",
      isME: !volunteerAccount && formData.get("isME") === "on",
      isAdmin: !volunteerAccount && formData.get("isAdmin") === "on",
      isSuperAdmin: !volunteerAccount && formData.get("isSuperAdmin") === "on",
    };

    try {
      const response = await fetch("/api/portal/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const nextUsers = await parseApiResponse(response);
      setUsers(nextUsers);
      event.currentTarget.reset();
      setStatus({ tone: "success", message: "User created successfully." });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not create user.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>, userId: number) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    const formData = new FormData(event.currentTarget);
    const volunteerAccount = formData.get("isVolunteer") === "on";
    const payload = {
      userId,
      fullName: String(formData.get("fullName") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      role: (volunteerAccount ? "Volunteer" : "Staff") as PortalUserRole,
      isSupervisor: !volunteerAccount && formData.get("isSupervisor") === "on",
      isME: !volunteerAccount && formData.get("isME") === "on",
      isAdmin: !volunteerAccount && formData.get("isAdmin") === "on",
      isSuperAdmin: !volunteerAccount && formData.get("isSuperAdmin") === "on",
      password: String(formData.get("password") ?? "").trim() || undefined,
    };

    try {
      const response = await fetch("/api/portal/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const nextUsers = await parseApiResponse(response);
      setUsers(nextUsers);
      const passwordField = event.currentTarget.elements.namedItem("password") as
        | HTMLInputElement
        | null;
      if (passwordField) {
        passwordField.value = "";
      }
      setStatus({ tone: "success", message: "Permissions updated successfully." });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not update user.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(userId: number, fullName: string) {
    const confirmed = window.confirm(
      `Delete ${fullName}'s account? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingUserId(userId);
    setStatus(null);
    try {
      const response = await fetch("/api/portal/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const nextUsers = await parseApiResponse(response);
      setUsers(nextUsers);
      setStatus({ tone: "success", message: "User deleted successfully." });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not delete user.",
      });
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <div className="portal-grid">
      <section className="card">
        <h2>Create Staff / Volunteer Account</h2>
        <p>
          Super admin can onboard users, assign access levels, and set initial password.
        </p>
        <form className="form-grid portal-form-grid" onSubmit={handleCreateUser}>
          <label>
            <span className="portal-field-label">Full Name</span>
            <input name="fullName" required minLength={2} />
          </label>
          <label>
            <span className="portal-field-label">Email</span>
            <input name="email" type="email" required />
          </label>
          <label>
            <span className="portal-field-label">Phone (optional)</span>
            <input name="phone" />
          </label>
          <label>
            <span className="portal-field-label">Account Type</span>
            <span className="portal-inline-check">
              <input name="isVolunteer" type="checkbox" />
              Volunteer account
            </span>
            <small className="portal-field-help">
              Leave unchecked for Staff account.
            </small>
          </label>
          <label>
            <span className="portal-field-label">Password</span>
            <input name="password" type="text" minLength={8} required />
          </label>
          <fieldset className="card">
            <legend>Permission Flags</legend>
            <div className="portal-multiselect">
              <label>
                <input name="isSupervisor" type="checkbox" />
                Supervisor
              </label>
              <label>
                <input name="isME" type="checkbox" />
                M&amp;E
              </label>
              <label>
                <input name="isAdmin" type="checkbox" />
                Admin
              </label>
              <label>
                <input name="isSuperAdmin" type="checkbox" />
                Super Admin
              </label>
            </div>
          </fieldset>
          <div className="full-width action-row portal-form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create user"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Permission Matrix</h2>
        <p>
          Volunteers should remain data-entry only. Staff can access dashboard tools.
        </p>
        {users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div className="portal-grid">
            {users.map((user) => (
              <form
                key={user.id}
                className="card portal-filter-card"
                onSubmit={(event) => handleUpdateUser(event, user.id)}
              >
                <div className="portal-form-header">
                  <div>
                    <strong>{user.fullName}</strong>
                    <p className="portal-muted">{user.email}</p>
                    <p className="portal-muted">Created: {formatDate(user.createdAt)}</p>
                  </div>
                </div>

                <div className="portal-form-grid">
                  <label>
                    <span className="portal-field-label">Full Name</span>
                    <input name="fullName" defaultValue={user.fullName} required minLength={2} />
                  </label>
                  <label>
                    <span className="portal-field-label">Phone</span>
                    <input name="phone" defaultValue={user.phone ?? ""} />
                  </label>
                  <label>
                    <span className="portal-field-label">Account Type</span>
                    <span className="portal-inline-check">
                      <input
                        name="isVolunteer"
                        type="checkbox"
                        defaultChecked={user.role === "Volunteer"}
                      />
                      Volunteer account
                    </span>
                    <small className="portal-field-help">
                      Leave unchecked for Staff account.
                    </small>
                  </label>
                  <label>
                    <span className="portal-field-label">Reset Password (optional)</span>
                    <input
                      name="password"
                      type="text"
                      minLength={8}
                      placeholder="Leave blank to keep current"
                    />
                  </label>
                </div>

                <div className="portal-multiselect">
                  <label>
                    <input name="isSupervisor" type="checkbox" defaultChecked={user.isSupervisor} />
                    Supervisor
                  </label>
                  <label>
                    <input name="isME" type="checkbox" defaultChecked={user.isME} />
                    M&amp;E
                  </label>
                  <label>
                    <input name="isAdmin" type="checkbox" defaultChecked={user.isAdmin} />
                    Admin
                  </label>
                  <label>
                    <input name="isSuperAdmin" type="checkbox" defaultChecked={user.isSuperAdmin} />
                    Super Admin
                  </label>
                </div>

                <div className="action-row portal-form-actions">
                  <button className="button" type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save permissions"}
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    disabled={deletingUserId === user.id || saving}
                    onClick={() => void handleDeleteUser(user.id, user.fullName)}
                  >
                    {deletingUserId === user.id ? "Deleting..." : "Delete staff"}
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>

      {status ? (
        <p className={`form-message ${status.tone === "success" ? "success" : "error"}`}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
