import { Suspense } from "react";
import { AuditorClaimClient } from "./AuditorClaimClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit Portal Access · Ozeki Reading Bridge",
  description: "Claim a one-time auditor session to review the integrity of Ozeki Reading Bridge data.",
};

export default function AuditorClaimPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h1 className="text-xl font-bold text-gray-900">Audit Portal Access</h1>
        <p className="text-sm text-gray-600 mt-2">
          You were invited to review the integrity of Ozeki Reading Bridge data.
          Click below to claim a read-only session. Your access window is set by
          the issuer and cannot be extended without a new invite.
        </p>
        <Suspense fallback={null}>
          <AuditorClaimClient />
        </Suspense>
        <p className="text-xs text-gray-400 mt-6">
          This invite link is single-use. Once claimed, the link cannot be re-used
          even by you.
        </p>
      </div>
    </main>
  );
}
