
import SupportRequestForm from "@/components/SupportRequestForm";
import { PageHero } from "@/components/public/PageHero";
import { SectionWrapper } from "@/components/public/SectionWrapper";

export default function RequestSupportPage() {
    return (
        <main className="min-h-screen flex flex-col bg-charius-beige">
            <PageHero
                tagline="Ozeki Bridge Foundation"
                title={<>Supporting Your School&apos;s <br />Literacy Journey</>}
                subtitle="Need training, resources, or guidance? Submit a request and our team will partner with you to improve reading outcomes."
                imageSrc="/photos/Amolatar%20District%20Literacy.jpg"
            />
            <SectionWrapper theme="charius-beige" className="!pt-12 !pb-24">
                <SupportRequestForm />
            </SectionWrapper>
        </main>
    );
}
