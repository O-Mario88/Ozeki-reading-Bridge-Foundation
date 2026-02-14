import { ContactForm } from "@/components/ContactForm";
import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "Contact",
  description:
    "Contact Ozeki Reading Bridge Foundation for school support, partnerships, media requests, or general inquiries.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        kicker="Get in touch"
        title="Contact"
        description="Use the form for school and partner inquiries, or reach us directly on WhatsApp."
      />

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Direct contact</h2>
            <p>Email: info@ozekireadingbridge.org</p>
            <p>Phone/WhatsApp: +256 700 000 000</p>
            <p>Kampala, Uganda</p>
            <p>
              <a href="https://wa.me/256700000000" target="_blank" rel="noreferrer">
                Open WhatsApp chat
              </a>
            </p>
          </article>
          <article className="card">
            <h2>Inquiry form</h2>
            <ContactForm />
          </article>
        </div>
      </section>
    </>
  );
}
