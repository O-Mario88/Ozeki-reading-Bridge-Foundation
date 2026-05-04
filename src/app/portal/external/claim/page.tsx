import { Suspense } from "react";
import { ExternalClaimClient } from "./ExternalClaimClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Signing you in… · Ozeki Reading Bridge" };

export default function ExternalClaimPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8">
        <h1 className="text-xl font-bold text-gray-900">Signing you in…</h1>
        <p className="text-sm text-gray-600 mt-1">
          Verifying your sign-in link. You'll be redirected to your portal in a moment.
        </p>
        <Suspense fallback={null}>
          <ExternalClaimClient />
        </Suspense>
      </div>
    </main>
  );
}
