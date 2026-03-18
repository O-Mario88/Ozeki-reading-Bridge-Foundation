import { renderBrandedPdf } from "@/lib/server/pdf/render";

export interface AcademicReportSection {
  title: string;
  id: string;
  contentHtml: string;
}

export interface AcademicReportData {
  title: string;
  subtitle?: string;
  author: string;
  date: string;
  recipient: string;
  sections: {
    executiveSummary: string;
    introduction: string;
    methodology: string;
    findings: string;
    conclusion: string;
    recommendations: string;
    references: string;
    appendices?: string;
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function generateAcademicReportPdf(
  data: AcademicReportData,
  brandOptions?: { documentNumber?: string; accentHex?: string }
): Promise<Buffer> {
  const orderedSections: AcademicReportSection[] = [
    { id: "exec-summary", title: "2.0 Executive Summary", contentHtml: data.sections.executiveSummary },
    { id: "introduction", title: "4.0 Introduction", contentHtml: data.sections.introduction },
    { id: "methodology", title: "5.0 Methodology", contentHtml: data.sections.methodology },
    { id: "findings", title: "6.0 Findings & Discussion", contentHtml: data.sections.findings },
    { id: "conclusion", title: "7.0 Conclusion", contentHtml: data.sections.conclusion },
    { id: "recommendations", title: "8.0 Recommendations", contentHtml: data.sections.recommendations },
    { id: "references", title: "9.0 References", contentHtml: data.sections.references },
  ];

  if (data.sections.appendices) {
    orderedSections.push({
      id: "appendices",
      title: "10.0 Appendices",
      contentHtml: data.sections.appendices,
    });
  }

  const titlePageHtml = `
    <div class="title-page">
      <div class="title-page-content">
        <h1 class="doc-title">${escapeHtml(data.title)}</h1>
        ${data.subtitle ? `<h2 class="doc-subtitle">${escapeHtml(data.subtitle)}</h2>` : ""}
        
        <div class="meta-section">
          <p><strong>Prepared By:</strong><br/>${escapeHtml(data.author)}</p>
          <p><strong>Prepared For:</strong><br/>${escapeHtml(data.recipient)}</p>
          <p><strong>Date:</strong><br/>${escapeHtml(data.date)}</p>
        </div>
      </div>
    </div>
  `;

  const tocHtml = `
    <div class="toc-page">
      <h2 class="toc-title">3.0 Table of Contents</h2>
      <ul class="toc-list">
        <li><a href="#exec-summary">2.0 Executive Summary</a></li>
        <li><a href="#introduction">4.0 Introduction</a></li>
        <li><a href="#methodology">5.0 Methodology</a></li>
        <li><a href="#findings">6.0 Findings & Discussion</a></li>
        <li><a href="#conclusion">7.0 Conclusion</a></li>
        <li><a href="#recommendations">8.0 Recommendations</a></li>
        <li><a href="#references">9.0 References</a></li>
        ${data.sections.appendices ? `<li><a href="#appendices">10.0 Appendices</a></li>` : ""}
      </ul>
    </div>
  `;

  const bodyHtml = orderedSections
    .map(
      (sec) => `
      <section id="${sec.id}" class="academic-section">
        <h2 class="section-title">${escapeHtml(sec.title)}</h2>
        <div class="section-content">
          ${sec.contentHtml}
        </div>
      </section>
    `
    )
    .join("\n");

  const fullContentHtml = `
    ${titlePageHtml}
    ${tocHtml}
    <div class="report-body">
      ${bodyHtml}
    </div>
  `;

  const css = `
    /* Normalize Academic Typography */
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
      text-align: justify;
    }

    /* Markdown Element Styling for AI injection */
    p { margin: 0 0 1em; }
    ul, ol { margin: 0 0 1em; padding-left: 20px; }
    li { margin-bottom: 0.5em; }
    strong, b { font-weight: bold; }
    em, i { font-style: italic; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #000;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background: #f0f0f0;
      font-weight: bold;
    }

    /* Page Breaks and Layouts */
    .title-page {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: calc(100vh - 120px);
      text-align: center;
      padding: 40px;
    }
    .doc-title {
      font-size: 24pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 10px;
      color: var(--orbf-accent, #1f2a44);
    }
    .doc-subtitle {
      font-size: 16pt;
      color: #444;
      margin-bottom: 60px;
      font-weight: normal;
    }
    .meta-section {
      text-align: left;
      margin: 0 auto;
      display: inline-block;
      min-width: 300px;
      padding: 24px;
      border: 1px solid #ccc;
      background: #fafafa;
    }
    .meta-section p {
      margin-bottom: 15px;
      font-size: 12pt;
    }
    .meta-section p:last-child {
      margin-bottom: 0;
    }

    .toc-page {
      page-break-after: always;
      padding: 20px 0;
    }
    .toc-title {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 5px;
    }
    .toc-list {
      list-style: none;
      padding: 0;
    }
    .toc-list li {
      margin-bottom: 12px;
      font-size: 12pt;
    }
    .toc-list a {
      color: #000;
      text-decoration: none;
    }

    .academic-section {
      page-break-inside: avoid;
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 16pt;
      font-weight: bold;
      margin-top: 0;
      margin-bottom: 15px;
      color: var(--orbf-accent, #1f2a44);
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
      page-break-after: avoid;
    }
    
    .section-content h3 {
      font-size: 13pt;
      font-weight: bold;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
    }
    .section-content h4 {
      font-size: 12pt;
      font-weight: bold;
      font-style: italic;
      margin-top: 1.2em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
    }
  `;

  return renderBrandedPdf({
    title: "", // The branded header gets injected, but we rely on Title Page for the large title
    subtitle: "",
    documentNumber: brandOptions?.documentNumber ?? "OFFICIAL REPORT",
    footerNote: "Ozeki Internal Reporting System - Standard Academic Report",
    accentHex: brandOptions?.accentHex ?? "#1f2a44",
    contentHtml: fullContentHtml,
    additionalCss: css,
  });
}
