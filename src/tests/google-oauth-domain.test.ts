import assert from "node:assert/strict";
import test from "node:test";
import {
  getAllowedGoogleWorkspaceDomains,
  getPrimaryAllowedGoogleWorkspaceDomain,
  isAllowedGoogleWorkspaceEmail,
} from "../app/api/auth/_shared/google-oauth";

test("google oauth defaults to the ozekiread.org workspace", () => {
  assert.deepEqual(getAllowedGoogleWorkspaceDomains(), ["ozekiread.org"]);
  assert.equal(getPrimaryAllowedGoogleWorkspaceDomain(), "ozekiread.org");
});

test("google oauth allows approved workspace emails and rejects external domains", () => {
  assert.equal(isAllowedGoogleWorkspaceEmail("edwin@ozekiread.org"), true);
  assert.equal(isAllowedGoogleWorkspaceEmail("edwin@gmail.com"), false);
  assert.equal(isAllowedGoogleWorkspaceEmail("not-an-email"), false);
});
