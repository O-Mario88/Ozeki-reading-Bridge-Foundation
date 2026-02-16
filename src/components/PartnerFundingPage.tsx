"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PartnerActionForm } from "@/components/PartnerActionForm";

type PackageCard = {
  id: string;
  title: string;
  bestFor: string;
  whatYouFund: string[];
  whatHappens: string[];
  outputs: string[];
  outcomes: string[];
  cta: string;
};

type BoosterCard = {
  id: string;
  title: string;
  funds: string;
  outputs: string;
  outcome: string;
  cta: string;
};

type ModalIntent = {
  heading: string;
  type: string;
  actionLabel: string;
  contextLabel?: string;
};

const fundingPackages: PackageCard[] = [
  {
    id: "country",
    title: "1) Country Package: Uganda Literacy Strengthening",
    bestFor: "National-scale partners, foundations, and large donors.",
    whatYouFund: [
      "Teacher professional development in structured phonics",
      "School-based coaching and observation cycles",
      "Learner reading assessments and progress tracking",
      "Reading materials and teacher aids",
      "Monitoring, evaluation, and national learning briefs",
    ],
    whatHappens: [
      "District selection using need and readiness criteria",
      "Term-aligned teacher training rollout",
      "Coaching cycles for classroom implementation",
      "Assessment cycles and progress reviews",
      "Leadership support for supervision routines",
    ],
    outputs: [
      "National reach summary (schools, teachers, leaders, learners)",
      "National learning outcomes dashboard (aggregated)",
      "Quarterly snapshots and FY impact report",
      "National learning brief with recommendations",
    ],
    outcomes: [
      "Improved instructional quality and teacher confidence",
      "Measurable decoding, fluency, and comprehension gains",
      "Stronger literacy supervision practices across systems",
    ],
    cta: "Fund Uganda literacy",
  },
  {
    id: "region",
    title: "2) Region/Sub-region Package: Concentrated Regional Impact",
    bestFor: "Partners who want clear geographic identity and measurable regional change.",
    whatYouFund: [
      "Phonics training and practical routines",
      "Coaching and observation cycles",
      "Learner assessment cycles",
      "Leadership mentoring (Headteachers and DoS)",
      "Materials support aligned to progression",
    ],
    whatHappens: [
      "Baseline checks and school diagnostics",
      "Practical teacher training and demonstrations",
      "Coaching follow-up and routine adoption tracking",
      "Progress reviews with school feedback loops",
      "Leadership supervision strengthening",
    ],
    outputs: [
      "Regional dashboard access (partner-scoped)",
      "Regional quarterly snapshots and FY report",
      "District breakdowns within funded region",
      "Evidence pack (logs, summaries, approved media)",
    ],
    outcomes: [
      "Consistent phonics routines across supported schools",
      "Improved outcomes in assessed reading skills",
      "School-level literacy routines sustained beyond one-off training",
    ],
    cta: "Fund a region",
  },
  {
    id: "district",
    title: "3) District Package: Deep, Measurable District Change",
    bestFor: "Partners seeking the clearest evidence trail and visible implementation depth.",
    whatYouFund: [
      "Teacher training in structured phonics",
      "Coaching and observation cycles",
      "Baseline, progress, and endline assessments",
      "Remedial routines for struggling readers",
      "Teaching aids, materials, and leadership support",
    ],
    whatHappens: [
      "District planning and school diagnostics",
      "Teacher training rollout by school cluster",
      "Scheduled coaching cycles with observation rubrics",
      "Learner assessments and progress tracking",
      "District performance review and next-term priorities",
    ],
    outputs: [
      "District impact report and quarterly learning briefs",
      "District dashboard access (partner-scoped)",
      "Skill-area outcomes (sounds, decoding, fluency, comprehension)",
      "Priority gaps with actionable next steps",
    ],
    outcomes: [
      "Stronger teacher practice and lesson structure",
      "Measurable learner gains and fewer non-readers",
      "Sustained literacy systems and accountability",
    ],
    cta: "Fund a district",
  },
];

const boosters: BoosterCard[] = [
  {
    id: "materials",
    title: "A) Reading Materials Booster",
    funds: "Printing and distribution of decodable readers and classroom text sets.",
    outputs: "Print/distribution log and teacher usage guidance.",
    outcome: "More meaningful reading practice and faster fluency growth.",
    cta: "Add materials booster",
  },
  {
    id: "data",
    title: "B) Assessments & Data Booster",
    funds: "Expanded assessment coverage, stronger analytics, and faster reporting cadence.",
    outputs: "Deeper dashboards and more frequent partner briefs.",
    outcome: "Earlier gap detection and better targeted instruction.",
    cta: "Add data booster",
  },
  {
    id: "story",
    title: "C) 1001 Story Project Booster",
    funds: "Writing routine training, editing, and anthology publishing support.",
    outputs: "Learner draft portfolio and published anthology evidence.",
    outcome: "Improved writing confidence and fluency through read-aloud practice.",
    cta: "Add 1001 Story booster",
  },
];

export function PartnerFundingPage() {
  const [activeIntent, setActiveIntent] = useState<ModalIntent | null>(null);

  useEffect(() => {
    document.body.style.overflow = activeIntent ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeIntent]);

  const quickActions = useMemo(
    () => ({
      partnerCall: {
        heading: "Book a Partner Call",
        type: "Partner Call Request",
        actionLabel: "Submit partner call request",
      },
      proposal: {
        heading: "Request a Proposal",
        type: "Partner Proposal Request",
        actionLabel: "Submit proposal request",
      },
      sponsor: {
        heading: "Sponsor Interest",
        type: "Sponsor Interest",
        actionLabel: "Submit sponsor interest",
      },
    }),
    [],
  );

  const openForm = (intent: ModalIntent) => {
    setActiveIntent(intent);
  };

  return (
    <>
      <section className="hero hero-unified">
        <div className="container hero-layout hero-layout-single">
          <div className="hero-copy hero-copy-with-photo page-hero-copy">
            <p className="kicker">Partner with us</p>
            <h1 className="partner-hero-title">
              Fund Literacy That Shows Results - by Country, Region, or District
            </h1>
            <p className="partner-hero-intro">
              Ozeki Reading Bridge Foundation equips teachers and schools with
              practical, evidence-based reading instruction using structured phonics,
              then supports implementation through coaching, assessments, materials,
              and leadership mentoring.
            </p>
            <p>
              Partners can choose to fund literacy at the level that matches their
              vision: <strong>Country (Uganda)</strong>,{" "}
              <strong>Region/Sub-region</strong>, or <strong>District</strong>. Every
              package includes evidence and reporting.
            </p>
            <div className="action-row">
              <Link className="inline-download-link" href="/donor-pack">
                Download Donor Pack
              </Link>
              <button
                className="button button-ghost"
                type="button"
                onClick={() => openForm(quickActions.partnerCall)}
              >
                Book a partner call
              </button>
              <Link className="button button-ghost" href="/impact/calculator">
                Use impact calculator
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Choose your focus area</h2>
          </div>
          <div className="partner-focus-flow">
            <div>
              <h3>Step 1: Select geography</h3>
              <p>Country -&gt; Region/Sub-region -&gt; District</p>
              <ul>
                <li>Country: Uganda</li>
                <li>Regions: Northern Uganda, Busoga, West Nile, Greater Kampala</li>
                <li>Districts: fund one district deeply for visible change</li>
              </ul>
            </div>
            <div>
              <h3>Step 2: Select support intensity</h3>
              <ul>
                <li>
                  Standard support: training + coaching cycles + learner assessment +
                  reporting
                </li>
                <li>
                  Intensive support: standard package + remedial routines + materials
                  boost + stronger leadership supervision
                </li>
              </ul>
            </div>
            <div>
              <h3>Step 3: Select reporting level</h3>
              <ul>
                <li>Public (aggregated)</li>
                <li>Partner scope (portal dashboards and scoped reports)</li>
                <li>Secure school reports (optional controlled access)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Funding packages (location-based)</h2>
            <p>
              You do not fund activity counts alone. You fund outcomes that can be
              verified.
            </p>
          </div>
          <div className="cards-grid">
            {fundingPackages.map((item) => (
              <article className="card partner-funding-card" key={item.id}>
                <h3>{item.title}</h3>
                <p className="meta-line">
                  <strong>Best for:</strong> {item.bestFor}
                </p>

                <h4>What you fund</h4>
                <ul>
                  {item.whatYouFund.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>

                <h4>What happens</h4>
                <ul>
                  {item.whatHappens.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>

                <h4>Outputs you receive</h4>
                <ul>
                  {item.outputs.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>

                <h4>Outcomes you can expect</h4>
                <ul>
                  {item.outcomes.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>

                <div className="action-row">
                  <button
                    className="button"
                    type="button"
                    onClick={() =>
                      openForm({
                        heading: item.cta,
                        type: "Funding Package Interest",
                        actionLabel: "Submit funding interest",
                        contextLabel: item.title,
                      })
                    }
                  >
                    {item.cta}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Add-on boosters</h2>
          </div>
          <div className="cards-grid">
            {boosters.map((booster) => (
              <article className="card partner-funding-card" key={booster.id}>
                <h3>{booster.title}</h3>
                <p>
                  <strong>Funds:</strong> {booster.funds}
                </p>
                <p>
                  <strong>Outputs:</strong> {booster.outputs}
                </p>
                <p>
                  <strong>Outcome:</strong> {booster.outcome}
                </p>
                <div className="action-row">
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() =>
                      openForm({
                        heading: booster.cta,
                        type: "Booster Request",
                        actionLabel: "Submit booster request",
                        contextLabel: booster.title,
                      })
                    }
                  >
                    {booster.cta}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split partner-summary-grid">
          <article className="card partner-funding-card">
            <h3>What reports will partners receive?</h3>
            <ul>
              <li>Quarterly snapshot: reach, implementation, outcomes</li>
              <li>FY impact report: annual evidence and lessons learned</li>
              <li>Learning brief: what worked, what changed, what is next</li>
            </ul>
            <p className="meta-line">
              Public reports are aggregated. Learner identities are never published.
            </p>
          </article>
          <article className="card partner-funding-card">
            <h3>Why partners choose Ozeki</h3>
            <ul>
              <li>We prioritize classroom implementation, not one-off workshops</li>
              <li>We track learner progress, not only activity counts</li>
              <li>We strengthen school routines for sustainability</li>
              <li>We provide partner-ready evidence, not marketing claims</li>
            </ul>
            <div className="action-row">
              <button
                className="button"
                type="button"
                onClick={() => openForm(quickActions.partnerCall)}
              >
                Book a partner call
              </button>
              <Link className="button button-ghost" href="/impact/calculator">
                Use impact calculator
              </Link>
              <button
                className="button button-ghost"
                type="button"
                onClick={() => openForm(quickActions.proposal)}
              >
                Request proposal
              </button>
            </div>
          </article>
        </div>
      </section>

      {activeIntent ? (
        <div
          className="floating-donor-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={activeIntent.heading}
          onClick={() => setActiveIntent(null)}
        >
          <div
            className="card floating-donor-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="floating-donor-header">
              <div>
                <p className="kicker">Donor form</p>
                <h3>{activeIntent.heading}</h3>
              </div>
              <button
                className="button button-ghost"
                type="button"
                onClick={() => setActiveIntent(null)}
              >
                Close
              </button>
            </div>
            <PartnerActionForm
              type={activeIntent.type}
              actionLabel={activeIntent.actionLabel}
              includeCountry
              contextLabel={activeIntent.contextLabel}
              onSuccess={() => setActiveIntent(null)}
              onCancel={() => setActiveIntent(null)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
