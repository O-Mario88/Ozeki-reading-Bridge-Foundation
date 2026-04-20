import { queryPostgres } from "@/lib/server/postgres/client";

/**
 * IATI 2.03 XML publishing. Consumed by:
 *   - d-portal.org, iatiregistry.org, UK FCDO DevTracker
 *   - USAID Foreign Aid Explorer
 *   - EU EU Aid Explorer
 *   - Any bilateral donor's due-diligence workflow
 *
 * We publish two XML files:
 *   /api/v1/iati/activities   — the programmes we run
 *   /api/v1/iati/transactions — the inflows and outflows against them
 *
 * These are the minimal CORE fields required for IATI compliance; partners can
 * then extend with optional fields (sector, location, policy markers, etc.)
 * via PRs. Schema reference: https://iatistandard.org/en/iati-standard/203/
 */

const REPORTING_ORG_REF = process.env.IATI_REPORTING_ORG_REF?.trim() || "UG-XXXX-OZEKI";
const REPORTING_ORG_NAME = "Ozeki Reading Bridge Foundation";
const REPORTING_ORG_TYPE = "21"; // International NGO per IATI org-type codelist
const DEFAULT_CURRENCY = "UGX";
const DEFAULT_LANGUAGE = "en";

function xmlEscape(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function iatiDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function buildIatiActivitiesXml(): Promise<string> {
  // An IATI "activity" maps to an Ozeki programme. We have:
  //   online_training_programmes (explicit programmes)
  //   + one umbrella "Ozeki Literacy Programme" activity covering all non-
  //     programme-specific work (coaching visits, direct school support).
  // For MVP, emit the umbrella activity + any active programmes.

  const programmes = await queryPostgres(
    `SELECT id, code, title, description, start_date::text AS start_date, end_date::text AS end_date, status
     FROM online_training_programmes
     WHERE status IN ('active', 'completed')
     ORDER BY created_at ASC`,
  ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));

  const umbrellaActivity = `
    <iati-activity default-currency="${DEFAULT_CURRENCY}" last-updated-datetime="${new Date().toISOString()}" xml:lang="${DEFAULT_LANGUAGE}">
      <iati-identifier>${REPORTING_ORG_REF}-MAIN</iati-identifier>
      <reporting-org ref="${REPORTING_ORG_REF}" type="${REPORTING_ORG_TYPE}">
        <narrative>${xmlEscape(REPORTING_ORG_NAME)}</narrative>
      </reporting-org>
      <title><narrative>Ozeki Literacy Programme — Uganda</narrative></title>
      <description type="1"><narrative>Primary-school reading programme combining structured phonics teacher training, classroom coaching visits, learner assessments (baseline/progress/endline), and a publishing pipeline of local-language decodable stories. Operating across Uganda districts via the Ozeki Reading Bridge Foundation.</narrative></description>
      <activity-status code="2"/>
      <activity-date type="2" iso-date="2023-01-01"/>
      <participating-org role="1" ref="${REPORTING_ORG_REF}" type="${REPORTING_ORG_TYPE}">
        <narrative>${xmlEscape(REPORTING_ORG_NAME)}</narrative>
      </participating-org>
      <recipient-country code="UG" percentage="100"/>
      <sector vocabulary="1" code="11220" percentage="100">
        <narrative>Primary education</narrative>
      </sector>
      <default-aid-type code="C01"/>
      <default-finance-type code="110"/>
      <default-flow-type code="30"/>
    </iati-activity>
  `;

  const programmeActivities = programmes.rows.map((p) => {
    const ref = p.code ? String(p.code).replace(/[^A-Z0-9-]/gi, "-").toUpperCase() : `PROG-${p.id}`;
    const status = String(p.status) === "active" ? "2" : "3"; // IATI: 2=Implementation, 3=Completion
    const start = (p.start_date as string) || "2023-01-01";
    return `
    <iati-activity default-currency="${DEFAULT_CURRENCY}" last-updated-datetime="${new Date().toISOString()}" xml:lang="${DEFAULT_LANGUAGE}">
      <iati-identifier>${REPORTING_ORG_REF}-${xmlEscape(ref)}</iati-identifier>
      <reporting-org ref="${REPORTING_ORG_REF}" type="${REPORTING_ORG_TYPE}">
        <narrative>${xmlEscape(REPORTING_ORG_NAME)}</narrative>
      </reporting-org>
      <title><narrative>${xmlEscape(p.title as string)}</narrative></title>
      ${p.description ? `<description type="1"><narrative>${xmlEscape(p.description as string)}</narrative></description>` : ""}
      <activity-status code="${status}"/>
      <activity-date type="2" iso-date="${xmlEscape(start)}"/>
      ${p.end_date ? `<activity-date type="4" iso-date="${xmlEscape(p.end_date as string)}"/>` : ""}
      <participating-org role="1" ref="${REPORTING_ORG_REF}" type="${REPORTING_ORG_TYPE}">
        <narrative>${xmlEscape(REPORTING_ORG_NAME)}</narrative>
      </participating-org>
      <recipient-country code="UG" percentage="100"/>
      <sector vocabulary="1" code="11220" percentage="100"><narrative>Primary education</narrative></sector>
    </iati-activity>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03" generated-datetime="${new Date().toISOString()}">
${umbrellaActivity}${programmeActivities}
</iati-activities>`;
}

export async function buildIatiTransactionsXml(opts: { sinceDate?: string } = {}): Promise<string> {
  // IATI transaction types:
  //   1  = Incoming Funds   (receipts)
  //   3  = Disbursement     (expenses posted)
  //   4  = Expenditure      (alternative for direct spend)
  // We emit finance_receipts as type-1 and finance_expenses (posted) as type-3.
  const sinceClause = opts.sinceDate ? `AND receipt_date >= '${opts.sinceDate}'::date` : "";
  const sinceExp = opts.sinceDate ? `AND date >= '${opts.sinceDate}'::date` : "";

  const [receipts, expenses] = await Promise.all([
    queryPostgres(
      `SELECT id, receipt_date::text AS receipt_date, amount_received, currency, description, received_from
       FROM finance_receipts
       WHERE status IN ('issued','paid')
         AND archived_due_to_finance_reset IS FALSE
         ${sinceClause}
       ORDER BY receipt_date DESC LIMIT 5000`,
    ).catch(() => ({ rows: [] as Array<Record<string, unknown>> })),
    queryPostgres(
      `SELECT id, date::text AS expense_date, amount, currency, description, vendor_name, category
       FROM finance_expenses
       WHERE status = 'posted'
         AND archived_due_to_finance_reset IS FALSE
         ${sinceExp}
       ORDER BY date DESC LIMIT 5000`,
    ).catch(() => ({ rows: [] as Array<Record<string, unknown>> })),
  ]);

  const tx: string[] = [];

  for (const r of receipts.rows) {
    tx.push(`
    <transaction>
      <transaction-type code="1"/>
      <transaction-date iso-date="${xmlEscape(r.receipt_date as string)}"/>
      <value currency="${xmlEscape((r.currency as string) ?? DEFAULT_CURRENCY)}" value-date="${xmlEscape(r.receipt_date as string)}">${Number(r.amount_received).toFixed(2)}</value>
      ${r.description ? `<description><narrative>${xmlEscape(r.description as string)}</narrative></description>` : ""}
      ${r.received_from ? `<provider-org><narrative>${xmlEscape(r.received_from as string)}</narrative></provider-org>` : ""}
    </transaction>`);
  }
  for (const e of expenses.rows) {
    tx.push(`
    <transaction>
      <transaction-type code="3"/>
      <transaction-date iso-date="${xmlEscape(e.expense_date as string)}"/>
      <value currency="${xmlEscape((e.currency as string) ?? DEFAULT_CURRENCY)}" value-date="${xmlEscape(e.expense_date as string)}">${Number(e.amount).toFixed(2)}</value>
      ${e.description ? `<description><narrative>${xmlEscape(e.description as string)}</narrative></description>` : ""}
      ${e.vendor_name ? `<receiver-org><narrative>${xmlEscape(e.vendor_name as string)}</narrative></receiver-org>` : ""}
      ${e.category ? `<sector vocabulary="99"><narrative>${xmlEscape(e.category as string)}</narrative></sector>` : ""}
    </transaction>`);
  }

  // All transactions roll up to the umbrella activity for now. Per-programme
  // allocation can be added when expenses gain a `programme_ref` column.
  return `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03" generated-datetime="${new Date().toISOString()}">
  <iati-activity default-currency="${DEFAULT_CURRENCY}">
    <iati-identifier>${REPORTING_ORG_REF}-MAIN</iati-identifier>
    <reporting-org ref="${REPORTING_ORG_REF}" type="${REPORTING_ORG_TYPE}">
      <narrative>${xmlEscape(REPORTING_ORG_NAME)}</narrative>
    </reporting-org>
    ${tx.join("")}
  </iati-activity>
</iati-activities>`;
}

export function iatiMetadata() {
  return {
    reportingOrgRef: REPORTING_ORG_REF,
    reportingOrgName: REPORTING_ORG_NAME,
    standardVersion: "2.03",
    lastGenerated: iatiDateToday(),
  };
}
