"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  createDefaultNewsletterEditorialTemplate,
  type NewsletterEditorialTemplateInput,
  type NewsletterEditorialUpdateItem,
} from "@/lib/newsletter-editorial-template";

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
  showIssueList?: boolean;
}

type Feedback = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

const initialFeedback: Feedback = {
  status: "idle",
  message: "",
};

type TemplateImageFieldProps = {
  label: string;
  value: string;
  altValue: string;
  urlPlaceholder: string;
  altPlaceholder: string;
  uploadKey: string;
  uploadingField: string | null;
  onUrlChange: (value: string) => void;
  onAltChange: (value: string) => void;
  onUpload: (uploadKey: string, file: File) => Promise<void>;
};

function TemplateImageField({
  label,
  value,
  altValue,
  urlPlaceholder,
  altPlaceholder,
  uploadKey,
  uploadingField,
  onUrlChange,
  onAltChange,
  onUpload,
}: TemplateImageFieldProps) {
  return (
    <div className="full-width">
      <span className="portal-field-label">{label}</span>
      <input
        value={value}
        onChange={(event) => onUrlChange(event.target.value)}
        placeholder={urlPlaceholder}
      />
      <input
        value={altValue}
        onChange={(event) => onAltChange(event.target.value)}
        placeholder={altPlaceholder}
      />
      <input
        type="file"
        accept="image/*"
        disabled={uploadingField === uploadKey}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }
          void onUpload(uploadKey, file);
          event.currentTarget.value = "";
        }}
      />
      <small className="portal-field-help">
        {uploadingField === uploadKey ? "Uploading image..." : "Upload an image to auto-place it in this slot."}
      </small>
    </div>
  );
}

export function PortalNewsletterManager({
  initialIssues,
  initialSubscribersCount,
  showIssueList = true,
}: PortalNewsletterManagerProps) {
  const [issues, setIssues] = useState<NewsletterIssueItem[]>(initialIssues);
  const [subscribersCount, setSubscribersCount] = useState(initialSubscribersCount);
  const [feedback, setFeedback] = useState<Feedback>(initialFeedback);
  const [publishingIssueId, setPublishingIssueId] = useState<number | null>(null);
  const [publishNow, setPublishNow] = useState(true);
  const [sendNow, setSendNow] = useState(true);
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  const [useTemplateLayout, setUseTemplateLayout] = useState(true);
  const [template, setTemplate] = useState<NewsletterEditorialTemplateInput>(() =>
    createDefaultNewsletterEditorialTemplate(),
  );
  const [uploadingField, setUploadingField] = useState<string | null>(null);

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

  function setTemplateField<K extends keyof NewsletterEditorialTemplateInput>(
    key: K,
    value: NewsletterEditorialTemplateInput[K],
  ) {
    setTemplate((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function setTocItem(index: number, value: string) {
    setTemplate((prev) => {
      const nextItems = [...prev.tocItems];
      nextItems[index] = value;
      return {
        ...prev,
        tocItems: nextItems,
      };
    });
  }

  function setUpdateField<K extends keyof NewsletterEditorialUpdateItem>(
    index: number,
    key: K,
    value: NewsletterEditorialUpdateItem[K],
  ) {
    setTemplate((prev) => {
      const nextUpdates = [...prev.updates];
      const current = nextUpdates[index] ?? {
        numberLabel: `${index + 1}`,
        title: `Update ${index + 1}`,
        body: "",
        imageUrl: "",
        imageAlt: `Update ${index + 1} image`,
      };
      nextUpdates[index] = {
        ...current,
        [key]: value,
      };
      return {
        ...prev,
        updates: nextUpdates,
      };
    });
  }

  async function uploadTemplateImage(uploadKey: string, file: File) {
    setUploadingField(uploadKey);
    setFeedback({
      status: "loading",
      message: "Uploading newsletter image...",
    });

    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/portal/newsletter/assets", {
        method: "POST",
        body,
      });
      const json = (await response.json()) as { error?: string; assetUrl?: string };
      if (!response.ok || !json.assetUrl) {
        throw new Error(json.error ?? "Could not upload image.");
      }

      const mapTopLevelKey: Record<string, keyof NewsletterEditorialTemplateInput | undefined> = {
        heroImageUrl: "heroImageUrl",
        welcomeImageUrl: "welcomeImageUrl",
        insightImageUrl: "insightImageUrl",
        smallStoryImageUrl: "smallStoryImageUrl",
        featureImageUrl: "featureImageUrl",
        perspectiveImageUrl: "perspectiveImageUrl",
        officeImageUrl: "officeImageUrl",
      };

      if (uploadKey.startsWith("update-") && uploadKey.endsWith("-image")) {
        const updateIndex = Number(uploadKey.split("-")[1]);
        if (Number.isInteger(updateIndex) && updateIndex >= 0 && updateIndex <= 3) {
          setUpdateField(updateIndex, "imageUrl", json.assetUrl);
        }
      } else {
        const topLevelField = mapTopLevelKey[uploadKey];
        if (topLevelField) {
          setTemplateField(topLevelField, json.assetUrl);
        }
      }

      setFeedback({
        status: "success",
        message: "Image uploaded and attached to the template slot.",
      });
    } catch (error) {
      setFeedback({
        status: "error",
        message: error instanceof Error ? error.message : "Could not upload image.",
      });
    } finally {
      setUploadingField(null);
    }
  }

  async function handleCreateIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback({
      status: "loading",
      message: "Saving newsletter issue...",
    });

    const form = event.currentTarget;
    const formData = new FormData(form);

    const title = String(formData.get("title") ?? "").trim();
    const preheader = String(formData.get("preheader") ?? "").trim();
    const htmlContent = String(formData.get("htmlContent") ?? "").trim();
    const plainText = String(formData.get("plainText") ?? "").trim();

    const templatePayload = {
      ...template,
      mainTitle: template.mainTitle.trim() || title,
      tocItems: template.tocItems.map((item) => item.trim()).filter(Boolean).slice(0, 8),
      updates: Array.from({ length: 4 }, (_, index) => {
        const item = template.updates[index];
        return {
          numberLabel: (item?.numberLabel || `${index + 1}`).trim() || `${index + 1}`,
          title: item?.title.trim() || `Update ${index + 1}`,
          body: item?.body.trim() || "Add update details.",
          imageUrl: item?.imageUrl.trim() || "",
          imageAlt: item?.imageAlt.trim() || `Update ${index + 1} image`,
        };
      }),
    };

    const payload = {
      title,
      preheader,
      htmlContent: useTemplateLayout ? undefined : htmlContent,
      plainText: useTemplateLayout ? undefined : plainText,
      template: useTemplateLayout ? templatePayload : undefined,
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
      setTemplate(createDefaultNewsletterEditorialTemplate({ title, preheader }));
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
          {" "}email(s). Upload text and images and the system places them into the fixed newsletter design.
        </p>
        <form className="form-grid" onSubmit={handleCreateIssue}>
          <label className="full-width">
            Newsletter Issue Title
            <input name="title" required minLength={3} maxLength={220} />
          </label>
          <label className="full-width">
            Preheader (optional)
            <input name="preheader" maxLength={320} />
          </label>

          <label className="full-width">
            <input
              type="checkbox"
              checked={useTemplateLayout}
              onChange={(event) => setUseTemplateLayout(event.target.checked)}
            />{" "}
            Use fixed editorial template layout (recommended)
          </label>

          {useTemplateLayout ? (
            <>
              <details open className="full-width">
                <summary><strong>Edition Meta</strong></summary>
                <div className="form-grid" style={{ marginTop: "0.8rem" }}>
                  <label>
                    <span className="portal-field-label">Issue Number</span>
                    <input
                      value={template.issueNumber}
                      onChange={(event) => setTemplateField("issueNumber", event.target.value)}
                      maxLength={20}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Issue Date</span>
                    <input
                      value={template.issueDate}
                      onChange={(event) => setTemplateField("issueDate", event.target.value)}
                      maxLength={80}
                    />
                  </label>
                  <label className="full-width">
                    <span className="portal-field-label">Page 1 Main Headline</span>
                    <input
                      value={template.mainTitle}
                      onChange={(event) => setTemplateField("mainTitle", event.target.value)}
                      maxLength={180}
                    />
                  </label>
                  {Array.from({ length: 5 }, (_, index) => (
                    <label key={`toc-${index}`}>
                      <span className="portal-field-label">In This Issue #{index + 1}</span>
                      <input
                        value={template.tocItems[index] ?? ""}
                        onChange={(event) => setTocItem(index, event.target.value)}
                        maxLength={140}
                      />
                    </label>
                  ))}
                </div>
              </details>

              <details open className="full-width">
                <summary><strong>Page 1 Main Story</strong></summary>
                <div className="form-grid" style={{ marginTop: "0.8rem" }}>
                  <TemplateImageField
                    label="Hero Image"
                    value={template.heroImageUrl}
                    altValue={template.heroImageAlt}
                    urlPlaceholder="/api/newsletter/assets/... or https://..."
                    altPlaceholder="Hero image description"
                    uploadKey="heroImageUrl"
                    uploadingField={uploadingField}
                    onUrlChange={(value) => setTemplateField("heroImageUrl", value)}
                    onAltChange={(value) => setTemplateField("heroImageAlt", value)}
                    onUpload={uploadTemplateImage}
                  />
                  <label className="full-width">
                    <span className="portal-field-label">Main Story Title</span>
                    <input
                      value={template.mainStoryTitle}
                      onChange={(event) => setTemplateField("mainStoryTitle", event.target.value)}
                      maxLength={220}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Main Story Left Column</span>
                    <textarea
                      rows={5}
                      value={template.mainStoryBodyLeft}
                      onChange={(event) => setTemplateField("mainStoryBodyLeft", event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Main Story Right Column</span>
                    <textarea
                      rows={5}
                      value={template.mainStoryBodyRight}
                      onChange={(event) => setTemplateField("mainStoryBodyRight", event.target.value)}
                    />
                  </label>
                </div>
              </details>

              <details open className="full-width">
                <summary><strong>Page 2 Welcome + Insight</strong></summary>
                <div className="form-grid" style={{ marginTop: "0.8rem" }}>
                  <TemplateImageField
                    label="Welcome Image"
                    value={template.welcomeImageUrl}
                    altValue={template.welcomeImageAlt}
                    urlPlaceholder="/api/newsletter/assets/... or https://..."
                    altPlaceholder="Welcome image description"
                    uploadKey="welcomeImageUrl"
                    uploadingField={uploadingField}
                    onUrlChange={(value) => setTemplateField("welcomeImageUrl", value)}
                    onAltChange={(value) => setTemplateField("welcomeImageAlt", value)}
                    onUpload={uploadTemplateImage}
                  />
                  <label>
                    <span className="portal-field-label">Welcome Title</span>
                    <input
                      value={template.welcomeTitle}
                      onChange={(event) => setTemplateField("welcomeTitle", event.target.value)}
                      maxLength={180}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Welcome Body</span>
                    <textarea
                      rows={5}
                      value={template.welcomeBody}
                      onChange={(event) => setTemplateField("welcomeBody", event.target.value)}
                    />
                  </label>
                  <label className="full-width">
                    <span className="portal-field-label">Insight Section Title</span>
                    <input
                      value={template.insightTitle}
                      onChange={(event) => setTemplateField("insightTitle", event.target.value)}
                      maxLength={180}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Insight Left Column</span>
                    <textarea
                      rows={5}
                      value={template.insightBodyLeft}
                      onChange={(event) => setTemplateField("insightBodyLeft", event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Insight Right Column</span>
                    <textarea
                      rows={5}
                      value={template.insightBodyRight}
                      onChange={(event) => setTemplateField("insightBodyRight", event.target.value)}
                    />
                  </label>
                  <TemplateImageField
                    label="Insight Side Image"
                    value={template.insightImageUrl}
                    altValue={template.insightImageAlt}
                    urlPlaceholder="/api/newsletter/assets/... or https://..."
                    altPlaceholder="Insight image description"
                    uploadKey="insightImageUrl"
                    uploadingField={uploadingField}
                    onUrlChange={(value) => setTemplateField("insightImageUrl", value)}
                    onAltChange={(value) => setTemplateField("insightImageAlt", value)}
                    onUpload={uploadTemplateImage}
                  />
                  <TemplateImageField
                    label="Small Story Image"
                    value={template.smallStoryImageUrl}
                    altValue={template.smallStoryImageAlt}
                    urlPlaceholder="/api/newsletter/assets/... or https://..."
                    altPlaceholder="Small story image description"
                    uploadKey="smallStoryImageUrl"
                    uploadingField={uploadingField}
                    onUrlChange={(value) => setTemplateField("smallStoryImageUrl", value)}
                    onAltChange={(value) => setTemplateField("smallStoryImageAlt", value)}
                    onUpload={uploadTemplateImage}
                  />
                  <label>
                    <span className="portal-field-label">Small Story Title</span>
                    <input
                      value={template.smallStoryTitle}
                      onChange={(event) => setTemplateField("smallStoryTitle", event.target.value)}
                      maxLength={180}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Small Story Body</span>
                    <textarea
                      rows={5}
                      value={template.smallStoryBody}
                      onChange={(event) => setTemplateField("smallStoryBody", event.target.value)}
                    />
                  </label>
                </div>
              </details>

              <details open className="full-width">
                <summary><strong>Page 3 Updates</strong></summary>
                <div className="form-grid" style={{ marginTop: "0.8rem" }}>
                  <label className="full-width">
                    <span className="portal-field-label">Updates Section Title</span>
                    <input
                      value={template.updatesTitle}
                      onChange={(event) => setTemplateField("updatesTitle", event.target.value)}
                      maxLength={200}
                    />
                  </label>
                  {template.updates.map((item, index) => (
                    <div key={`update-item-${index}`} className="full-width card" style={{ margin: 0 }}>
                      <h4 style={{ marginTop: 0 }}>Update Card #{index + 1}</h4>
                      <div className="form-grid">
                        <label>
                          <span className="portal-field-label">Number Label</span>
                          <input
                            value={item.numberLabel}
                            onChange={(event) =>
                              setUpdateField(index, "numberLabel", event.target.value)
                            }
                            maxLength={12}
                          />
                        </label>
                        <label>
                          <span className="portal-field-label">Title</span>
                          <input
                            value={item.title}
                            onChange={(event) =>
                              setUpdateField(index, "title", event.target.value)
                            }
                            maxLength={180}
                          />
                        </label>
                        <label className="full-width">
                          <span className="portal-field-label">Body</span>
                          <textarea
                            rows={4}
                            value={item.body}
                            onChange={(event) =>
                              setUpdateField(index, "body", event.target.value)
                            }
                          />
                        </label>
                        <TemplateImageField
                          label={`Update ${index + 1} Image`}
                          value={item.imageUrl}
                          altValue={item.imageAlt}
                          urlPlaceholder="/api/newsletter/assets/... or https://..."
                          altPlaceholder={`Update ${index + 1} image description`}
                          uploadKey={`update-${index}-image`}
                          uploadingField={uploadingField}
                          onUrlChange={(value) => setUpdateField(index, "imageUrl", value)}
                          onAltChange={(value) => setUpdateField(index, "imageAlt", value)}
                          onUpload={uploadTemplateImage}
                        />
                      </div>
                    </div>
                  ))}
                  <TemplateImageField
                    label="Page 3 Feature Image"
                    value={template.featureImageUrl}
                    altValue={template.featureImageAlt}
                    urlPlaceholder="/api/newsletter/assets/... or https://..."
                    altPlaceholder="Feature image description"
                    uploadKey="featureImageUrl"
                    uploadingField={uploadingField}
                    onUrlChange={(value) => setTemplateField("featureImageUrl", value)}
                    onAltChange={(value) => setTemplateField("featureImageAlt", value)}
                    onUpload={uploadTemplateImage}
                  />
                  <label>
                    <span className="portal-field-label">Feature Title</span>
                    <input
                      value={template.featureTitle}
                      onChange={(event) => setTemplateField("featureTitle", event.target.value)}
                      maxLength={180}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Feature Body</span>
                    <textarea
                      rows={5}
                      value={template.featureBody}
                      onChange={(event) => setTemplateField("featureBody", event.target.value)}
                    />
                  </label>
                </div>
              </details>

              <details open className="full-width">
                <summary><strong>Page 4 Perspective + Contact</strong></summary>
                <div className="form-grid" style={{ marginTop: "0.8rem" }}>
                  <TemplateImageField
                    label="Perspective Image"
                    value={template.perspectiveImageUrl}
                    altValue={template.perspectiveImageAlt}
                    urlPlaceholder="/api/newsletter/assets/... or https://..."
                    altPlaceholder="Perspective image description"
                    uploadKey="perspectiveImageUrl"
                    uploadingField={uploadingField}
                    onUrlChange={(value) => setTemplateField("perspectiveImageUrl", value)}
                    onAltChange={(value) => setTemplateField("perspectiveImageAlt", value)}
                    onUpload={uploadTemplateImage}
                  />
                  <label>
                    <span className="portal-field-label">Perspective Title</span>
                    <input
                      value={template.perspectiveTitle}
                      onChange={(event) => setTemplateField("perspectiveTitle", event.target.value)}
                      maxLength={180}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Perspective Body</span>
                    <textarea
                      rows={5}
                      value={template.perspectiveBody}
                      onChange={(event) => setTemplateField("perspectiveBody", event.target.value)}
                    />
                  </label>
                  <TemplateImageField
                    label="Office Image"
                    value={template.officeImageUrl}
                    altValue={template.officeImageAlt}
                    urlPlaceholder="/api/newsletter/assets/... or https://..."
                    altPlaceholder="Office image description"
                    uploadKey="officeImageUrl"
                    uploadingField={uploadingField}
                    onUrlChange={(value) => setTemplateField("officeImageUrl", value)}
                    onAltChange={(value) => setTemplateField("officeImageAlt", value)}
                    onUpload={uploadTemplateImage}
                  />
                  <label className="full-width">
                    <span className="portal-field-label">Office Story Title</span>
                    <input
                      value={template.officeTitle}
                      onChange={(event) => setTemplateField("officeTitle", event.target.value)}
                      maxLength={180}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Office Story Left Column</span>
                    <textarea
                      rows={5}
                      value={template.officeBodyLeft}
                      onChange={(event) => setTemplateField("officeBodyLeft", event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Office Story Right Column</span>
                    <textarea
                      rows={5}
                      value={template.officeBodyRight}
                      onChange={(event) => setTemplateField("officeBodyRight", event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Contact Heading</span>
                    <input
                      value={template.contactHeading}
                      onChange={(event) => setTemplateField("contactHeading", event.target.value)}
                      maxLength={120}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Contact Email</span>
                    <input
                      value={template.contactEmail}
                      onChange={(event) => setTemplateField("contactEmail", event.target.value)}
                      maxLength={220}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Website</span>
                    <input
                      value={template.contactWebsite}
                      onChange={(event) => setTemplateField("contactWebsite", event.target.value)}
                      maxLength={220}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Location (one line per row)</span>
                    <textarea
                      rows={4}
                      value={template.contactLocation}
                      onChange={(event) => setTemplateField("contactLocation", event.target.value)}
                      maxLength={800}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Footer Left</span>
                    <input
                      value={template.footerLeft}
                      onChange={(event) => setTemplateField("footerLeft", event.target.value)}
                      maxLength={200}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Footer Right</span>
                    <input
                      value={template.footerRight}
                      onChange={(event) => setTemplateField("footerRight", event.target.value)}
                      maxLength={80}
                    />
                  </label>
                </div>
              </details>
            </>
          ) : (
            <label className="full-width">
              HTML Content
              <textarea
                name="htmlContent"
                rows={14}
                required
                placeholder="<p>Write newsletter HTML here...</p>"
              />
            </label>
          )}

          <label className="full-width">
            Plain text fallback (optional, only used in raw HTML mode)
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

      {showIssueList ? (
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
      ) : null}
    </div>
  );
}
