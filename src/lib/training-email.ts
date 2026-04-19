import { sendFinanceMail, type FinanceEmailSendResult } from "@/lib/finance-email";

export type TrainingCertificateEmailInput = {
  to: string;
  participantName: string;
  trainingTopic: string;
  trainingDate: string;
  certificateNumber: string;
  facilitatorName?: string;
  pdfBuffer: Buffer;
};

/**
 * Sends a training-completion certificate as a PDF attachment.
 * Reuses the finance-email SMTP transport but with a programmes-branded body.
 */
export async function sendTrainingCertificateEmail(
  input: TrainingCertificateEmailInput,
): Promise<FinanceEmailSendResult> {
  const fromEmail = process.env.PROGRAMMES_EMAIL_FROM?.trim() || "programmes@ozekiread.org";

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:620px;color:#111827;line-height:1.55;">
      <div style="border-left:4px solid #f97316;padding:12px 20px;background:#fff7ed;border-radius:0 8px 8px 0;">
        <h1 style="margin:0 0 6px;font-size:20px;color:#9a3412;">Your training certificate is ready</h1>
        <p style="margin:0;color:#6b7280;font-size:13px;">Ozeki Reading Bridge Foundation</p>
      </div>

      <p style="margin-top:22px;">Dear <strong>${escapeHtml(input.participantName)}</strong>,</p>

      <p>
        Thank you for participating in our training programme. Attached is your
        Certificate of Participation for the session
        <strong>"${escapeHtml(input.trainingTopic)}"</strong>
        ${input.facilitatorName ? `facilitated by <strong>${escapeHtml(input.facilitatorName)}</strong> ` : ""}
        on <strong>${escapeHtml(input.trainingDate)}</strong>.
      </p>

      <div style="margin:22px 0;padding:14px 18px;border:1px solid #fed7aa;background:#fffbeb;border-radius:10px;">
        <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#9a3412;">Certificate number</p>
        <p style="margin:4px 0 0;font-family:ui-monospace,SFMono-Regular,monospace;font-size:16px;font-weight:700;color:#111827;">
          ${escapeHtml(input.certificateNumber)}
        </p>
      </div>

      <p>
        Please share what you have learned with your colleagues and apply it in
        your classroom. Our coaches will follow up in the coming weeks to support
        your implementation journey.
      </p>

      <p style="margin-top:26px;">With sincere thanks,<br/><strong>Ozeki Reading Bridge Foundation — Programmes Team</strong></p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:11px;color:#9ca3af;margin:0;">
        This certificate is digitally generated and can be verified at
        ozekiread.org/verify/${escapeHtml(input.certificateNumber)}.
      </p>
    </div>
  `;

  const subject = `Certificate: ${input.trainingTopic} — ${input.certificateNumber}`;
  const filename = `OzekiRead-Certificate-${input.certificateNumber}.pdf`;

  return sendFinanceMail({
    from: fromEmail,
    to: [input.to],
    subject,
    html,
    attachments: [
      {
        filename,
        content: input.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
