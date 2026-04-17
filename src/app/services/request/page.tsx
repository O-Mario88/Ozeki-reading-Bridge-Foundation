import { PageHero } from "@/components/public/PageHero";
import { listServiceCatalogPostgres } from "@/lib/server/postgres/repositories/service-booking";
import { BookingWizard } from "@/components/public/BookingWizard";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Request School Services | OzekiRead",
  description: "Request professional literacy and phonics support services for your school including teacher training and lesson observations."
};

export default async function ServiceRequestPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let catalog: any[] = [];
  try {
    catalog = await listServiceCatalogPostgres();
  } catch (error) {
    console.error("[ServiceRequestPage] failed to fetch catalog at build time", error);
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <PageHero
        imageSrc="/photos/IMG-20241030-WA0013.jpg"
        tagline="Ozeki Support Services"
        title="Request Ozeki School Services"
        subtitle="OzekiRead provides professional literacy and phonics support services for schools, including teacher training, lesson observation, coaching, and learner assessment. Complete the form below to request a quotation and schedule support for your school."
      />
      
      <div className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
         {/* LEFT COLUMN - CATALOG DISPLAY */}
         <div className="lg:col-span-4 space-y-6">
            <h3 className="text-2xl font-black text-gray-900 border-b pb-4">Our Service Catalog</h3>
            {catalog.map(service => (
               <div key={service.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h4 className="text-xl font-bold text-[#006b61] mb-2">{service.serviceName}</h4>
                  <p className="text-2xl font-black text-[#FA7D15] mb-4">
                     UGX {service.unitPrice.toLocaleString()} <span className="text-sm text-gray-500 font-medium">/{service.pricingModel === 'per_day' ? 'day' : 'class'}</span>
                  </p>
                  
                  <div className="space-y-2 mb-6">
                     <p className="text-sm text-gray-600 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        Professional Ozeki Facilitation
                     </p>
                     {service.serviceName.includes('Training') ? (
                       <p className="text-sm text-gray-600 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          Includes training resources, flashcards, lesson plans, scheme of work, and teacher workbook.
                       </p>
                     ) : service.serviceName.includes('Observation') ? (
                       <p className="text-sm text-gray-600 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          Includes classroom observation, coaching feedback, and practical teacher support.
                       </p>
                     ) : (
                       <p className="text-sm text-gray-600 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          Includes learner assessment, data analysis, written report, and coaching based on results.
                       </p>
                     )}
                  </div>
               </div>
            ))}
         </div>
         
         {/* RIGHT COLUMN - BOOKING WIZARD */}
         <div className="lg:col-span-8">
            <BookingWizard catalog={catalog} />
         </div>
      </div>
    </div>
  );
}
