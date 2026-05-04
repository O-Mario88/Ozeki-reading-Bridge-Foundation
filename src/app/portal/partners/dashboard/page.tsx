import { requireExternalUser } from "@/lib/external-auth";
import { ExternalShell } from "@/components/external/ExternalShell";

export const dynamic = "force-dynamic";

export default async function PartnerDashboardPage() {
  const user = await requireExternalUser("partner");
  return (
    <ExternalShell user={user} roleLabel="Partner" title="Partner portal">
      <p className="text-sm text-gray-700">
        Welcome to your partner portal. Use it to coordinate joint programmes and to embed live
        impact widgets on your own website.
      </p>
      <div className="mt-6 rounded-2xl bg-white border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">Embed live impact widget</h3>
        <p className="text-xs text-gray-600 mb-3">
          Drop this snippet on any page to show our live shared-impact metrics on your site.
        </p>
        <pre className="text-[11px] bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto">
{`<iframe src="${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/embed/partner/${user.refCode}/impact"
  width="100%" height="320" frameborder="0" loading="lazy"
  title="Ozeki Reading Bridge Impact"></iframe>`}
        </pre>
      </div>
    </ExternalShell>
  );
}
