import { PageHero } from "@/components/public/PageHero";
import { listServiceCatalogPostgres } from "@/lib/server/postgres/repositories/service-booking";
import { BookingWizard } from "@/components/public/BookingWizard";


export const metadata = {
  title: "Request School Services | OzekiRead",
  description: "Request professional literacy and phonics support services for your school including teacher training and lesson observations."
};

export default async function ServiceRequestPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let catalog: any[] = [];
  try {
    catalog = await listServiceCatalogPostgres();
    if (!catalog || catalog.length === 0) throw new Error("Catalog empty, falling back to mock");
  } catch (error) {
    console.warn("[ServiceRequestPage] failed to fetch catalog from DB, using mock fallback", error);
    catalog = [
      { id: 101, serviceName: "Teacher Training", description: "", pricingModel: "per_day", unitPrice: 500000, currency: "UGX" },
      { id: 102, serviceName: "Lesson Observation and Coaching", description: "", pricingModel: "per_day", unitPrice: 350000, currency: "UGX" },
      { id: 103, serviceName: "Learner Assessment, Analysis, Report and Coaching", description: "", pricingModel: "per_class", unitPrice: 300000, currency: "UGX" },
    ];
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <PageHero
        imageSrc="/photos/IMG-20241030-WA0013.jpg"
        tagline="Ozeki Support Services"
        title="Request Ozeki School Services"
        subtitle="OzekiRead provides professional literacy and phonics support services for schools, including teacher training, lesson observation, coaching, and learner assessment. Complete the form below to request a quotation and schedule support for your school."
      />
      
      <div className="max-w-4xl mx-auto px-4 py-16">
         <BookingWizard catalog={catalog} />
      </div>
    </div>
  );
}
