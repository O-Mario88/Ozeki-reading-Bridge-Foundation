import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import PhonicsObservationForm from "@/components/portal/PhonicsObservationForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Observation | Ozeki Portal" };

const CALIBRI = 'Calibri, "Segoe UI", Arial, sans-serif';

export default async function NewObservationPage() {
  const user = await requirePortalUser();

  return (
    <PortalShell user={user} activeHref="/portal/observations" hideFrame>
      <div
        style={{ fontFamily: CALIBRI, backgroundColor: "#e7ecf3" }}
        className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1700px] mx-auto"
      >
        {/* ─── Page title row ────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-[34px] font-extrabold text-[#111827] tracking-tight leading-tight">
            New Observation
          </h1>
          <Link
            href="/portal/observations"
            className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#066a67] hover:text-[#044f4d] mt-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Back to Observations
          </Link>
        </div>

        {/* Form (provides its own stepper, intro, sections, bottom bar) */}
        <PhonicsObservationForm mode="create" />
      </div>
    </PortalShell>
  );
}
