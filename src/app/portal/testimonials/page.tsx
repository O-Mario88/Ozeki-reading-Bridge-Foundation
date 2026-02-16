import { PortalTestimonialsManager } from "@/components/portal/PortalTestimonialsManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { listPortalTestimonials } from "@/lib/db";
import { requirePortalUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Testimonial Stories",
  description: "Portal form for staff and volunteers to submit testimonial stories.",
};

export default async function PortalTestimonialsPage() {
  const user = await requirePortalUser();
  const testimonials = listPortalTestimonials(user, 180).map((item) => ({
    ...item,
    videoUrl: `/api/testimonials/${item.id}/video`,
    photoUrl: item.photoFileName ? `/api/testimonials/${item.id}/photo` : null,
  }));

  return (
    <PortalShell
      user={user}
      activeHref="/portal/testimonials"
      title="Testimonial Story Collection"
      description="Capture text stories and video testimony in one submission workflow."
    >
      <PortalTestimonialsManager initialTestimonials={testimonials} />
    </PortalShell>
  );
}
