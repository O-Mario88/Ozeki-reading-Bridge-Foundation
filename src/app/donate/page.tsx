import Link from "next/link";
import { donateLinks, officialContact, officialContactLinks } from "@/lib/contact";

export const metadata = {
  title: "Donate",
  description:
    "Support literacy that delivers measurable results through one-time or monthly giving.",
};

const givingOptions = [
  {
    title: "Fund a School",
    amount: "$1,800",
    outcome: "Support one school with training, coaching, assessments, and starter resources.",
  },
  {
    title: "Print Readers",
    amount: "$2,500",
    outcome: "Print and distribute decodable readers and classroom practice packs.",
  },
  {
    title: "Support Assessments",
    amount: "$5,000",
    outcome: "Run baseline/endline assessments with district reporting and action recommendations.",
  },
];

export default function DonatePage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Giving</p>
          <h1>Support literacy that delivers measurable results</h1>
          <p>
            Give once or monthly. Every contribution supports practical literacy delivery
            with transparent reporting.
          </p>
          <div className="action-row">
            <a className="button" href={donateLinks.paypal} target="_blank" rel="noreferrer">
              Donate with PayPal
            </a>
            <Link className="button button-ghost" href="/impact/calculator">
              Open Impact Calculator
            </Link>
            <Link className="button button-ghost" href="/donor-pack">
              Download Donor Pack
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          {givingOptions.map((option) => (
            <article className="card" key={option.title}>
              <h2>{option.title}</h2>
              <p className="meta-pill">Suggested amount: {option.amount}</p>
              <p>{option.outcome}</p>
              <div className="action-row">
                <a className="button" href={donateLinks.paypal} target="_blank" rel="noreferrer">
                  Give now
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Payment methods</h2>
            <ul>
              <li>Card payments via PayPal checkout</li>
              <li>PayPal one-time or recurring giving</li>
              <li>Bank transfer details available on request</li>
            </ul>
            <p className="meta-line">
              Auto receipt: You will receive confirmation immediately after payment.
            </p>
          </article>

          <article className="card">
            <h2>Bank transfer and support</h2>
            <p>
              For bank transfer setup and invoicing support, contact our team:
            </p>
            <p>
              <a href={officialContactLinks.mailto}>{officialContact.email}</a>
            </p>
            <p>
              <a href={officialContactLinks.tel}>{officialContact.phoneDisplay}</a>
            </p>
            <p>{officialContact.address}</p>
            <div className="action-row">
              <Link className="button button-ghost" href="/partner#book-a-partner-call">
                Book a donor call
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
