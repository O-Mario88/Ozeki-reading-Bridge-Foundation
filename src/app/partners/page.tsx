import { PageHero } from "@/components/PageHero";
import { partners } from "@/lib/content";

export const metadata = {
  title: "Partners & Supporters",
  description: "Current collaboration channels with districts, school networks, and NGOs.",
};

export default function PartnersPage() {
  return (
    <>
      <PageHero
        kicker="Partnership ecosystem"
        title="Partners & Supporters"
        description="Collaboration structures that support implementation, accountability, and scale."
      />
      <section className="section">
        <div className="container cards-grid">
          {partners.map((partner) => (
            <article className="card" key={partner.name}>
              <h2>{partner.name}</h2>
              <p>{partner.note}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
