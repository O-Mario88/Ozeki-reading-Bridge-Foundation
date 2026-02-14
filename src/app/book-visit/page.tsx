import { BookingForm } from "@/components/BookingForm";
import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "Book an Appointment",
  description:
    "Book a school diagnostic visit, teacher training session, coaching follow-up, assessment, or 1001 Story onboarding.",
};

export default function BookVisitPage() {
  return (
    <>
      <PageHero
        kicker="Booking"
        title="Book a School Visit"
        description="Choose a service, share your school context, and request your preferred date and time."
      />

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>What happens after booking</h2>
            <ol>
              <li>Request review by our program team</li>
              <li>Confirmation by email/WhatsApp</li>
              <li>Pre-visit alignment call</li>
              <li>On-site or remote support session</li>
            </ol>
          </article>
          <article className="card">
            <h2>Pre-visit checklist</h2>
            <ul>
              <li>Number of teachers and grade levels</li>
              <li>Current reading instruction challenges</li>
              <li>Recent internal assessment data if available</li>
              <li>School location and preferred schedule</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <BookingForm />
        </div>
      </section>
    </>
  );
}
