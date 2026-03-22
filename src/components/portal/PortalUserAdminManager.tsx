"use client";

import { FormEvent, useState } from "react";
import { PortalUserAdminRecord, PortalUserRole, PortalUserStatus } from "@/lib/types";
import { FormModal } from "@/components/forms";

const ALL_ROLES: PortalUserRole[] = [
  "Staff", "Volunteer", "Admin", "Accountant", "Coach", "DataClerk", "SchoolLeader", "Partner", "Government",
];

interface PortalUserAdminManagerProps {
  initialUsers: PortalUserAdminRecord[];
}

type UserStatus = {
  tone: "success" | "error";
  message: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function statusBadge(status: PortalUserStatus) {
  const map: Record<PortalUserStatus, { icon: string; label: string; color: string }> = {
    active: { icon: "🟢", label: "Active", color: "#16a34a" },
    invited: { icon: "🟡", label: "Invited", color: "#ca8a04" },
    deactivated: { icon: "🔴", label: "Deactivated", color: "#dc2626" },
  };
  const info = map[status] ?? map.active;
  return (
    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: info.color }}>
      {info.icon} {info.label}
    </span>
  );
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
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    const formData = new FormData(event.currentTarget);
    const role = String(formData.get("role") ?? "Staff") as PortalUserRole;
    const payload = {
      fullName: String(formData.get("fullName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      role,
      department: String(formData.get("department") ?? "").trim() || undefined,
      geographyScope: String(formData.get("geographyScope") ?? "").trim() || undefined,
      password: String(formData.get("password") ?? ""),
      sendInviteEmail: formData.get("sendInviteEmail") === "on",
      isSupervisor: formData.get("isSupervisor") === "on",
      isME: formData.get("isME") === "on",
      isAdmin: formData.get("isAdmin") === "on",
      isSuperAdmin: formData.get("isSuperAdmin") === "on",
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
      setIsCreateOpen(false);
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
    const role = String(formData.get("role") ?? "Staff") as PortalUserRole;
    const payload = {
      userId,
      fullName: String(formData.get("fullName") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      role,
      department: String(formData.get("department") ?? "").trim() || null,
      geographyScope: String(formData.get("geographyScope") ?? "").trim() || null,
      isSupervisor: formData.get("isSupervisor") === "on",
      isME: formData.get("isME") === "on",
      isAdmin: formData.get("isAdmin") === "on",
      isSuperAdmin: formData.get("isSuperAdmin") === "on",
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
      setStatus({ tone: "success", message: "User updated successfully." });
      setEditingUserId(null);
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not update user.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(userId: number, currentStatus: PortalUserStatus, fullName: string) {
    const nextStatus: PortalUserStatus = currentStatus === "deactivated" ? "active" : "deactivated";
    const action = nextStatus === "deactivated" ? "deactivate" : "reactivate";
    const confirmed = window.confirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} ${fullName}'s account?`,
    );
    if (!confirmed) return;

    setTogglingUserId(userId);
    setStatus(null);
    try {
      const response = await fetch("/api/portal/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: nextStatus }),
      });
      const nextUsers = await parseApiResponse(response);
      setUsers(nextUsers);
      setStatus({ tone: "success", message: `User ${action}d successfully.` });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : `Could not ${action} user.`,
      });
    } finally {
      setTogglingUserId(null);
    }
  }

  async function handleDeleteUser(userId: number, fullName: string) {
    const confirmed = window.confirm(
      `⚠️ Permanently delete ${fullName}'s account?\n\nThis action cannot be undone.`,
    );
    if (!confirmed) return;

    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/portal/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const nextUsers = await parseApiResponse(response);
      setUsers(nextUsers);
      setStatus({ tone: "success", message: `${fullName}'s account has been deleted.` });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not delete user.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="card">
        <h2>Create Staff / Volunteer Account</h2>
        <p>
          Super admin can onboard users, assign access levels, and set initial password.
        </p>
        <div className="action-row portal-form-actions">
          <button className="button" type="button" onClick={() => setIsCreateOpen(true)}>
            + New Account
          </button>
        </div>
      </section>

      <section className="card">
        <h2>User Directory ({users.length})</h2>
        <p>
          Manage accounts, permission flags, and user status.
        </p>
        {users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div className="portal-grid">
            {users.map((user) => (
              <article key={user.id} className="card portal-filter-card">
                <div className="portal-form-header">
                  <div>
                    <strong>{user.fullName}</strong>
                    <p className="portal-muted">{user.email}</p>
                    <p className="portal-muted" style={{ marginTop: 4 }}>
                      {statusBadge(user.status ?? "active")}
                      {" · "}
                      {user.role}
                      {user.department ? ` · ${user.department}` : ""}
                    </p>
                  </div>
                </div>

                <p className="portal-muted" style={{ fontSize: "0.8rem" }}>
                  Flags:{" "}
                  {[user.isSupervisor && "Supervisor", user.isME && "M&E", user.isAdmin && "Admin", user.isSuperAdmin && "Super Admin"]
                    .filter(Boolean)
                    .join(", ") || "None"}
                </p>
                <p className="portal-muted" style={{ fontSize: "0.78rem" }}>
                  Created: {formatDate(user.createdAt)}
                  {user.invitedAt ? ` · Invited: ${formatDate(user.invitedAt)}` : ""}
                  {user.lastLoginAt ? ` · Last login: ${formatDate(user.lastLoginAt)}` : ""}
                </p>

                <div className="action-row portal-form-actions">
                  <button
                    className="button"
                    type="button"
                    disabled={saving}
                    onClick={() => setEditingUserId(user.id)}
                  >
                    Edit
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    disabled={togglingUserId === user.id || saving}
                    onClick={() => void handleToggleStatus(user.id, user.status ?? "active", user.fullName)}
                  >
                    {togglingUserId === user.id
                      ? "Updating..."
                      : (user.status ?? "active") === "deactivated"
                        ? "Reactivate"
                        : "Deactivate"}
                  </button>
                  {!user.isSuperAdmin && (
                    <button
                      className="button"
                      type="button"
                      disabled={saving}
                      style={{ backgroundColor: "#dc2626", color: "#fff" }}
                      onClick={() => void handleDeleteUser(user.id, user.fullName)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {status ? (
        <p className={`form-message ${status.tone === "success" ? "success" : "error"}`}>
          {status.message}
        </p>
      ) : null}

      {/* ─── Create Modal ──────────────────────────────── */}
      <FormModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Portal Account"
        description="Onboard portal users and assign role permissions."
        closeLabel="Close"
        maxWidth="900px"
      >
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
            <span className="portal-field-label">Role</span>
            <select name="role" defaultValue="Staff">
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">Department (optional)</span>
            <input name="department" placeholder="e.g. Programs, Finance, M&E" />
          </label>
          <label>
            <span className="portal-field-label">Geography Scope (optional)</span>
            <input name="geographyScope" placeholder="e.g. Central Region" />
          </label>
          <label>
            <span className="portal-field-label">Temporary Password</span>
            <input name="password" type="text" minLength={8} required />
          </label>
          <label>
            <span className="portal-field-label">Onboarding</span>
            <span className="portal-inline-check">
              <input name="sendInviteEmail" type="checkbox" defaultChecked />
              Send onboarding email with credentials
            </span>
            <small className="portal-field-help">
              User will be required to change their password on first sign-in.
            </small>
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
            <button
              className="button button-ghost"
              type="button"
              disabled={saving}
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </FormModal>

      {/* ─── Edit Modal ──────────────────────────────── */}
      {editingUserId ? (
        <FormModal
          open={Boolean(editingUserId)}
          onClose={() => setEditingUserId(null)}
          title="Edit User"
          description="Update profile details and role access flags."
          closeLabel="Close"
          maxWidth="900px"
        >
          {(() => {
            const user = users.find((entry) => entry.id === editingUserId);
            if (!user) {
              return <p>User not found.</p>;
            }

            return (
              <form
                key={`user-edit-${user.id}`}
                className="form-grid portal-form-grid"
                onSubmit={(event) => handleUpdateUser(event, user.id)}
              >
                <label>
                  <span className="portal-field-label">Full Name</span>
                  <input name="fullName" defaultValue={user.fullName} required minLength={2} />
                </label>
                <label>
                  <span className="portal-field-label">Phone</span>
                  <input name="phone" defaultValue={user.phone ?? ""} />
                </label>
                <label>
                  <span className="portal-field-label">Role</span>
                  <select name="role" defaultValue={user.role}>
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="portal-field-label">Department</span>
                  <input name="department" defaultValue={user.department ?? ""} placeholder="e.g. Programs, Finance" />
                </label>
                <label>
                  <span className="portal-field-label">Geography Scope</span>
                  <input name="geographyScope" defaultValue={user.geographyScope ?? ""} placeholder="e.g. Central Region" />
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

                <div className="portal-multiselect full-width">
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

                <div className="full-width action-row portal-form-actions">
                  <button className="button" type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    disabled={saving}
                    onClick={() => setEditingUserId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            );
          })()}
        </FormModal>
      ) : null}
    </div>
  );
}
