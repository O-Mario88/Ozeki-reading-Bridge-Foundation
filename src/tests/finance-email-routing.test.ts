import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFinanceCcListFromGroups,
  getDefaultFinanceFromEmail,
  getRequiredFinanceCcEmails,
  resolveFinanceFromEmail,
} from "../lib/finance-email";

test("finance mail defaults to the accountant mailbox when no override is configured", () => {
  assert.equal(
    getDefaultFinanceFromEmail({
      financeEmailFrom: "",
      financeAccountantEmail: "",
      smtpFrom: "",
    }),
    "accounts@ozekiread.org",
  );
});

test("finance mail sender prefers an explicit valid from address", () => {
  assert.equal(
    resolveFinanceFromEmail("Accounts@OzekiRead.org", "billing@ozekiread.org"),
    "accounts@ozekiread.org",
  );
  assert.equal(resolveFinanceFromEmail("not-an-email", "accounts@ozekiread.org"), "accounts@ozekiread.org");
});

test("finance mail always copies Edwin and Amos unless overridden by env configuration", () => {
  assert.deepEqual(getRequiredFinanceCcEmails(""), ["edwin@ozekiread.org", "amos@ozekiread.org"]);

  const cc = buildFinanceCcListFromGroups(
    [["Edwin@ozekiread.org", "partner@example.org"], ["amos@ozekiread.org", "partner@example.org"]],
    ["edwin@ozekiread.org", "amos@ozekiread.org"],
  );

  assert.deepEqual(cc, ["edwin@ozekiread.org", "partner@example.org", "amos@ozekiread.org"]);
});
