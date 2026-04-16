import { ContactForm } from "@/components/ContactForm";
import { officialContact, officialContactLinks } from "@/lib/contact";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { PageHero } from "@/components/public/PageHero";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";

export const metadata = {
  title: "Contact",
  description:
    "Contact Ozeki Reading Bridge Foundation for school support, partnerships, media requests, or general inquiries.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        tagline="Get in touch"
        title="Contact Us"
        subtitle="Reach out for school support, partnerships, media requests, or general inquiries."
        imageSrc="/photos/PXL_20260218_140338031.jpg"
      />

      <SectionWrapper theme="charius-beige">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 max-w-6xl mx-auto items-start">
          
          {/* Office Details Column */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <div>
              <h2 className="text-3xl font-bold text-[#111] mb-6">Our Head Office</h2>
              <p className="text-lg text-gray-500 leading-relaxed mb-8">
                Based in Northern Uganda, our team travels regularly to support partner schools across multiple districts. Reach us directly using any of the channels below.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              <PremiumCard variant="charius" className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-[#111] mb-1">Email us</h3>
                  <a href={officialContactLinks.mailto} className="text-gray-500 hover:text-[#FA7D15] transition-colors">
                    {officialContact.email}
                  </a>
                </div>
              </PremiumCard>

              <PremiumCard variant="charius" className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-[#FA7D15]/10 text-[#FA7D15] flex items-center justify-center">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-[#111] mb-1">Call us</h3>
                  <a href={officialContactLinks.tel} className="text-gray-500 hover:text-[#FA7D15] transition-colors">
                    {officialContact.phoneDisplay}
                  </a>
                </div>
              </PremiumCard>

              <PremiumCard variant="charius" className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-[#111] mb-1">WhatsApp</h3>
                  <a href={officialContactLinks.whatsapp} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-green-600 transition-colors">
                    Chat with our support team
                  </a>
                </div>
              </PremiumCard>

              <PremiumCard variant="charius" className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-[#FA7D15]/10 text-[#FA7D15] flex items-center justify-center">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-[#111] mb-1">Visit us</h3>
                  <p className="text-gray-500 leading-relaxed max-w-[200px]">
                    {officialContact.address}
                  </p>
                </div>
              </PremiumCard>
            </div>
          </div>

          {/* Contact Form Column */}
          <div className="lg:col-span-3">
            <PremiumCard variant="charius" className="p-8 md:p-12">
              <h2 className="text-3xl font-bold text-[#111] mb-2">Send an inquiry</h2>
              <p className="text-gray-500 mb-8 pb-8 border-b border-gray-100">
                Use the form below and our team will route it to the right department.
              </p>
              
              <div className="ContactFormWrapper text-left">
                {/* 
                  The legacy BaseContactForm styles inputs globally or with specific classes. 
                  We wrap it here to ensure it inherits our new premium spacing if needed.
                */}
                <ContactForm />
              </div>
            </PremiumCard>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
