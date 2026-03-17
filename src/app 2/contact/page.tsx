import { ContactInquiryModal } from "@/components/ContactInquiryModal";
import { PageHero } from "@/components/PageHero";
import { officialContact, officialContactLinks } from "@/lib/contact";

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
            <p>
              <a href={officialContactLinks.mailto}>Email: {officialContact.email}</a>
            </p>
            <p>
              <a href={officialContactLinks.tel}>Phone/WhatsApp: {officialContact.phoneDisplay}</a>
            </p>
            <p>{officialContact.address}</p>
            <p>
              <a href={officialContactLinks.whatsapp} target="_blank" rel="noreferrer">
                Open WhatsApp chat
              </a>
            </p>
          </article>
          <article className="card">
            <h2>Inquiry form</h2>
            <p>
              Click below to open the inquiry form. It closes automatically after
              successful submission.
            </p>
            <div className="action-row">
              <ContactInquiryModal />
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
