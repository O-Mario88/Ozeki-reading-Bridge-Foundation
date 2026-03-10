"use client";

import { FormEvent, useMemo, useState } from "react";

type DispatchSummary = {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  lastSentAt: string | null;
};

type NewsletterIssueItem = {
  id: number;
  slug: string;
  title: string;
  preheader: string;
  status: "draft" | "published";
  autoSendEnabled: boolean;
  publishedAt: string | null;
  autoSentAt: string | null;
  createdAt: string;
  dispatchSummary: DispatchSummary;
};

type NewsletterIssueResponse = {
  issues: NewsletterIssueItem[];
  subscribersCount: number;
};

interface PortalNewsletterManagerProps {
  initialIssues: NewsletterIssueItem[];
  initialSubscribersCount: number;
}

type Feedback = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

const initialFeedback: Feedback = {
  status: "idle",
  message: "",
};

export function PortalNewsletterManager({
  initialIssues,
  initialSubscribersCount,
}: PortalNewsletterManagerProps) {
  const [issues, setIssues] = useState<NewsletterIssueItem[]>(initialIssues);
  const [subscribersCount, setSubscribersCount] = useState(initialSubscribersCount);
  const [feedback, setFeedback] = useState<Feedback>(initialFeedback);
  const [publishingIssueId, setPublishingIssueId] = useState<number | null>(null);
  const [publishNow, setPublishNow] = useState(true);
  const [sendNow, setSendNow] = useState(true);
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);

  const publishedCount = useMemo(
    () => issues.filter((issue) => issue.status === "published").length,
    [issues],
  );

  async function reloadIssues() {
    const response = await fetch("/api/portal/newsletter/issues?limit=120", {
      cache: "no-store",
    });
    const json = (await response.json()) as NewsletterIssueResponse & { error?: string };
    if (!response.ok) {
      throw new Error(json.error ?? "Could not refresh newsletter issues.");
    }
    setIssues(Array.isArray(json.issues) ? json.issues : []);
    setSubscribersCount(Number(json.subscribersCount ?? 0));
  }

  async function handleCreateIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback({
      status: "loading",
      message: "Saving newsletter issue...",
    });

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      title: String(formData.get("title") ?? "").trim(),
      preheader: String(formData.get("preheader") ?? "").trim(),
      htmlContent: String(formData.get("htmlContent") ?? "").trim(),
      plainText: String(formData.get("plainText") ?? "").trim(),
      publish: publishNow,
      autoSendEnabled,
      sendNow,
    };

    try {
      const response = await fetch("/api/portal/newsletter/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { error?: string; sendResult?: { providerMessage?: string } };
      if (!response.ok) {
        throw new Error(json.error ?? "Could not create newsletter issue.");
      }

      await reloadIssues();
      form.reset();
      setFeedback({
        status: "success",
        message: payload.publish
          ? json.sendResult?.providerMessage || "Newsletter published successfully."
          : "Draft saved successfully.",
      });
    } catch (error) {
      setFeedback({
        status: "error",
        message: error instanceof Error ? error.message : "Could not save newsletter issue.",
      });
    }
  }

  async function handleSendIssue(issueId: number) {
    setPublishingIssueId(issueId);
    setFeedback({
      status: "loading",
      message: "Sending newsletter to subscriber groups...",
    });

    try {
      const response = await fetch(`/api/portal/newsletter/issues/${issueId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishIfDraft: true }),
      });
      const json = (await response.json()) as {
        error?: string;
        sendResult?: { providerMessage?: string };
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Could not send newsletter.");
      }

      await reloadIssues();
      setFeedback({
        status: "success",
        message: json.sendResult?.providerMessage || "Newsletter sent successfully.",
      });
    } catch (error) {
      setFeedback({
        status: "error",
        message: error instanceof Error ? error.message : "Could not send newsletter.",
      });
    } finally {
      setPublishingIssueId(null);
    }
  }

  return (
    <div className="portal-grid">
      <section className="card">
        <h2>Create Newsletter Issue</h2>
        <p className="portal-muted">
          Subscribers collected from the website: <strong>{subscribersCount.toLocaleString()}</strong>
          {" "}email(s). Published issues can auto-send to all subscribers in grouped batches.
        </p>
        <form className="form-grid" onSubmit={handleCreateIssue}>
          <label className="full-width">
            Title
            <input name="title" required minLength={3} maxLength={220} />
          </label>
          <label className="full-width">
            Preheader (optional)
            <input name="preheader" maxLength={320} />
          </label>
          <label className="full-width">
            HTML Content
            <textarea
              name="htmlContent"
              rows={14}
              required
              placeholder="<p>Write newsletter HTML here...</p>"
            />
          </label>
          <label className="full-width">
            Plain text fallback (optional)
            <textarea
              name="plainText"
              rows={5}
              placeholder="Optional plain text version for email clients."
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(event) => setPublishNow(event.target.checked)}
            />{" "}
            Publish now
          </label>
          <label>
            <input
              type="checkbox"
              checked={autoSendEnabled}
              onChange={(event) => setAutoSendEnabled(event.target.checked)}
            />{" "}
            Auto-send enabled
          </label>
          <label>
            <input
              type="checkbox"
              checked={sendNow}
              onChange={(event) => setSendNow(event.target.checked)}
              disabled={!publishNow}
            />{" "}
            Send immediately when published
          </label>
          <div className="action-row full-width">
            <button className="button" type="submit" disabled={feedback.status === "loading"}>
              {feedback.status === "loading" ? "Saving..." : "Save Issue"}
            </button>
            <button
              className="button button-ghost"
              type="button"
              onClick={() => void reloadIssues()}
            >
              Refresh
            </button>
          </div>
        </form>
        {feedback.message ? <p className={`form-message ${feedback.status}`}>{feedback.message}</p> : null}
      </section>

      <section className="card">
        <h2>Newsletter Issues</h2>
        <p className="portal-muted">
          Total issues: <strong>{issues.length.toLocaleString()}</strong> • Published:{" "}
          <strong>{publishedCount.toLocaleString()}</strong>
        </p>
        {issues.length === 0 ? (
          <p>No newsletter issues yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Published</th>
                  <th>Dispatch</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      <strong>{issue.title}</strong>
                      <br />
                      <small>{issue.slug}</small>
                    </td>
                    <td>{issue.status}</td>
                    <td>{issue.publishedAt ? issue.publishedAt.slice(0, 10) : "—"}</td>
                    <td>
                      sent {issue.dispatchSummary.sent}, failed {issue.dispatchSummary.failed}
                    </td>
                    <td>
                      <div className="action-row">
                        {issue.status === "published" ? (
                          <>
                            <a className="button button-ghost" href={`/newsletter/${encodeURIComponent(issue.slug)}`}>
                              Open
                            </a>
                            <a
                              className="button button-ghost"
                              href={`/api/newsletter/${encodeURIComponent(issue.slug)}/pdf`}
                            >
                              PDF
                            </a>
                            <a
                              className="button button-ghost"
                              href={`/api/newsletter/${encodeURIComponent(issue.slug)}/html`}
                            >
                              HTML
                            </a>
                          </>
                        ) : null}
                        <button
                          className="button"
                          type="button"
                          onClick={() => void handleSendIssue(issue.id)}
                          disabled={publishingIssueId === issue.id}
                        >
                          {publishingIssueId === issue.id ? "Sending..." : "Send Group"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
