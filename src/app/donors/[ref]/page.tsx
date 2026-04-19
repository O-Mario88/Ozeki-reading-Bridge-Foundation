import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDonationByReferencePostgres,
  getDonationReceiptPostgres,
} from "@/lib/server/postgres/repositories/donations";
import {
  getSponsorshipByReferencePostgres,
  getSponsorshipReceiptPostgres,
  getSponsorshipImpactDataPostgres,
} from "@/lib/server/postgres/repositories/sponsorships";
import {
  Heart, Download, CheckCircle, Clock, AlertCircle,
  School, Users, BookOpen, Activity, ChevronRight, Shield,
} from "lucide-react";
import { SponsorshipImpactChain } from "@/components/public/SponsorshipImpactChain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Giving Record | Ozeki Reading Bridge Foundation",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ ref: string }> };

type StatusBadgeProps = { status: string };
function StatusBadge({ status }: StatusBadgeProps) {
  const s = status.toLowerCase();
  if (s === "completed" || s === "paid") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-100">
        <CheckCircle className="w-3.5 h-3.5" /> Completed
      </span>
    );
  }
  if (s === "pending payment" || s === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold border border-amber-100">
        <Clock className="w-3.5 h-3.5" /> Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-600 text-sm font-semibold border border-gray-100">
      <AlertCircle className="w-3.5 h-3.5" /> {status}
    </span>
  );
}

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export default async function DonorSelfServicePage({ params }: PageProps) {
  const { ref } = await params;
  const decoded = decodeURIComponent(ref).toUpperCase().trim();

  // Detect type by prefix and look up both tables in parallel
  const [donation, sponsorship] = await Promise.all([
    decoded.startsWith("OZK-DON") ? getDonationByReferencePostgres(decoded) : Promise.resolve(null),
    decoded.startsWith("OZK-SPN") ? getSponsorshipByReferencePostgres(decoded) : Promise.resolve(null),
  ]);

  // Also try both tables if prefix is ambiguous
  const [donationFallback, sponsorshipFallback] = await Promise.all([
    !donation && !decoded.startsWith("OZK-SPN") ? getDonationByReferencePostgres(decoded) : Promise.resolve(null),
    !sponsorship && !decoded.startsWith("OZK-DON") ? getSponsorshipByReferencePostgres(decoded) : Promise.resolve(null),
  ]);

  const resolvedDonation = donation ?? donationFallback;
  const resolvedSponsorship = sponsorship ?? sponsorshipFallback;

  if (!resolvedDonation && !resolvedSponsorship) notFound();

  if (resolvedSponsorship) {
    const [receipt, impactData] = await Promise.all([
      resolvedSponsorship.receiptId
        ? getSponsorshipReceiptPostgres(resolvedSponsorship.id)
        : Promise.resolve(null),
      getSponsorshipImpactDataPostgres(resolvedSponsorship),
    ]);

    const isPaid = ["completed", "paid"].includes(resolvedSponsorship.paymentStatus.toLowerCase());
    const displayName = resolvedSponsorship.anonymous
      ? "Anonymous Sponsor"
      : resolvedSponsorship.organizationName || resolvedSponsorship.donorName || "Sponsor";
    const targetLabel =
      resolvedSponsorship.sponsorshipType === "school"
        ? "School Sponsored"
        : resolvedSponsorship.sponsorshipType === "district"
          ? "District Sponsored"
          : resolvedSponsorship.sponsorshipType === "region"
            ? "Region Sponsored"
            : "Sponsored Area";

    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#006b61]/10 flex items-center justify-center mx-auto mb-4">
              <School className="w-8 h-8 text-[#006b61]" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Sponsorship Record</h1>
            <p className="text-gray-500 text-sm font-mono">{resolvedSponsorship.sponsorshipReference}</p>
          </div>

          {/* Status card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400 font-medium mb-0.5">Sponsor</p>
                <p className="text-lg font-bold text-gray-900">{displayName}</p>
              </div>
              <StatusBadge status={resolvedSponsorship.paymentStatus} />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{targetLabel}</p>
                <p className="font-semibold text-gray-800">{resolvedSponsorship.sponsorshipTargetName ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Amount</p>
                <p className="font-semibold text-gray-800">
                  {formatAmount(resolvedSponsorship.amount, resolvedSponsorship.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Focus</p>
                <p className="font-semibold text-gray-800">{resolvedSponsorship.sponsorshipFocus ?? "General Literacy"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Date</p>
                <p className="font-semibold text-gray-800">
                  {resolvedSponsorship.paidAt
                    ? new Date(resolvedSponsorship.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
                    : new Date(resolvedSponsorship.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          </div>

          {/* Impact Data */}
          {isPaid && impactData.schoolsCount > 0 && (
            <div className="bg-[#006b61] rounded-2xl p-6 mb-5 text-white">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <Heart className="w-4 h-4" /> Impact in Your Sponsored Area
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Schools", value: impactData.schoolsCount, icon: School },
                  { label: "Teachers", value: impactData.teachersCount, icon: Users },
                  { label: "Learners", value: impactData.learnersCount, icon: BookOpen },
                  { label: "Program Activities", value: impactData.trainingsCount + impactData.visitsCount, icon: Activity },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                    <Icon className="w-5 h-5 text-white/70 shrink-0" />
                    <div>
                      <p className="text-xl font-extrabold text-white">{value.toLocaleString()}</p>
                      <p className="text-xs text-white/70">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isPaid && impactData.schoolsCount === 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-5">
              <p className="text-sm text-amber-700 font-medium flex items-start gap-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                Program activity data for your sponsored area is being compiled and will appear here
                as our team completes on-the-ground delivery records.
              </p>
            </div>
          )}

          {/* Full outcome chain: schools → learners → score improvement */}
          {isPaid && (
            <div className="mb-5">
              <SponsorshipImpactChain sponsorshipReference={resolvedSponsorship.sponsorshipReference} />
            </div>
          )}

          {/* Receipt */}
          {receipt && receipt.receiptPdfUrl && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">Receipt {receipt.receiptNumber}</p>
                <p className="text-sm text-gray-400">
                  Issued {new Date(receipt.issuedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <a
                href={receipt.receiptPdfUrl}
                download
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#006b61] text-white text-sm font-semibold hover:bg-[#006b61]/90 transition-colors"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            </div>
          )}

          {/* Privacy note */}
          <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 mb-8">
            <Shield className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">
              This page is accessible only by direct URL. Your personal details are never shared publicly.
              Bookmark this page to return at any time.
            </p>
          </div>

          <div className="text-center">
            <Link href="/impact/overview" className="inline-flex items-center gap-1.5 text-sm text-[#006b61] font-semibold hover:underline">
              View overall program impact <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Donation view
  const d = resolvedDonation!;
  const receipt = d.receiptId ? await getDonationReceiptPostgres(d.id) : null;
  const isPaid = ["completed", "paid"].includes(d.paymentStatus.toLowerCase());
  const displayName = d.anonymous
    ? "Anonymous Donor"
    : d.organizationName || d.donorName || "Donor";

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#FA7D15]/10 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-[#FA7D15]" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Donation Record</h1>
          <p className="text-gray-500 text-sm font-mono">{d.donationReference}</p>
        </div>

        {/* Status card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-400 font-medium mb-0.5">Donor</p>
              <p className="text-lg font-bold text-gray-900">{displayName}</p>
            </div>
            <StatusBadge status={d.paymentStatus} />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Amount</p>
              <p className="font-semibold text-gray-800">{formatAmount(d.amount, d.currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Purpose</p>
              <p className="font-semibold text-gray-800">{d.donationPurpose ?? "General Support"}</p>
            </div>
            {d.supportedSchoolName && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Supported School</p>
                <p className="font-semibold text-gray-800">{d.supportedSchoolName}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Date</p>
              <p className="font-semibold text-gray-800">
                {d.paidAt
                  ? new Date(d.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
                  : new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>

        {/* Thank-you message for paid */}
        {isPaid && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-5">
            <p className="text-sm text-emerald-800 font-semibold flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Thank you. Your donation has been received and supports active literacy programs across Uganda.
            </p>
          </div>
        )}

        {!isPaid && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-5">
            <p className="text-sm text-amber-700 font-medium flex items-start gap-2">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              Your payment is being processed. This page will update once the transaction is confirmed.
            </p>
          </div>
        )}

        {/* Receipt download */}
        {receipt && receipt.receiptPdfUrl && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">Receipt {receipt.receiptNumber}</p>
              <p className="text-sm text-gray-400">
                Issued {new Date(receipt.issuedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
            <a
              href={receipt.receiptPdfUrl}
              download
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FA7D15] text-white text-sm font-semibold hover:bg-[#FA7D15]/90 transition-colors"
            >
              <Download className="w-4 h-4" /> Download
            </a>
          </div>
        )}

        {/* Privacy note */}
        <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 mb-8">
          <Shield className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500">
            This page is accessible only by direct URL. Your personal details are never shared publicly.
            Keep your reference number safe to return to this page at any time.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/donate"
            className="px-6 py-3 rounded-xl bg-[#FA7D15] text-white font-semibold text-sm hover:bg-[#FA7D15]/90 transition-colors text-center"
          >
            Give Again
          </Link>
          <Link
            href="/impact/overview"
            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors text-center inline-flex items-center justify-center gap-1.5"
          >
            See Program Impact <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
