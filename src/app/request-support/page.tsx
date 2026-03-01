import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import SupportRequestForm from "@/components/SupportRequestForm";

export default function RequestSupportPage() {
    return (
        <main className="min-h-screen bg-gray-50 flex flex-col">
            <SiteHeader />

            <div className="flex-grow pt-32 pb-20">
                <div className="container mx-auto px-6 mb-12 text-center">
                    <span className="inline-block px-4 py-1.5 mb-6 text-sm font-bold tracking-widest text-indigo-600 uppercase bg-indigo-50 rounded-full border border-indigo-100">
                        Ozeki Bridge Foundation
                    </span>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6 tracking-tight leading-tight max-w-4xl mx-auto">
                        Supporting Your School's <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Literacy Journey</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        Need training, resources, or guidance? Submit a request and our team will partner with you to improve reading outcomes.
                    </p>
                </div>

                <SupportRequestForm />
            </div>

            <SiteFooter />
        </main>
    );
}
