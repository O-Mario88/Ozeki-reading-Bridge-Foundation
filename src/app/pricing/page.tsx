import { PageHero } from "@/components/PageHero";
import { pricingTiers } from "@/lib/content";

export const metadata = {
  title: "Pricing",
  description:
    "Membership and licensing structure for teachers, schools, and district networks.",
};

export default function PricingPage() {
  return (
    <>
      <PageHero
        kicker="Simple and credible"
        title="Pricing"
        description="A clear structure for individual teachers, schools, and multi-school partners."
      />

      <section className="section">
        <div className="container cards-grid">
          {pricingTiers.map((tier) => (
            <article className="card" key={tier.name}>
              <p className="meta-pill">{tier.audience}</p>
              <h2>{tier.name}</h2>
              <p>{tier.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container note-box">
          Payment options planned: Mobile Money, card payments, invoice billing for
          schools, coupons, scholarships, and sponsored seats.
        </div>
      </section>
    </>
  );
}
