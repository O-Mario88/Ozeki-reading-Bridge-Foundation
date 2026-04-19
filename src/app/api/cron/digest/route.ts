import { NextResponse } from "next/server";
import { buildDigestPayloadPostgres } from "@/lib/server/postgres/repositories/command-center";
import { sendFinanceMail } from "@/lib/finance-email";

export const runtime = "nodejs";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderDigestHtml(digest: Awaited<ReturnType<typeof buildDigestPayloadPostgres>>): string {
  const activityRows = digest.topActivity.map((a) => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:6px 10px;white-space:nowrap;color:#9ca3af;font-size:11px;">
        ${new Date(a.occurredAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
      </td>
      <td style="padding:6px 10px;">
        <strong>${escapeHtml(a.title)}</strong>
        ${a.subtitle ? `<br><small style="color:#6b7280;">${escapeHtml(a.subtitle)}</small>` : ""}
      </td>
    </tr>
  `).join("");

  const queueRows = digest.topWorkQueue.map((i) => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:6px 10px;">
        <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;
                     background:${i.priority === "critical" ? "#fee2e2" : i.priority === "high" ? "#fed7aa" : "#fef3c7"};
                     color:${i.priority === "critical" ? "#991b1b" : i.priority === "high" ? "#9a3412" : "#92400e"};">
          ${i.priority}
        </span>
      </td>
      <td style="padding:6px 10px;">
        <strong>${escapeHtml(i.title)}</strong>
        ${i.subtitle ? `<br><small style="color:#6b7280;">${escapeHtml(i.subtitle)}</small>` : ""}
      </td>
      <td style="padding:6px 10px;text-align:right;color:#9ca3af;font-size:11px;">
        ${i.daysOverdue !== null && i.daysOverdue > 0 ? `${i.daysOverdue}d overdue` : ""}
      </td>
    </tr>
  `).join("");

  return `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:720px;margin:0 auto;color:#111827;line-height:1.5;">
      <div style="background:linear-gradient(135deg,#fff7ed 0%,#fffbeb 100%);border-left:4px solid #f97316;padding:20px 24px;border-radius:0 12px 12px 0;margin-bottom:24px;">
        <h1 style="margin:0 0 6px;font-size:22px;color:#9a3412;">${digest.periodLabel} Programme Digest</h1>
        <p style="margin:0;color:#6b7280;font-size:13px;">
          Ozeki Reading Bridge Foundation — Generated ${new Date(digest.generatedAt).toLocaleString("en-GB")}
        </p>
      </div>

      <h2 style="font-size:16px;color:#374151;margin:24px 0 12px;">At a glance</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:10px;background:#f9fafb;border-radius:8px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#111827;">${digest.newAssessments}</div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;">Assessments</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:10px;background:#f9fafb;border-radius:8px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#111827;">${digest.newObservations}</div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;">Observations</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:10px;background:#f9fafb;border-radius:8px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#111827;">${digest.newTrainings}</div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;">Trainings</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:10px;background:#f9fafb;border-radius:8px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#111827;">${digest.newCoachingVisits}</div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;">Coaching Visits</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:10px;background:${digest.criticalWorkQueueItems > 0 ? "#fef2f2" : "#f9fafb"};border-radius:8px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:${digest.criticalWorkQueueItems > 0 ? "#b91c1c" : "#111827"};">${digest.criticalWorkQueueItems}</div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;">Critical items</div>
          </td>
        </tr>
      </table>

      ${digest.donationTotalUgx > 0 ? `
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
          <strong style="color:#065f46;">💚 ${digest.newDonations} new donations</strong>
          <span style="color:#047857;"> — UGX ${digest.donationTotalUgx.toLocaleString()} raised in this period</span>
        </div>
      ` : ""}

      ${digest.topWorkQueue.length > 0 ? `
        <h2 style="font-size:16px;color:#374151;margin:24px 0 12px;">Action required</h2>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          ${queueRows}
        </table>
      ` : ""}

      ${digest.topActivity.length > 0 ? `
        <h2 style="font-size:16px;color:#374151;margin:24px 0 12px;">Recent activity</h2>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          ${activityRows}
        </table>
      ` : ""}

      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px;text-align:center;">
        Open the command center at <a href="https://ozekiread.org/portal/command-center" style="color:#f97316;">ozekiread.org/portal/command-center</a>
      </div>
    </div>
  `;
}

export async function GET(request: Request) {
  // Protect with CRON_SECRET_TOKEN like other cron endpoints in this codebase
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET_TOKEN;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const hours = Number(searchParams.get("hours") ?? 24);
    const dryRun = searchParams.get("dryRun") === "1";

    const digest = await buildDigestPayloadPostgres(hours);
    const html = renderDigestHtml(digest);

    const recipientsCsv = process.env.DIGEST_RECIPIENTS || process.env.FINANCE_EMAIL_ALWAYS_CC || "";
    const recipients = recipientsCsv
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));

    if (dryRun || recipients.length === 0) {
      return NextResponse.json({
        status: dryRun ? "dry_run" : "no_recipients",
        digest,
        recipients,
        preview: html,
      });
    }

    const subject = `${digest.periodLabel} Ozeki Read Digest — ${digest.newAssessments + digest.newObservations + digest.newTrainings + digest.newCoachingVisits} new records, ${digest.criticalWorkQueueItems} critical items`;

    const result = await sendFinanceMail({
      to: recipients,
      subject,
      html,
    });

    return NextResponse.json({
      status: result.status,
      providerMessage: result.providerMessage,
      recipients,
      digest: { ...digest, topActivity: digest.topActivity.length, topWorkQueue: digest.topWorkQueue.length },
    });
  } catch (error) {
    console.error("[api/cron/digest]", error);
    return NextResponse.json({ error: "Digest failed" }, { status: 500 });
  }
}
