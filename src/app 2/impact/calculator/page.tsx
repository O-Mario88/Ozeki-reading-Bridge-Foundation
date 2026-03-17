"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  allUgandaDistricts,
  getDistrictsByRegion,
  ugandaRegions,
} from "@/lib/uganda-locations";

type PackageKey = "country" | "region" | "district";
type CurrencyKey = "USD" | "UGX";
type FrequencyKey = "one-time" | "monthly";
type CostAccordionKey = "visit-details" | "material-details" | "cost-effectiveness";

const packageConfig: Record<
  PackageKey,
  {
    label: string;
    minSchools: number;
    baseAmountUsd: number;
    teachersPerSchool: number;
    visitsPerSchool: number;
    materialsPerSchool: number;
    assessmentCoverage: number;
    reportPackage: string;
  }
> = {
  country: {
    label: "Country (Uganda)",
    minSchools: 15000,
    baseAmountUsd: 900000,
    teachersPerSchool: 12,
    visitsPerSchool: 2,
    materialsPerSchool: 1,
    assessmentCoverage: 0.4,
    reportPackage: "National quarterly snapshot + FY impact report",
  },
  region: {
    label: "Region",
    minSchools: 3000,
    baseAmountUsd: 180000,
    teachersPerSchool: 12,
    visitsPerSchool: 3,
    materialsPerSchool: 1,
    assessmentCoverage: 0.55,
    reportPackage: "Regional quarterly snapshot + FY report + district breakdowns",
  },
  district: {
    label: "District",
    minSchools: 300,
    baseAmountUsd: 18000,
    teachersPerSchool: 12,
    visitsPerSchool: 4,
    materialsPerSchool: 1,
    assessmentCoverage: 0.7,
    reportPackage: "District impact report + quarterly learning briefs",
  },
};

const usdToUgx = 3800;
const averageLearnersPerSchool = 250;
const costPerSchoolUsd = {
  schoolVisits: 90.45,
  trainingMaterials: 56.53,
  mealCosts: 8.48,
  facilitationFee: 1.98,
  total: 157.43,
};

const costLineItems: Array<{
  id: "visits" | "materials" | "meals" | "facilitation";
  icon: string;
  title: string;
  price: number;
  valueLine: string;
  includes: string[];
  outcomeLine: string;
  accordionId: CostAccordionKey;
}> = [
  {
    id: "visits",
    icon: "🚗",
    title: "School Support Visits (4 total)",
    price: costPerSchoolUsd.schoolVisits,
    valueLine: "Coaching that turns training into daily classroom practice.",
    includes: [
      "Classroom observation using simple rubrics",
      "Immediate feedback + teacher improvement targets",
      "Model lessons / co-teaching where needed",
      "Progress review + next-step plan with school leadership",
    ],
    outcomeLine:
      "Stronger routine adoption, better lesson structure, sustained phonics delivery.",
    accordionId: "visit-details",
  },
  {
    id: "materials",
    icon: "📚",
    title: "Training & Reading Materials",
    price: costPerSchoolUsd.trainingMaterials,
    valueLine:
      "Phonics-aligned tools that make teaching consistent and practice possible.",
    includes: [
      "Decodable readers / practice texts aligned to taught sounds",
      "Sound charts, flashcards, word lists, blending tools",
      "Lesson routine guides and templates",
      "Printable practice sheets (where applicable)",
    ],
    outcomeLine:
      "More successful reading practice -> faster decoding and stronger fluency.",
    accordionId: "material-details",
  },
  {
    id: "meals",
    icon: "🍽️",
    title: "Meal Costs (3 people)",
    price: costPerSchoolUsd.mealCosts,
    valueLine: "Modest training-day support that keeps delivery uninterrupted.",
    includes: [
      "Meals during full-day training delivery/support",
      "Basic welfare costs to keep sessions efficient and on schedule",
    ],
    outcomeLine: "Reliable delivery and full participation throughout training days.",
    accordionId: "cost-effectiveness",
  },
  {
    id: "facilitation",
    icon: "👥",
    title: "Facilitation Fee (Shared)",
    price: costPerSchoolUsd.facilitationFee,
    valueLine: "Professional facilitation cost shared across multiple schools.",
    includes: [
      "Training facilitation/coordination cost spread across a cluster",
      "Supports quality delivery while keeping school cost low",
    ],
    outcomeLine: "High quality at low cost through shared delivery.",
    accordionId: "cost-effectiveness",
  },
];

const accordionSections: Array<{
  id: CostAccordionKey;
  title: string;
  points: string[];
}> = [
  {
    id: "visit-details",
    title: "What happens in the 4 school support visits?",
    points: [
      "Visit 1: diagnostic + baseline support + routine setup",
      "Visit 2: coaching + error correction + pacing support",
      "Visit 3: follow-up coaching + catch-up grouping for struggling readers",
      "Visit 4: progress review + leadership accountability + next-term plan",
    ],
  },
  {
    id: "material-details",
    title: "What materials are included?",
    points: [
      "Decodable reading passages aligned to taught sounds",
      "Sound charts, flashcards, blending tools",
      "Teacher lesson templates + routine guides",
      "Practice sheets and word lists for daily drills",
    ],
  },
  {
    id: "cost-effectiveness",
    title: "Why this is so cost-effective",
    points: [
      "One trained teacher impacts hundreds of learners over multiple terms",
      "Coaching ensures adoption (not workshop-only change)",
      "Aligned materials increase successful practice time",
      "Leadership routines sustain gains beyond a single cycle",
    ],
  },
];

const fundingTimeline = [
  {
    icon: "1",
    text: "Train teachers in structured phonics routines",
  },
  {
    icon: "2",
    text: "Coach teachers in class through observation + feedback cycles",
  },
  {
    icon: "3",
    text: "Track learner progress and strengthen instruction using evidence",
  },
  {
    icon: "4",
    text: "Support school leadership to sustain routines beyond one term",
  },
];

function toUsd(amount: number, currency: CurrencyKey) {
  return currency === "USD" ? amount : amount / usdToUgx;
}

function formatUsdAmount(
  value: number,
  { minimumFractionDigits = 2, maximumFractionDigits = 2 } = {},
) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits, maximumFractionDigits })}`;
}

function formatAmount(value: number, currency: CurrencyKey) {
  if (currency === "USD") {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} UGX`;
}

function trackEvent(eventName: string, data: Record<string, string | number> = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const win = window as Window & {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  };
  const payload = { event: eventName, ...data };

  if (Array.isArray(win.dataLayer)) {
    win.dataLayer.push(payload);
  } else {
    win.dataLayer = [payload];
  }

  if (typeof win.gtag === "function") {
    win.gtag("event", eventName, data);
  }
}

export default function ImpactCalculatorPage() {
  const [packageKey, setPackageKey] = useState<PackageKey>("country");
  const [currency, setCurrency] = useState<CurrencyKey>("USD");
  const [amount, setAmount] = useState<number>(900000);
  const [frequency, setFrequency] = useState<FrequencyKey>("one-time");
  const [activeAccordion, setActiveAccordion] =
    useState<CostAccordionKey | null>("visit-details");
  const [selectedRegion, setSelectedRegion] = useState<string>(
    ugandaRegions[0]?.region ?? "Northern Region",
  );
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    allUgandaDistricts[0] ?? "Gulu",
  );
  const districtsInSelectedRegion = useMemo(
    () => getDistrictsByRegion(selectedRegion),
    [selectedRegion],
  );

  const scopeLabel = useMemo(() => {
    if (packageKey === "country") {
      return "Uganda";
    }
    if (packageKey === "region") {
      return selectedRegion;
    }
    return selectedDistrict;
  }, [packageKey, selectedDistrict, selectedRegion]);

  const outcome = useMemo(() => {
    const config = packageConfig[packageKey];
    const amountUsd = Math.max(0, toUsd(amount, currency));
    const frequencyMultiplier = frequency === "monthly" ? 12 : 1;
    const annualContributionUsd = amountUsd * frequencyMultiplier;

    // Minimum school counts are always respected by package.
    const scaling = Math.max(1, annualContributionUsd / config.baseAmountUsd);
    const schoolsSupported = Math.max(
      config.minSchools,
      Math.round(config.minSchools * scaling),
    );
    const learnersSupported = schoolsSupported * averageLearnersPerSchool;
    const costPerLearnerUsd = costPerSchoolUsd.total / averageLearnersPerSchool;
    const totalImplementationCostUsd = schoolsSupported * costPerSchoolUsd.total;

    let regionsCovered = 1;
    let districtsCovered = 1;
    if (packageKey === "country") {
      regionsCovered = ugandaRegions.length;
      districtsCovered = allUgandaDistricts.length;
    } else if (packageKey === "region") {
      regionsCovered = 1;
      districtsCovered = Math.max(1, districtsInSelectedRegion.length);
    }

    const fundingCoveragePercent =
      totalImplementationCostUsd > 0
        ? Math.min(100, (annualContributionUsd / totalImplementationCostUsd) * 100)
        : 0;
    const fundingGapUsd = Math.max(0, totalImplementationCostUsd - annualContributionUsd);
    const fundingSurplusUsd = Math.max(0, annualContributionUsd - totalImplementationCostUsd);

    return {
      regionsCovered,
      districtsCovered,
      schoolsSupported,
      teachersSupported: Math.round(schoolsSupported * config.teachersPerSchool),
      learnersSupported,
      learnersAssessed: Math.round(learnersSupported * config.assessmentCoverage),
      annualContributionUsd,
      totalImplementationCostUsd,
      costPerLearnerUsd,
      fundingCoveragePercent,
      fundingGapUsd,
      fundingSurplusUsd,
      visitsDelivered: Math.round(schoolsSupported * config.visitsPerSchool),
      materialsProduced: Math.round(schoolsSupported * config.materialsPerSchool),
      reportPackage: config.reportPackage,
    };
  }, [amount, currency, districtsInSelectedRegion.length, frequency, packageKey]);

  const costPerLearner = useMemo(
    () => costPerSchoolUsd.total / averageLearnersPerSchool,
    [],
  );
  const learnersPerTenDollars = useMemo(() => Math.round(10 / costPerLearner), [costPerLearner]);
  const learnerCostRows = useMemo(
    () =>
      costLineItems.map((item) => ({
        ...item,
        learnerCost: item.price / averageLearnersPerSchool,
      })),
    [],
  );

  function openAccordionFromCard(accordionId: CostAccordionKey) {
    setActiveAccordion(accordionId);
    document.getElementById("cost-accordion-stack")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Impact</p>
          <h1>Impact Calculator</h1>
          <p>
            Convert funding into measurable literacy outcomes and see what report
            package is included.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Inputs</h2>
            <div className="form-grid impact-calculator-form">
              <label className="full-width">
                Package scope
                <select
                  value={packageKey}
                  onChange={(event) => setPackageKey(event.target.value as PackageKey)}
                >
                  {Object.entries(packageConfig).map(([value, config]) => (
                    <option value={value} key={value}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </label>

              {packageKey === "country" ? (
                <label className="full-width">
                  Country
                  <input value="Uganda" disabled />
                </label>
              ) : null}

              {packageKey === "region" ? (
                <label className="full-width">
                  Region
                  <select
                    value={selectedRegion}
                    onChange={(event) => setSelectedRegion(event.target.value)}
                  >
                    {ugandaRegions.map((entry) => (
                      <option value={entry.region} key={entry.region}>
                        {entry.region}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {packageKey === "district" ? (
                <label className="full-width">
                  District
                  <select
                    value={selectedDistrict}
                    onChange={(event) => setSelectedDistrict(event.target.value)}
                  >
                    {allUgandaDistricts.map((district) => (
                      <option value={district} key={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label>
                Currency
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as CurrencyKey)}
                >
                  <option value="USD">USD</option>
                  <option value="UGX">UGX</option>
                </select>
              </label>

              <label>
                Frequency
                <select
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value as FrequencyKey)}
                >
                  <option value="one-time">One-time</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>

              <label className="full-width">
                Amount ({currency})
                <input
                  type="number"
                  min={0}
                  value={Number.isFinite(amount) ? amount : 0}
                  onChange={(event) => setAmount(Number(event.target.value) || 0)}
                />
              </label>
            </div>

            <p className="note-box">
              Baseline assumptions: Country minimum = 15,000 schools; Region
              minimum = 3,000 schools; District minimum = 300 schools; average
              enrollment = 250 learners per school. Unit cost per school ={" "}
              {formatUsdAmount(costPerSchoolUsd.total)}.
            </p>
          </article>

          <article className="card">
            <h2>Estimated outputs</h2>
            <p className="meta-line">
              Package: {packageConfig[packageKey].label} • Focus: {scopeLabel}
            </p>
            <ul>
              <li>Estimated regions covered: {outcome.regionsCovered.toLocaleString()}</li>
              <li>Estimated districts covered: {outcome.districtsCovered.toLocaleString()}</li>
              <li>Estimated schools supported: {outcome.schoolsSupported.toLocaleString()}</li>
              <li>Teachers trained/coached: {outcome.teachersSupported.toLocaleString()}</li>
              <li>
                Learners supported with literacy:{" "}
                {outcome.learnersSupported.toLocaleString()}
              </li>
              <li>Estimated learners assessed: {outcome.learnersAssessed.toLocaleString()}</li>
              <li>Visits delivered: {outcome.visitsDelivered.toLocaleString()}</li>
              <li>Materials produced/printed: {outcome.materialsProduced.toLocaleString()}</li>
              <li>Estimated cost per learner: {formatUsdAmount(outcome.costPerLearnerUsd)}</li>
              <li>
                Estimated implementation cost:{" "}
                {formatUsdAmount(outcome.totalImplementationCostUsd)}
              </li>
              <li>
                Estimated funding coverage: {outcome.fundingCoveragePercent.toFixed(1)}%
              </li>
              {outcome.fundingGapUsd > 0 ? (
                <li>Estimated funding gap: {formatUsdAmount(outcome.fundingGapUsd)}</li>
              ) : null}
              {outcome.fundingSurplusUsd > 0 ? (
                <li>Estimated funding surplus: {formatUsdAmount(outcome.fundingSurplusUsd)}</li>
              ) : null}
              <li>Report included: {outcome.reportPackage}</li>
            </ul>
            <p className="note-box">
              Estimated contribution: {formatAmount(amount, currency)} ({frequency}) • Annualized
              USD value: {formatUsdAmount(outcome.annualContributionUsd)}
            </p>
            <p className="note-box">
              Cost assumptions per school (USD): School Visits{" "}
              {formatUsdAmount(costPerSchoolUsd.schoolVisits)}, Training Materials{" "}
              {formatUsdAmount(costPerSchoolUsd.trainingMaterials)}, Meal Costs{" "}
              {formatUsdAmount(costPerSchoolUsd.mealCosts)}, Facilitation Fee{" "}
              {formatUsdAmount(costPerSchoolUsd.facilitationFee)}, Total{" "}
              {formatUsdAmount(costPerSchoolUsd.total)}.
            </p>
            <div className="action-row">
              <Link className="button" href="/donate">
                Fund this package
              </Link>
              <Link className="button button-ghost" href="/partner">
                Talk to partnerships
              </Link>
              <Link className="inline-download-link" href="/donor-pack">
                Download donor pack
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section" id="cost-per-child">
        <div className="container cost-per-child-section">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <h2 className="tpd-page-title">Cost to Support Reading in One School</h2>
            <p>
              Transparent pricing that shows exactly what your support delivers, down to
              the cost per child.
            </p>
          </div>

          <article className="card cost-hero-row">
            <div>
              <h3>Fund literacy for an entire school for {formatUsdAmount(costPerSchoolUsd.total)}</h3>
              <p className="cost-badge-copy">
                Based on an average of {averageLearnersPerSchool.toLocaleString()} learners per
                school.
              </p>
            </div>
            <div className="cost-badge-wrap">
              <p className="cost-child-badge">Only {formatUsdAmount(costPerLearner)} per child</p>
              <p className="cost-badge-copy">Transparent and evidence-linked costing model.</p>
            </div>
          </article>

          <div className="action-row cost-cta-row">
            <Link
              className="button"
              href="/donate?package=fund-a-school"
              onClick={() =>
                trackEvent("fund_school_click", {
                  source: "impact-calculator-cost-section",
                })
              }
            >
              Fund a School ({formatUsdAmount(costPerSchoolUsd.total)})
            </Link>
            <Link
              className="button button-ghost"
              href="/donate?package=reading-materials"
            >
              Fund Reading Materials ({formatUsdAmount(costPerSchoolUsd.trainingMaterials)})
            </Link>
            <Link
              className="button button-ghost"
              href="/partner"
              onClick={() =>
                trackEvent("book_call_click", {
                  source: "impact-calculator-cost-section",
                })
              }
            >
              Book a Partner Call
            </Link>
            <Link
              className="inline-download-link"
              href="/donor-pack"
              onClick={() =>
                trackEvent("donor_pack_download", {
                  source: "impact-calculator-cost-section",
                })
              }
            >
              Download Donor Pack
            </Link>
          </div>

          <p className="cost-trust-line">
            Costs are based on a standard support package and may vary slightly by
            location, school size, and delivery schedule.
          </p>

          <div className="cards-grid cost-card-grid">
            {costLineItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`card cost-item-card ${
                  activeAccordion === item.accordionId ? "active" : ""
                }`}
                onClick={() => openAccordionFromCard(item.accordionId)}
                aria-controls="cost-accordion-stack"
                aria-expanded={activeAccordion === item.accordionId}
              >
                <p className="meta-pill">
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.title}</span>
                </p>
                <h3>{item.title}</h3>
                <p className="cost-item-price">{formatUsdAmount(item.price)}</p>
                <p>{item.valueLine}</p>
                <ul>
                  {item.includes.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <p className="cost-outcome-line">
                  <strong>Outcome:</strong> {item.outcomeLine}
                </p>
              </button>
            ))}
          </div>

          <div className="split cost-table-grid">
            <article className="card">
              <h4>Itemized Cost Breakdown (Per School)</h4>
              <div className="cost-table-wrap">
                <table className="cost-table">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">Cost (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>School Support Visits (4 total)</td>
                      <td>{formatUsdAmount(costPerSchoolUsd.schoolVisits)}</td>
                    </tr>
                    <tr>
                      <td>Training &amp; Reading Materials</td>
                      <td>{formatUsdAmount(costPerSchoolUsd.trainingMaterials)}</td>
                    </tr>
                    <tr>
                      <td>Meal Costs (3 people)</td>
                      <td>{formatUsdAmount(costPerSchoolUsd.mealCosts)}</td>
                    </tr>
                    <tr>
                      <td>Facilitation Fee (Shared)</td>
                      <td>{formatUsdAmount(costPerSchoolUsd.facilitationFee)}</td>
                    </tr>
                    <tr className="cost-table-total">
                      <td>Total Cost Per School</td>
                      <td>{formatUsdAmount(costPerSchoolUsd.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>

            <article className="card">
              <h4>What this means per learner</h4>
              <p>
                Assumption: Average {averageLearnersPerSchool.toLocaleString()} learners per school
              </p>
              <p>
                Calculation: {formatUsdAmount(costPerSchoolUsd.total)} &#247;{" "}
                {averageLearnersPerSchool.toLocaleString()} ={" "}
                {formatUsdAmount(costPerLearner)}
              </p>
              <div className="cost-table-wrap">
                <table className="cost-table">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">Cost/School</th>
                      <th scope="col">Cost/Learner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {learnerCostRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.title}</td>
                        <td>{formatUsdAmount(row.price)}</td>
                        <td>{formatUsdAmount(row.learnerCost)}</td>
                      </tr>
                    ))}
                    <tr className="cost-table-total">
                      <td>Total</td>
                      <td>{formatUsdAmount(costPerSchoolUsd.total)}</td>
                      <td>{formatUsdAmount(costPerLearner)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="cost-donor-line">
                <strong>
                  For $10, you support approximately {learnersPerTenDollars} learners (based on{" "}
                  {formatUsdAmount(costPerLearner)} per learner).
                </strong>
              </p>
            </article>
          </div>

          <article className="card">
            <h4>What your funding delivers (in plain terms)</h4>
            <div className="cost-timeline-strip">
              {fundingTimeline.map((step) => (
                <div key={step.icon} className="cost-timeline-step">
                  <span className="cost-step-icon" aria-hidden="true">
                    {step.icon}
                  </span>
                  <p>{step.text}</p>
                </div>
              ))}
            </div>
            <p className="cost-outcome-line">
              <strong>Outcome:</strong> Better teaching -&gt; better reading foundations -&gt;
              stronger fluency and comprehension over time.
            </p>
          </article>

          <article className="card" id="cost-accordion-stack">
            <h4>Expandable Details</h4>
            <div className="cost-accordion-stack">
              {accordionSections.map((section) => {
                const isOpen = activeAccordion === section.id;
                return (
                  <div
                    className={`cost-accordion-item ${isOpen ? "open" : ""}`}
                    key={section.id}
                  >
                    <button
                      type="button"
                        className="cost-accordion-trigger"
                        onClick={() =>
                          setActiveAccordion((current) =>
                            current === section.id ? null : section.id,
                          )
                        }
                      aria-expanded={isOpen}
                    >
                      <span>{section.title}</span>
                      <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen ? (
                      <div className="cost-accordion-content">
                        <ul>
                          {section.points.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </article>

          <article className="card cost-closing-cta">
            <h4>Want to fund literacy by region or district instead?</h4>
            <p>
              Choose Country -&gt; Region -&gt; District and we will generate a scoped
              plan and reporting package for that geography.
            </p>
            <div className="action-row cost-cta-row">
              <Link className="button" href="/donate?package=fund-a-region">
                Fund a Region
              </Link>
              <Link className="button button-ghost" href="/donate?package=fund-a-district">
                Fund a District
              </Link>
              <Link
                className="button button-ghost"
                href="/partner?request=concept-note"
              >
                Request a Concept Note
              </Link>
              <Link
                className="button button-ghost"
                href="/partner"
                onClick={() =>
                  trackEvent("book_call_click", {
                    source: "impact-calculator-closing-cta",
                  })
                }
              >
                Book a Partner Call
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
