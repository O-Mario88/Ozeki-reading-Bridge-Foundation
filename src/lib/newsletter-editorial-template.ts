export type NewsletterEditorialUpdateItem = {
  numberLabel: string;
  title: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
};

export type NewsletterEditorialTemplateInput = {
  issueNumber: string;
  issueDate: string;
  mainTitle: string;
  tocItems: string[];
  heroImageUrl: string;
  heroImageAlt: string;
  mainStoryTitle: string;
  mainStoryBodyLeft: string;
  mainStoryBodyRight: string;

  welcomeTitle: string;
  welcomeBody: string;
  welcomeImageUrl: string;
  welcomeImageAlt: string;

  insightTitle: string;
  insightBodyLeft: string;
  insightBodyRight: string;
  insightImageUrl: string;
  insightImageAlt: string;

  smallStoryTitle: string;
  smallStoryBody: string;
  smallStoryImageUrl: string;
  smallStoryImageAlt: string;

  updatesTitle: string;
  updates: NewsletterEditorialUpdateItem[];

  featureTitle: string;
  featureBody: string;
  featureImageUrl: string;
  featureImageAlt: string;

  perspectiveTitle: string;
  perspectiveBody: string;
  perspectiveImageUrl: string;
  perspectiveImageAlt: string;

  officeTitle: string;
  officeBodyLeft: string;
  officeBodyRight: string;
  officeImageUrl: string;
  officeImageAlt: string;

  contactHeading: string;
  contactEmail: string;
  contactWebsite: string;
  contactLocation: string;

  footerLeft: string;
  footerRight: string;
};

const defaultUpdateItems: NewsletterEditorialUpdateItem[] = [
  {
    numberLabel: "1",
    title: "Teacher coaching in focus",
    body: "Cluster coaches completed follow-up visits and modeled clear phonics routines.",
    imageUrl: "",
    imageAlt: "Coaching visit",
  },
  {
    numberLabel: "2",
    title: "School leaders clinic",
    body: "Headteachers reviewed school reading goals and actioned classroom support plans.",
    imageUrl: "",
    imageAlt: "School leaders workshop",
  },
  {
    numberLabel: "3",
    title: "Assessment sprint",
    body: "Teams captured learner outcomes and refreshed grouping plans for catch-up instruction.",
    imageUrl: "",
    imageAlt: "Assessment activity",
  },
  {
    numberLabel: "4",
    title: "Community reading day",
    body: "Parents and local leaders joined school reading sessions to reinforce practice at home.",
    imageUrl: "",
    imageAlt: "Community reading session",
  },
];

const fallbackBody =
  "Add your final newsletter copy here. Keep each paragraph short and specific so the story is easy to scan.";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/^(https?:\/\/|\/)/i.test(trimmed)) {
    return trimmed;
  }
  return "";
}

function normalizeLines(value: string, fallback = "") {
  const trimmed = value.trim() || fallback;
  if (!trimmed) {
    return [];
  }
  return trimmed
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderParagraphs(value: string, fallback = fallbackBody) {
  const paragraphs = normalizeLines(value, fallback);
  if (paragraphs.length === 0) {
    return `<p>${escapeHtml(fallback)}</p>`;
  }
  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function renderImage(value: { url: string; alt: string; placeholder: string }) {
  const safeUrl = sanitizeUrl(value.url);
  if (!safeUrl) {
    return `<div class="nt-image-placeholder">${escapeHtml(value.placeholder)}</div>`;
  }
  return `<img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(value.alt || value.placeholder)}" loading="lazy" />`;
}

function normalizeUpdateItems(items: NewsletterEditorialUpdateItem[] | null | undefined) {
  const list = Array.isArray(items) ? items : [];
  return Array.from({ length: 4 }, (_, index) => {
    const fallback = defaultUpdateItems[index];
    const source = list[index] ?? fallback;
    return {
      numberLabel: (source.numberLabel || fallback.numberLabel).trim() || fallback.numberLabel,
      title: (source.title || fallback.title).trim() || fallback.title,
      body: (source.body || fallback.body).trim() || fallback.body,
      imageUrl: (source.imageUrl || "").trim(),
      imageAlt: (source.imageAlt || fallback.imageAlt).trim() || fallback.imageAlt,
    };
  });
}

function joinLocationLines(value: string) {
  const lines = value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return "Lira, Uganda";
  }
  return lines.map((line) => escapeHtml(line)).join("<br />");
}

export function createDefaultNewsletterEditorialTemplate(input?: {
  title?: string;
  preheader?: string;
}): NewsletterEditorialTemplateInput {
  const headline = input?.title?.trim() || "Monthly Newsletter";
  const intro =
    input?.preheader?.trim() ||
    "A practical update on reading outcomes, implementation progress, and what comes next.";

  return {
    issueNumber: "02",
    issueDate: "March 2026",
    mainTitle: headline,
    tocItems: [
      "Welcome message",
      "What schools need most",
      "Monthly implementation updates",
      "Field perspective",
      "Contact and next actions",
    ],
    heroImageUrl: "",
    heroImageAlt: "Newsletter hero image",
    mainStoryTitle: "Reading is the gateway skill: Uganda cannot afford weak foundations",
    mainStoryBodyLeft: intro,
    mainStoryBodyRight:
      "Use this space to summarize what changed this month and how teams responded in classrooms.",

    welcomeTitle: "Hello & welcome from the Ozeki team",
    welcomeBody:
      "Introduce this issue with one clear message: what happened, why it matters, and what readers should pay attention to in this edition.",
    welcomeImageUrl: "",
    welcomeImageAlt: "Welcome portrait",

    insightTitle: "Learn from what schools need most",
    insightBodyLeft:
      "Summarize evidence from visits, assessments, or teacher feedback. Keep this practical and outcome-focused.",
    insightBodyRight:
      "Describe the response in plain language: what support is being deployed, where, and by when.",
    insightImageUrl: "",
    insightImageAlt: "Schools and learning environment",

    smallStoryTitle: "Small title section here",
    smallStoryBody:
      "Use this block for a shorter spotlight story, testimonial, or a concise call-out with context.",
    smallStoryImageUrl: "",
    smallStoryImageAlt: "Small section image",

    updatesTitle: "Some updates/activities from the last month",
    updates: defaultUpdateItems.map((item) => ({ ...item })),

    featureTitle: "New milestone will launch soon",
    featureBody:
      "Use this panel for one larger update: a district rollout, a major training wave, or any headline implementation milestone.",
    featureImageUrl: "",
    featureImageAlt: "Feature story image",

    perspectiveTitle: "Field perspective from partner teams",
    perspectiveBody:
      "Capture what implementers are seeing on the ground and what that implies for next month’s support priorities.",
    perspectiveImageUrl: "",
    perspectiveImageAlt: "Field perspective image",

    officeTitle: "Next coordination office milestone",
    officeBodyLeft:
      "Share opening plans, coverage goals, or operations updates with clear timelines and ownership.",
    officeBodyRight:
      "Add one practical paragraph on how this improves school support and learner outcomes.",
    officeImageUrl: "",
    officeImageAlt: "Office or operations image",

    contactHeading: "Get in touch",
    contactEmail: "info@ozekireading.org",
    contactWebsite: "www.ozekireading.org",
    contactLocation: "Plot 14, Education Avenue\nLira City, Uganda",

    footerLeft: "OZEKI READING BRIDGE FOUNDATION",
    footerRight: "PAGE",
  };
}

export function getNewsletterEditorialTemplateStyles() {
  return `
    .newsletter-template-editorial {
      font-family: "Georgia", "Times New Roman", serif;
      color: #111111;
      display: grid;
      gap: 22px;
    }

    .newsletter-template-editorial * {
      box-sizing: border-box;
    }

    .newsletter-template-editorial .newsletter-page {
      background: #ffffff;
      border: 1px solid #d3d3d3;
      min-height: 1040px;
      padding: 26px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .newsletter-template-editorial .nt-page-footer {
      margin-top: auto;
      border-top: 1px solid #d9d9d9;
      padding-top: 8px;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4b4b4b;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }

    .newsletter-template-editorial .nt-page-one-grid {
      display: grid;
      grid-template-columns: 210px minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }

    .newsletter-template-editorial .nt-issue-panel {
      border-right: 1px solid #d9d9d9;
      padding-right: 14px;
    }

    .newsletter-template-editorial .nt-label {
      margin: 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .newsletter-template-editorial .nt-issue-number {
      width: 46px;
      height: 46px;
      border-radius: 999px;
      background: #0e0e0e;
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      margin: 10px 0 8px;
    }

    .newsletter-template-editorial .nt-issue-date {
      margin: 0;
      font-size: 12px;
      color: #4c4c4c;
    }

    .newsletter-template-editorial .nt-divider {
      border-top: 1px solid #d9d9d9;
      margin: 14px 0;
    }

    .newsletter-template-editorial .nt-toc-title {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .newsletter-template-editorial .nt-toc-list {
      margin: 0;
      padding-left: 16px;
      display: grid;
      gap: 6px;
      font-size: 12px;
      line-height: 1.35;
    }

    .newsletter-template-editorial .nt-main-title {
      margin: 0;
      font-size: clamp(42px, 5.4vw, 62px);
      line-height: 0.9;
      letter-spacing: -0.02em;
      max-width: 360px;
      text-wrap: balance;
    }

    .newsletter-template-editorial .nt-photo {
      margin: 0;
      width: 100%;
      background: #efefef;
      overflow: hidden;
    }

    .newsletter-template-editorial .nt-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .newsletter-template-editorial .nt-photo-hero {
      margin-top: 16px;
      height: 302px;
    }

    .newsletter-template-editorial .nt-story-card {
      margin-top: 12px;
      border-top: 1px solid #d9d9d9;
      padding-top: 12px;
    }

    .newsletter-template-editorial .nt-story-card h3,
    .newsletter-template-editorial .nt-feature-panel h3,
    .newsletter-template-editorial .nt-insight h3,
    .newsletter-template-editorial .nt-small-story h3,
    .newsletter-template-editorial .nt-perspective h3,
    .newsletter-template-editorial .nt-office-story h3,
    .newsletter-template-editorial .nt-contact-box h3,
    .newsletter-template-editorial .nt-welcome-copy h3 {
      margin: 0 0 8px;
      font-size: clamp(22px, 2.4vw, 34px);
      line-height: 1;
      letter-spacing: -0.01em;
    }

    .newsletter-template-editorial .nt-small-story h3,
    .newsletter-template-editorial .nt-contact-box h3 {
      font-size: clamp(22px, 2.1vw, 30px);
    }

    .newsletter-template-editorial .nt-two-columns {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .newsletter-template-editorial .nt-two-columns p,
    .newsletter-template-editorial .nt-columns-tight p,
    .newsletter-template-editorial .nt-story-card p,
    .newsletter-template-editorial .nt-welcome-copy p,
    .newsletter-template-editorial .nt-insight p,
    .newsletter-template-editorial .nt-small-story p,
    .newsletter-template-editorial .nt-feature-panel p,
    .newsletter-template-editorial .nt-perspective p,
    .newsletter-template-editorial .nt-office-story p {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.42;
      color: #242424;
    }

    .newsletter-template-editorial .nt-page-two-top {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 14px;
      border-bottom: 1px solid #d9d9d9;
      padding-bottom: 14px;
    }

    .newsletter-template-editorial .nt-page-two-top .nt-photo {
      height: 180px;
    }

    .newsletter-template-editorial .nt-page-two-main {
      display: grid;
      grid-template-columns: 1.15fr 0.95fr;
      gap: 16px;
      align-items: start;
    }

    .newsletter-template-editorial .nt-insight {
      border-top: 1px solid #d9d9d9;
      padding-top: 12px;
      display: grid;
      gap: 12px;
    }

    .newsletter-template-editorial .nt-side-stack {
      display: grid;
      gap: 14px;
    }

    .newsletter-template-editorial .nt-side-stack .nt-photo {
      height: 238px;
    }

    .newsletter-template-editorial .nt-small-story {
      border-top: 1px solid #d9d9d9;
      padding-top: 10px;
      display: grid;
      gap: 8px;
    }

    .newsletter-template-editorial .nt-small-story .nt-photo {
      height: 110px;
    }

    .newsletter-template-editorial .nt-page-three-grid {
      display: grid;
      grid-template-columns: 1.28fr 0.88fr;
      gap: 16px;
      align-items: start;
    }

    .newsletter-template-editorial .nt-updates-title {
      margin: 0;
      font-size: clamp(31px, 3vw, 40px);
      line-height: 0.97;
      letter-spacing: -0.01em;
      max-width: 460px;
    }

    .newsletter-template-editorial .nt-updates-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 10px;
    }

    .newsletter-template-editorial .nt-update-card {
      border-top: 1px solid #d9d9d9;
      padding-top: 8px;
      display: grid;
      gap: 8px;
    }

    .newsletter-template-editorial .nt-update-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .newsletter-template-editorial .nt-update-badge {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      border: 1px solid #000;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
    }

    .newsletter-template-editorial .nt-update-card .nt-photo {
      height: 112px;
    }

    .newsletter-template-editorial .nt-update-card h4,
    .newsletter-template-editorial .nt-contact-col h4 {
      margin: 0;
      font-size: 18px;
      line-height: 1;
    }

    .newsletter-template-editorial .nt-update-card p,
    .newsletter-template-editorial .nt-contact-col p {
      margin: 0;
      font-size: 12px;
      line-height: 1.4;
    }

    .newsletter-template-editorial .nt-feature-panel {
      border-top: 1px solid #d9d9d9;
      padding-top: 10px;
      display: grid;
      gap: 10px;
    }

    .newsletter-template-editorial .nt-feature-panel .nt-photo {
      height: 310px;
    }

    .newsletter-template-editorial .nt-page-four-top {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      border-bottom: 1px solid #d9d9d9;
      padding-bottom: 14px;
    }

    .newsletter-template-editorial .nt-page-four-top .nt-photo {
      height: 240px;
    }

    .newsletter-template-editorial .nt-office-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.9fr;
      gap: 14px;
      align-items: start;
      border-bottom: 1px solid #d9d9d9;
      padding-bottom: 14px;
    }

    .newsletter-template-editorial .nt-office-story {
      display: grid;
      gap: 10px;
    }

    .newsletter-template-editorial .nt-columns-tight {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .newsletter-template-editorial .nt-office-grid .nt-photo {
      height: 236px;
    }

    .newsletter-template-editorial .nt-contact-box {
      display: grid;
      grid-template-columns: 1.1fr 1fr 1fr;
      gap: 12px;
      background: #f3f3f3;
      padding: 16px;
      border: 1px solid #dfdfdf;
    }

    .newsletter-template-editorial .nt-contact-col {
      display: grid;
      gap: 6px;
      align-content: start;
    }

    .newsletter-template-editorial .nt-contact-col p {
      line-height: 1.35;
    }

    .newsletter-template-editorial .nt-contact-label {
      text-transform: uppercase;
      letter-spacing: 0.07em;
      font-size: 11px;
      color: #555555;
      margin: 0;
    }

    .newsletter-template-editorial .nt-image-placeholder {
      width: 100%;
      height: 100%;
      min-height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 10px;
      background: repeating-linear-gradient(
        -45deg,
        #ececec,
        #ececec 12px,
        #e3e3e3 12px,
        #e3e3e3 24px
      );
      color: #555555;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    @media (max-width: 980px) {
      .newsletter-template-editorial .newsletter-page {
        min-height: auto;
      }

      .newsletter-template-editorial .nt-page-one-grid,
      .newsletter-template-editorial .nt-page-two-top,
      .newsletter-template-editorial .nt-page-two-main,
      .newsletter-template-editorial .nt-page-three-grid,
      .newsletter-template-editorial .nt-page-four-top,
      .newsletter-template-editorial .nt-office-grid,
      .newsletter-template-editorial .nt-contact-box,
      .newsletter-template-editorial .nt-two-columns,
      .newsletter-template-editorial .nt-columns-tight {
        grid-template-columns: 1fr;
      }

      .newsletter-template-editorial .nt-issue-panel {
        border-right: 0;
        border-bottom: 1px solid #d9d9d9;
        padding-right: 0;
        padding-bottom: 12px;
      }

      .newsletter-template-editorial .nt-main-title,
      .newsletter-template-editorial .nt-updates-title {
        max-width: 100%;
      }
    }

    @media print {
      .newsletter-template-editorial {
        gap: 0;
      }

      .newsletter-template-editorial .newsletter-page {
        border: none;
        margin: 0;
        min-height: auto;
        padding: 8mm 6mm 7mm;
        break-after: page;
        page-break-after: always;
      }

      .newsletter-template-editorial .newsletter-page:last-child {
        break-after: auto;
        page-break-after: auto;
      }
    }
  `;
}

export function buildNewsletterEditorialTemplateHtml(input: NewsletterEditorialTemplateInput) {
  const tocItems = (input.tocItems || []).map((item) => item.trim()).filter(Boolean);
  const updates = normalizeUpdateItems(input.updates);

  const tocListHtml =
    tocItems.length > 0
      ? tocItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
      : "<li>Add section highlights</li>";

  return `
    <style data-newsletter-template="editorial">${getNewsletterEditorialTemplateStyles()}</style>
    <div class="newsletter-template newsletter-template-editorial">
      <section class="newsletter-page">
        <div class="nt-page-one-grid">
          <aside class="nt-issue-panel">
            <p class="nt-label">Issue</p>
            <div class="nt-issue-number">${escapeHtml(input.issueNumber || "01")}</div>
            <p class="nt-issue-date">${escapeHtml(input.issueDate || "January 2026")}</p>
            <div class="nt-divider"></div>
            <p class="nt-toc-title">In this issue</p>
            <ul class="nt-toc-list">${tocListHtml}</ul>
          </aside>
          <div>
            <h2 class="nt-main-title">${escapeHtml(input.mainTitle || "Monthly Newsletter")}</h2>
            <figure class="nt-photo nt-photo-hero">
              ${renderImage({
                url: input.heroImageUrl,
                alt: input.heroImageAlt,
                placeholder: "Hero image",
              })}
            </figure>
            <section class="nt-story-card">
              <h3>${escapeHtml(input.mainStoryTitle || "Main story")}</h3>
              <div class="nt-two-columns">
                ${renderParagraphs(input.mainStoryBodyLeft)}
                ${renderParagraphs(input.mainStoryBodyRight)}
              </div>
            </section>
          </div>
        </div>
        <footer class="nt-page-footer">
          <span>${escapeHtml(input.footerLeft || "Ozeki Reading Bridge Foundation")}</span>
          <span>${escapeHtml(input.footerRight || "Page 1")}</span>
        </footer>
      </section>

      <section class="newsletter-page">
        <div class="nt-page-two-top">
          <figure class="nt-photo">
            ${renderImage({
              url: input.welcomeImageUrl,
              alt: input.welcomeImageAlt,
              placeholder: "Welcome image",
            })}
          </figure>
          <article class="nt-welcome-copy">
            <h3>${escapeHtml(input.welcomeTitle || "Welcome note")}</h3>
            ${renderParagraphs(input.welcomeBody)}
          </article>
        </div>

        <div class="nt-page-two-main">
          <section class="nt-insight">
            <h3>${escapeHtml(input.insightTitle || "Insight section")}</h3>
            <div class="nt-two-columns">
              ${renderParagraphs(input.insightBodyLeft)}
              ${renderParagraphs(input.insightBodyRight)}
            </div>
          </section>
          <aside class="nt-side-stack">
            <figure class="nt-photo">
              ${renderImage({
                url: input.insightImageUrl,
                alt: input.insightImageAlt,
                placeholder: "Insight image",
              })}
            </figure>
            <section class="nt-small-story">
              <figure class="nt-photo">
                ${renderImage({
                  url: input.smallStoryImageUrl,
                  alt: input.smallStoryImageAlt,
                  placeholder: "Small story image",
                })}
              </figure>
              <h3>${escapeHtml(input.smallStoryTitle || "Small story")}</h3>
              ${renderParagraphs(input.smallStoryBody)}
            </section>
          </aside>
        </div>

        <footer class="nt-page-footer">
          <span>${escapeHtml(input.footerLeft || "Ozeki Reading Bridge Foundation")}</span>
          <span>${escapeHtml(input.footerRight || "Page 2")}</span>
        </footer>
      </section>

      <section class="newsletter-page">
        <div>
          <h3 class="nt-updates-title">${escapeHtml(input.updatesTitle || "Updates from the month")}</h3>
          <div class="nt-page-three-grid">
            <div class="nt-updates-grid">
              ${updates
                .map(
                  (item) => `
                <article class="nt-update-card">
                  <div class="nt-update-meta">
                    <span class="nt-update-badge">${escapeHtml(item.numberLabel)}</span>
                  </div>
                  <figure class="nt-photo">
                    ${renderImage({
                      url: item.imageUrl,
                      alt: item.imageAlt,
                      placeholder: `Update ${item.numberLabel} image`,
                    })}
                  </figure>
                  <h4>${escapeHtml(item.title)}</h4>
                  ${renderParagraphs(item.body)}
                </article>
              `,
                )
                .join("")}
            </div>
            <aside class="nt-feature-panel">
              <figure class="nt-photo">
                ${renderImage({
                  url: input.featureImageUrl,
                  alt: input.featureImageAlt,
                  placeholder: "Feature panel image",
                })}
              </figure>
              <h3>${escapeHtml(input.featureTitle || "Feature section")}</h3>
              ${renderParagraphs(input.featureBody)}
            </aside>
          </div>
        </div>

        <footer class="nt-page-footer">
          <span>${escapeHtml(input.footerLeft || "Ozeki Reading Bridge Foundation")}</span>
          <span>${escapeHtml(input.footerRight || "Page 3")}</span>
        </footer>
      </section>

      <section class="newsletter-page">
        <div class="nt-page-four-top">
          <figure class="nt-photo">
            ${renderImage({
              url: input.perspectiveImageUrl,
              alt: input.perspectiveImageAlt,
              placeholder: "Perspective image",
            })}
          </figure>
          <article class="nt-perspective">
            <h3>${escapeHtml(input.perspectiveTitle || "Field perspective")}</h3>
            ${renderParagraphs(input.perspectiveBody)}
          </article>
        </div>

        <div class="nt-office-grid">
          <article class="nt-office-story">
            <h3>${escapeHtml(input.officeTitle || "Office update")}</h3>
            <div class="nt-columns-tight">
              ${renderParagraphs(input.officeBodyLeft)}
              ${renderParagraphs(input.officeBodyRight)}
            </div>
          </article>
          <figure class="nt-photo">
            ${renderImage({
              url: input.officeImageUrl,
              alt: input.officeImageAlt,
              placeholder: "Office image",
            })}
          </figure>
        </div>

        <section class="nt-contact-box">
          <article>
            <h3>${escapeHtml(input.contactHeading || "Get in touch")}</h3>
          </article>
          <article class="nt-contact-col">
            <p class="nt-contact-label">Contact us</p>
            <p>${escapeHtml(input.contactEmail || "info@ozekireading.org")}<br />${escapeHtml(input.contactWebsite || "www.ozekireading.org")}</p>
          </article>
          <article class="nt-contact-col">
            <p class="nt-contact-label">Our location</p>
            <p>${joinLocationLines(input.contactLocation || "Lira, Uganda")}</p>
          </article>
        </section>

        <footer class="nt-page-footer">
          <span>${escapeHtml(input.footerLeft || "Ozeki Reading Bridge Foundation")}</span>
          <span>${escapeHtml(input.footerRight || "Page 4")}</span>
        </footer>
      </section>
    </div>
  `;
}

export function buildNewsletterEditorialTemplatePlainText(input: NewsletterEditorialTemplateInput) {
  const updates = normalizeUpdateItems(input.updates);
  const toc = input.tocItems
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
  const updateLines = updates
    .map((item) => `${item.numberLabel}. ${item.title}\n${item.body}`)
    .join("\n\n");

  return [
    `${input.mainTitle || "Monthly Newsletter"} (Issue ${input.issueNumber || "01"})`,
    `${input.issueDate || ""}`.trim(),
    "",
    "In this issue",
    toc || "- Newsletter updates",
    "",
    input.mainStoryTitle,
    input.mainStoryBodyLeft,
    input.mainStoryBodyRight,
    "",
    input.welcomeTitle,
    input.welcomeBody,
    "",
    input.insightTitle,
    input.insightBodyLeft,
    input.insightBodyRight,
    "",
    input.smallStoryTitle,
    input.smallStoryBody,
    "",
    input.updatesTitle,
    updateLines,
    "",
    input.featureTitle,
    input.featureBody,
    "",
    input.perspectiveTitle,
    input.perspectiveBody,
    "",
    input.officeTitle,
    input.officeBodyLeft,
    input.officeBodyRight,
    "",
    input.contactHeading,
    `Contact: ${input.contactEmail} | ${input.contactWebsite}`,
    `Location: ${input.contactLocation.replace(/\n+/g, ", ")}`,
  ]
    .map((item) => (item || "").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
