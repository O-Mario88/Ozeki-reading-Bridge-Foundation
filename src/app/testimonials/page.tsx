import { PageHero } from "@/components/PageHero";
import { testimonials } from "@/lib/content";

export const metadata = {
  title: "Testimonials",
  description: "Feedback from teachers, headteachers, and school leaders.",
};

export default function TestimonialsPage() {
  return (
    <>
      <PageHero
        kicker="Trust builders"
        title="Testimonials"
        description="Voices from teachers and school leaders implementing practical phonics routines."
      />
      <section className="section">
        <div className="container cards-grid">
          {testimonials.map((testimonial) => (
            <article className="card" key={testimonial.name}>
              <p>"{testimonial.quote}"</p>
              <p className="meta-line">
                <strong>{testimonial.name}</strong> · {testimonial.role}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
