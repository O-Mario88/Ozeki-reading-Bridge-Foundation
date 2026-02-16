import Link from "next/link";
import type { Metadata } from "next";
import { officialContactLinks } from "@/lib/contact";
import { listPublishedPortalResources } from "@/lib/db";
import type { PortalResourceRecord, PortalResourceSection } from "@/lib/types";

const trustBadges = [
  "Registered & compliant",
  "Safeguarding & child protection",
  "Data privacy & ethics",
  "Anti-fraud financial controls",
  "Evidence & reporting standards",
];

const faqs = [
  {
    question: "Can partners verify delivery?",
    answer:
      "Yes. We maintain attendance logs, coaching visit records, assessment summaries, and program reports for verification.",
  },
  {
    question: "Do you publish learner personal data?",
    answer:
      "No. Public reports are aggregated. Learner records use anonymous IDs and controlled access.",
  },
  {
    question: "How do you avoid overstating impact?",
    answer:
      "We use defined indicators, baseline-to-endline comparisons where applicable, and clearly report sample sizes and limitations.",
  },
  {
    question: "Can a donor fund a specific district or program component?",
    answer:
      "Yes. Funding can be allocated by region or district and by component, including training, coaching, assessment, materials, remediation, and reporting.",
  },
  {
    question: "How do we partner?",
    answer:
      "Use the Partner page to request a call, download the donor pack, or request a concept note for a district.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const dueDiligenceRequestLink = `${officialContactLinks.mailto}?subject=${encodeURIComponent(
  "Request Due Diligence Pack",
)}&body=${encodeURIComponent(
  "Hello Ozeki team,\n\nPlease share the due diligence pack for donor review.\n\nOrganization:\nContact name:\nPurpose:\nTimeline:\n",
)}`;

export const metadata: Metadata = {
  title: {
    absolute: "Donor Trust & Accountability | Ozeki Reading Bridge Foundation",
  },
  description:
    "Learn how Ozeki Reading Bridge Foundation ensures strong governance, safeguarding, data privacy, financial controls, and transparent reporting—so every contribution delivers measurable literacy impact.",
};

export const dynamic = "force-dynamic";

function getSectionDocuments(
  documents: PortalResourceRecord[],
  sections: PortalResourceSection[],
  limit = 5,
) {
  return documents.filter((item) => sections.includes(item.section)).slice(0, limit);
}

function UploadedSectionLinks({
  title,
  items,
}: {
  title: string;
  items: PortalResourceRecord[];
}) {
  if (items.length === 0) {
    return <p className="uploaded-download-empty">No uploaded files in this section yet.</p>;
  }

  return (
    <>
      <p className="meta-line">{title}</p>
      <ul className="uploaded-download-list">
        {items.map((item) => (
          <li key={item.id}>
            <a href={item.externalUrl || `/api/resources/${item.id}/download`}>
              {item.downloadLabel?.trim() || item.title}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function TransparencyPage() {
  const uploadedDocs = listPublishedPortalResources(500, {
    sections: [
      "Compliance Documents",
      "Financial Documents",
      "Safeguarding Documents",
      "Legal & Governance Documents",
      "Donor Pack Documents",
      "Monitoring & Evaluation Documents",
      "Impact Report Documents",
    ],
  });
  const governanceDocs = getSectionDocuments(uploadedDocs, ["Legal & Governance Documents"]);
  const complianceDocs = getSectionDocuments(uploadedDocs, [
    "Compliance Documents",
    "Legal & Governance Documents",
  ]);
  const safeguardingDocs = getSectionDocuments(uploadedDocs, ["Safeguarding Documents"]);
  const financialDocs = getSectionDocuments(uploadedDocs, ["Financial Documents"]);
  const reportingDocs = getSectionDocuments(uploadedDocs, [
    "Monitoring & Evaluation Documents",
    "Impact Report Documents",
    "Donor Pack Documents",
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="section donor-trust-hero">
        <div className="container">
          <article className="card donor-trust-hero-card">
            <p className="kicker">Donor assurance</p>
            <h1 className="tpd-page-title">Donor Trust &amp; Accountability</h1>
            <p className="tpd-subline">
              We protect children, protect data, and protect every shilling
              entrusted to our literacy work, with clear governance, strong
              controls, and evidence-backed reporting.
            </p>

            <div className="donor-badge-grid" aria-label="Trust badges">
              {trustBadges.map((badge) => (
                <span className="donor-badge" key={badge}>
                  <span className="donor-badge-icon" aria-hidden>
                    ✓
                  </span>
                  {badge}
                </span>
              ))}
            </div>

            <div className="action-row">
              <a className="button" href="/downloads/donor-trust/ozeki-donor-pack.pdf">
                Download Donor Pack (PDF Bundle)
              </a>
              <a className="button button-ghost" href={dueDiligenceRequestLink}>
                Request Due Diligence Pack
              </a>
              <Link className="button button-ghost" href="/impact/reports">
                View Impact Reports
              </Link>
              <Link className="button button-ghost" href="/partner">
                Book a Partner Call
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section" id="governance-oversight">
        <div className="container">
          <div className="section-head">
            <h2>1) Governance &amp; Oversight</h2>
            <p>
              We maintain clear oversight and role separation to ensure
              integrity, quality delivery, and accountability.
            </p>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>What we publish</h3>
              <ul>
                <li>Board and oversight structure (names and bios where approved)</li>
                <li>Leadership bios and responsibilities</li>
                <li>Decision-making and approval roles</li>
              </ul>
            </article>
            <article className="card">
              <h3>How decisions are managed</h3>
              <ul>
                <li>Clear approval pathways for program and spending decisions</li>
                <li>Documented plans with evidence-based implementation</li>
                <li>Separation of delivery, verification, and payment approvals</li>
              </ul>
            </article>
            <article className="card">
              <h3>Download card</h3>
              <p>Governance structure, oversight roles, and approval pathways.</p>
              <div className="action-row">
                <a className="button" href="/downloads/donor-trust/governance-overview.pdf">
                  Governance Overview (PDF)
                </a>
              </div>
              <UploadedSectionLinks
                title="Latest uploaded governance files"
                items={governanceDocs}
              />
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="legal-compliance">
        <div className="container">
          <div className="section-head">
            <h2>2) Legal &amp; Compliance</h2>
            <p>
              We operate under formal registration and compliance processes and
              provide documentation for partner verification.
            </p>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>Compliance items (published when ready)</h3>
              <ul>
                <li>Registration documentation</li>
                <li>TIN and tax compliance records</li>
                <li>Official bank account details in legal organization name</li>
                <li>Organization profile, address, and authorized signatories</li>
              </ul>
            </article>
            <article className="card">
              <h3>Safeguarding statement</h3>
              <p>
                We implement safeguarding practices across trainings, coaching
                visits, assessments, and all school-facing activities.
              </p>
              <p className="meta-line">
                We provide accurate, verifiable documentation and update partners
                when details change.
              </p>
            </article>
            <article className="card">
              <h3>Download cards</h3>
              <div className="action-row">
                <a className="button" href="/downloads/donor-trust/legal-compliance-summary.pdf">
                  Legal &amp; Compliance Summary (PDF)
                </a>
                <a className="button button-ghost" href="/downloads/donor-trust/safeguarding-summary.pdf">
                  Safeguarding Summary (PDF)
                </a>
              </div>
              <UploadedSectionLinks
                title="Latest uploaded compliance files"
                items={complianceDocs}
              />
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="safeguarding-child-protection">
        <div className="container">
          <div className="section-head">
            <h2>3) Safeguarding &amp; Child Protection</h2>
            <p>We work in school environments. Safeguarding is non-negotiable.</p>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>Our safeguarding commitments</h3>
              <ul>
                <li>Zero tolerance for abuse, exploitation, and harassment</li>
                <li>Professional conduct and boundaries in all engagements</li>
                <li>Consent-based, child-safe photography and story sharing</li>
                <li>Clear escalation and response process for concerns</li>
              </ul>
            </article>
            <article className="card">
              <h3>Reporting and response (within 24 hours)</h3>
              <ul>
                <li>All concerns must be reported within 24 hours</li>
                <li>Reasonable concern is enough; proof is not required to report</li>
                <li>Immediate safety actions are prioritized when risk is urgent</li>
                <li>Cases are documented and handled confidentially</li>
              </ul>
            </article>
            <article className="card">
              <h3>Policy summary</h3>
              <p>
                This policy applies to staff, volunteers, interns,
                consultants, board members, and visitors in Foundation
                activities.
              </p>
              <p className="meta-line">
                Categories covered: concerns linked to Foundation
                representatives, partner staff allegations, and community or
                school incidents in our implementation areas.
              </p>
              <div className="action-row">
                <a className="button" href="/api/transparency/safeguarding-policy">
                  Safeguarding &amp; Child Protection Policy (Full PDF)
                </a>
                <a className="button button-ghost" href="/downloads/donor-trust/incident-reporting-form.pdf">
                  Incident Reporting Form (PDF)
                </a>
                <a className="button button-ghost" href="/downloads/donor-trust/safeguarding-policy-acceptance-statement.pdf">
                  Safeguarding Policy Acceptance Statement (PDF)
                </a>
              </div>
              <UploadedSectionLinks
                title="Latest uploaded safeguarding files"
                items={safeguardingDocs}
              />
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="data-privacy-ethics">
        <div className="container">
          <div className="section-head">
            <h2>4) Data Privacy &amp; Ethics</h2>
            <p>
              We collect learning data to improve instruction and demonstrate
              outcomes while protecting learners and schools.
            </p>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>How we protect data</h3>
              <ul>
                <li>Learners recorded using anonymous IDs</li>
                <li>Role-based access by staff function and scope</li>
                <li>Aggregated reporting for public downloads</li>
                <li>Secure storage and auditable update history</li>
              </ul>
            </article>
            <article className="card">
              <h3>Ethical reporting</h3>
              <ul>
                <li>No inflated claims or unverified impact statements</li>
                <li>Sample sizes, dates, and limitations are reported clearly</li>
                <li>Recommendations are tied directly to evidence</li>
              </ul>
            </article>
            <article className="card">
              <h3>Download card</h3>
              <p>
                Data handling standards for learner protection and evidence
                quality.
              </p>
              <div className="action-row">
                <a className="button" href="/downloads/donor-trust/data-privacy-ethics-summary.pdf">
                  Data Privacy &amp; Ethics Summary (PDF)
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="anti-fraud-financial-controls">
        <div className="container">
          <div className="section-head">
            <h2>5) Anti-Fraud &amp; Financial Controls</h2>
            <p>
              We use practical controls to keep funds traceable, approved, and
              aligned to agreed program purposes.
            </p>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>Controls we apply</h3>
              <ul>
                <li>Documented budgeting and approvals</li>
                <li>Separation of request, approval, payment, and verification</li>
                <li>Procurement checks for significant purchases</li>
                <li>Reconciliations against plans and budgets</li>
              </ul>
            </article>
            <article className="card">
              <h3>Verification and partner reporting</h3>
              <ul>
                <li>Payment records backed by invoices and delivery evidence</li>
                <li>Activity expenses linked to approved implementation plans</li>
                <li>Partner-ready reporting schedules and evidence packs</li>
                <li>Controls reviewed and strengthened as operations scale</li>
              </ul>
            </article>
            <article className="card">
              <h3>Download card</h3>
              <p>Financial governance standards and anti-fraud controls summary.</p>
              <div className="action-row">
                <a className="button" href="/downloads/donor-trust/financial-controls-anti-fraud-summary.pdf">
                  Financial Controls &amp; Anti-Fraud Summary (PDF)
                </a>
              </div>
              <UploadedSectionLinks
                title="Latest uploaded financial files"
                items={financialDocs}
              />
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="transparency-hub">
        <div className="container">
          <div className="section-head">
            <h2>6) Transparency Hub: How Funds Are Used</h2>
            <p>
              Partners deserve clarity. We show how funding converts into
              delivery and measurable literacy outcomes.
            </p>
          </div>
          <div className="cards-grid">
            <article className="card">
              <h3>What funding typically supports</h3>
              <ul>
                <li>Teacher training delivery</li>
                <li>Coaching visits and mentorship</li>
                <li>Learner assessments and progress tracking</li>
                <li>Reading materials and teaching aids</li>
                <li>Remedial and catch-up interventions</li>
                <li>Monitoring, evaluation, and partner reporting</li>
              </ul>
            </article>
            <article className="card">
              <h3>What partners receive</h3>
              <ul>
                <li>Partner-ready FY, term, or quarterly reports</li>
                <li>District and regional performance summaries</li>
                <li>Evidence packs and implementation records</li>
                <li>Learning briefs with action recommendations</li>
              </ul>
            </article>
            <article className="card">
              <h3>Downloads</h3>
              <div className="action-row">
                <Link className="button" href="/impact/reports">
                  FY Impact Report (PDF)
                </Link>
                <a className="button button-ghost" href="/downloads/donor-trust/sample-partner-report.pdf">
                  Sample Partner Report (PDF)
                </a>
                <a className="button button-ghost" href="/downloads/donor-trust/indicator-definitions.pdf">
                  Indicator Definitions (PDF)
                </a>
              </div>
              <UploadedSectionLinks
                title="Latest uploaded reporting files"
                items={reportingDocs}
              />
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>7) FAQs</h2>
          </div>
          <div className="trust-faq-list">
            {faqs.map((item) => (
              <details className="card trust-faq-item" key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Due Diligence Pack (Available on request)</h3>
            <p>Pack contents:</p>
            <ul>
              <li>Organization profile and governance overview</li>
              <li>Safeguarding, data privacy, and financial controls summaries</li>
              <li>Latest reports with indicator definitions</li>
              <li>Sample tools and verification process details</li>
            </ul>
            <div className="action-row">
              <a className="button" href={dueDiligenceRequestLink}>
                Request Due Diligence Pack
              </a>
            </div>
          </article>

          <article className="card">
            <h3>Partner contact</h3>
            <p>
              For donor verification, due diligence, and partnership setup, contact
              our partnerships desk.
            </p>
            <div className="action-row">
              <a className="button button-ghost" href={officialContactLinks.mailto}>
                Email Ozeki
              </a>
              <Link className="button" href="/partner">
                Partner With Us
              </Link>
            </div>
          </article>

          <article className="card">
            <h3>Need an evidence review call?</h3>
            <p>
              Book a call to review delivery evidence, reporting formats, and
              district-level support options.
            </p>
            <div className="action-row">
              <Link className="button" href="/contact">
                Book a Partner Call
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
