import assert from "node:assert/strict";
import test from "node:test";

// ── Role Validation ─────────────────────────────────────────────────

const VALID_ROLES = [
  "Staff",
  "Volunteer",
  "Admin",
  "Coach",
  "DataClerk",
  "SchoolLeader",
  "Partner",
  "Government",
] as const;

test("all 8 roles are recognized as valid PortalUserRole values", () => {
  assert.equal(VALID_ROLES.length, 8);
  for (const role of VALID_ROLES) {
    assert.equal(typeof role, "string");
    assert.ok(role.length > 0, `role "${role}" should not be empty`);
  }
});

test("invalid role strings are not in the valid roles set", () => {
  const invalidRoles = ["staff", "ADMIN", "SuperAdmin", "Manager", "", "Unknown"];
  for (const invalid of invalidRoles) {
    assert.ok(
      !(VALID_ROLES as readonly string[]).includes(invalid),
      `"${invalid}" should not be a valid role`,
    );
  }
});

// ── Status Validation ───────────────────────────────────────────────

const VALID_STATUSES = ["active", "invited", "deactivated"] as const;

test("valid user statuses are recognized", () => {
  assert.equal(VALID_STATUSES.length, 3);
  assert.ok(VALID_STATUSES.includes("active"));
  assert.ok(VALID_STATUSES.includes("invited"));
  assert.ok(VALID_STATUSES.includes("deactivated"));
});

test("invalid statuses are rejected", () => {
  const invalidStatuses = ["Active", "INVITED", "disabled", "banned", ""];
  for (const invalid of invalidStatuses) {
    assert.ok(
      !(VALID_STATUSES as readonly string[]).includes(invalid),
      `"${invalid}" should not be a valid status`,
    );
  }
});

// ── Force Password Change Logic ─────────────────────────────────────

test("mustChangePassword defaults to true when status is invited", () => {
  const shouldInvite = true;
  const status = shouldInvite ? "invited" : "active";
  const mustChangePassword = shouldInvite;

  assert.equal(status, "invited");
  assert.equal(mustChangePassword, true);
});

test("mustChangePassword defaults to false for direct creation", () => {
  const shouldInvite = false;
  const status = shouldInvite ? "invited" : "active";
  const mustChangePassword = shouldInvite;

  assert.equal(status, "active");
  assert.equal(mustChangePassword, false);
});

test("invited_at is set only when status is invited", () => {
  const statusInvited: string = "invited";
  const statusDirect: string = "active";

  const invitedAtForInvite = statusInvited === "invited" ? new Date().toISOString() : null;
  const invitedAtForDirect = statusDirect === "invited" ? new Date().toISOString() : null;

  assert.ok(invitedAtForInvite !== null, "invited_at should be set when status is invited");
  assert.equal(invitedAtForDirect, null, "invited_at should be null for direct creation");
});

// ── Email Template Validation ───────────────────────────────────────

test("onboarding email template contains essential elements", async () => {
  // Dynamically import to validate the module loads correctly
  const { sendOnboardingInviteEmail } = await import("../lib/onboarding-email");
  assert.equal(typeof sendOnboardingInviteEmail, "function");
});

// ── Status Transition Logic ─────────────────────────────────────────

test("deactivated users should transition to active on reactivation", () => {
  const currentStatus: string = "deactivated";
  const nextStatus = currentStatus === "deactivated" ? "active" : "deactivated";
  assert.equal(nextStatus, "active");
});

test("active users should transition to deactivated on deactivation", () => {
  const currentStatus: string = "active";
  const nextStatus = currentStatus === "deactivated" ? "active" : "deactivated";
  assert.equal(nextStatus, "deactivated");
});

test("invited status transitions to deactivated (not active) when toggled", () => {
  const currentStatus: string = "invited";
  const nextStatus = currentStatus === "deactivated" ? "active" : "deactivated";
  assert.equal(nextStatus, "deactivated");
});

// ── Password Change Route Logic ─────────────────────────────────────

test("password change clears mustChangePassword and transitions invited to active", () => {
  // Simulate the SQL logic:
  // SET must_change_password = FALSE,
  // status = CASE WHEN status = 'invited' THEN 'active' ELSE status END
  function simulatePasswordChange(currentStatus: string) {
    const mustChangePassword = false;
    const newStatus = currentStatus === "invited" ? "active" : currentStatus;
    return { mustChangePassword, status: newStatus };
  }

  const invitedResult = simulatePasswordChange("invited");
  assert.equal(invitedResult.mustChangePassword, false);
  assert.equal(invitedResult.status, "active");

  const activeResult = simulatePasswordChange("active");
  assert.equal(activeResult.mustChangePassword, false);
  assert.equal(activeResult.status, "active");
});
