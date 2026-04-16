import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { Map, Download, Search, CheckCircle, Globe2 } from "lucide-react";

export const metadata = { title: "Geospatial Sponsorships | Ozeki Portal" };

export default async function SponsorshipDashboard() {
  const user = await requirePortalStaffUser();

  const sponsorshipsQuery = await queryPostgres(
    \`SELECT s.id, s.sponsorship_reference, s.donor_name, s.donor_type, s.sponsorship_type, s.sponsorship_target_name, 
            s.amount, s.currency, s.sponsorship_focus, s.payment_method, s.payment_status, s.paid_at, pr.receipt_number
     FROM sponsorships s
     LEFT JOIN sponsorship_receipts pr ON pr.id = s.receipt_id
     ORDER BY s.created_at DESC\`
  );

  const sponsorships = sponsorshipsQuery.rows;

  const totalGeospatial = sponsorships
      .filter((d: any) => d.payment_status === 'Completed')
      .reduce((sum: number, d: any) => sum + Number(d.amount), 0);

  const schoolCount = sponsorships.filter((d: any) => d.payment_status === 'Completed' && d.sponsorship_type === 'school').length;
  const regionCount = sponsorships.filter((d: any) => d.payment_status === 'Completed' && d.sponsorship_type === 'region').length;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/sponsorships"
      title="Geospatial Sponsors Interface"
      description="Monitor and coordinate sweeping institutional and geographic philanthropic deployments across Uganda."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-[#006b61] p-6 rounded-2xl shadow-lg border border-[#006b61] text-white">
            <div className="font-bold text-sm mb-2 opacity-80 uppercase tracking-widest flex items-center justify-between">
               Total Macro Capital Secured
               <Globe2 className="w-5 h-5 opacity-50" />
            </div>
            <div className="text-4xl font-black font-mono">
               UGX {totalGeospatial.toLocaleString()}
            </div>
         </div>
         
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
            <div className="text-gray-500 font-bold text-sm mb-2 uppercase tracking-wide">Direct School Sponsors</div>
            <div className="flex items-center gap-3">
               <div className="text-3xl font-black text-gray-900">{schoolCount} Deployments</div>
               {schoolCount > 0 && <CheckCircle className="w-6 h-6 text-green-500" />}
            </div>
         </div>

         <div className="bg-purple-50/50 p-6 rounded-2xl shadow-sm border border-purple-100 flex flex-col justify-center">
            <div className="text-purple-600 font-bold text-sm mb-2 uppercase tracking-wide">Regional Scale Operations</div>
            <div className="flex items-center gap-3">
               <div className="text-3xl font-black text-purple-900">{regionCount} Active</div>
               <Map className="w-6 h-6 text-purple-400" />
            </div>
         </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
            <h2 className="text-lg font-bold flex items-center gap-2"><Map className="w-5 h-5 text-gray-400"/> Sponsor Ledger</h2>
            <div className="flex gap-3">
               <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input placeholder="Search Targets..." className="pl-9 pr-4 py-2 border rounded-xl text-sm outline-none w-64 bg-white" />
               </div>
               <button className="flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">
                  <Download className="w-4 h-4" /> Export CSV
               </button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
               <thead>
                  <tr className="bg-white text-xs uppercase tracking-wider text-gray-400 border-b-2">
                     <th className="p-5 font-bold">Funding Entity</th>
                     <th className="p-5 font-bold">Geographic Target</th>
                     <th className="p-5 font-bold text-center">Intervention Volume</th>
                     <th className="p-5 font-bold text-center">Network Verification</th>
                     <th className="p-5 font-bold text-right">Receipt Protocol</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {sponsorships.map((s: any) => (
                     <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-5">
                           <div className="font-bold text-gray-900 flex items-center gap-2">
                              {s.donor_name || 'Anonymous Sponsor'}
                           </div>
                           <div className="text-[10px] uppercase text-gray-500 font-bold mt-1">
                              {s.donor_type}
                           </div>
                           <div className="text-[10px] text-gray-400 mt-1 font-mono">Ref: {s.sponsorship_reference}</div>
                        </td>
                        <td className="p-5">
                           <div className="text-sm font-bold text-[#006b61]">
                              <span className="uppercase text-[10px] font-black text-gray-400 mr-2 border rounded p-0.5">
                                 {s.sponsorship_type}
                              </span>
                              {s.sponsorship_target_name}
                           </div>
                           <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{s.sponsorship_focus}</div>
                        </td>
                        <td className="p-5 text-center">
                           <div className="text-lg font-black text-gray-900">
                              {s.currency} {Number(s.amount).toLocaleString()}
                           </div>
                           <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">{s.payment_method || 'AWAITING PING'}</div>
                        </td>
                        <td className="p-5 text-center">
                           <span className={\`text-xs font-bold px-3 py-1.5 rounded-xl border inline-block
                              \${s.payment_status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                                'bg-orange-50 text-orange-700 border-orange-200'}
                           \`}>
                              {s.payment_status}
                           </span>
                           {s.paid_at && (
                              <div className="text-[10px] text-gray-400 mt-2">
                                 {new Date(s.paid_at).toLocaleDateString()}
                              </div>
                           )}
                        </td>
                        <td className="p-5 text-right">
                           {s.receipt_number ? (
                              <span className="text-xs font-bold text-[#FA7D15] bg-[#FA7D15]/10 border border-[#FA7D15]/20 px-3 py-1.5 rounded-lg font-mono">
                                 {s.receipt_number}
                              </span>
                           ) : (
                              <span className="text-xs text-gray-300 italic">No receipt generated.</span>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            {sponsorships.length === 0 && (
               <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center">
                  <Map className="w-12 h-12 mb-4 opacity-20" />
                  Your geographic map is currently empty. Promote the `/sponsor` gateway!
               </div>
            )}
         </div>
      </div>
    </PortalShell>
  );
}
