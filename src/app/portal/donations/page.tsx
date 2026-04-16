import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { HeartHandshake, Download, Search, CheckCircle, AlertTriangle } from "lucide-react";

export const metadata = { title: "Philanthropy & Donations | Ozeki Portal" };

export default async function DonationsDashboard() {
  const user = await requirePortalStaffUser();

  const donationsQuery = await queryPostgres(
    \`SELECT d.id, d.donation_reference, d.donor_name, d.donor_type, d.amount, d.currency, d.donation_purpose, 
            d.payment_method, d.payment_status, d.paid_at, pr.receipt_number
     FROM donations d
     LEFT JOIN donation_receipts pr ON pr.id = d.receipt_id
     ORDER BY d.created_at DESC\`
  );

  const donations = donationsQuery.rows;

  const totalRaised = donations
      .filter((d: any) => d.payment_status === 'Completed')
      .reduce((sum: number, d: any) => sum + Number(d.amount), 0);

  const successCount = donations.filter((d: any) => d.payment_status === 'Completed').length;
  const pendingCount = donations.filter((d: any) => d.payment_status !== 'Completed').length;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/donations"
      title="Philanthropy Command Center"
      description="Isolated organizational ledger tracking global philanthropic contributions and isolated receipts."
    >
      {/* Philanthropic Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-[#006b61] p-6 rounded-2xl shadow-lg border border-[#006b61] text-white">
            <div className="font-bold text-sm mb-2 opacity-80 uppercase tracking-widest flex items-center justify-between">
               Total Capital Raised
               <HeartHandshake className="w-5 h-5 opacity-50" />
            </div>
            <div className="text-4xl font-black font-mono">
               UGX {totalRaised.toLocaleString()}
            </div>
         </div>
         
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
            <div className="text-gray-500 font-bold text-sm mb-2 uppercase tracking-wide">Successfully Completed</div>
            <div className="flex items-center gap-3">
               <div className="text-3xl font-black text-gray-900">{successCount} Transactions</div>
               {successCount > 0 && <CheckCircle className="w-6 h-6 text-green-500" />}
            </div>
         </div>

         <div className="bg-orange-50/50 p-6 rounded-2xl shadow-sm border border-orange-100 flex flex-col justify-center">
            <div className="text-orange-600 font-bold text-sm mb-2 uppercase tracking-wide">Pending Gateway Clearances</div>
            <div className="flex items-center gap-3">
               <div className="text-3xl font-black text-orange-900">{pendingCount} Waiting</div>
               {pendingCount > 0 && <AlertTriangle className="w-6 h-6 text-orange-400 animate-pulse" />}
            </div>
         </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
            <h2 className="text-lg font-bold">Philanthropic Ledger</h2>
            <div className="flex gap-3">
               <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input placeholder="Search Donors..." className="pl-9 pr-4 py-2 border rounded-xl text-sm outline-none w-64 bg-white" />
               </div>
               <button className="flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">
                  <Download className="w-4 h-4" /> Export CSV
               </button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
               <thead>
                  <tr className="bg-white text-xs uppercase tracking-wider text-gray-400 border-b-2">
                     <th className="p-5 font-bold">Donor Entity</th>
                     <th className="p-5 font-bold">Intent Target</th>
                     <th className="p-5 font-bold text-center">Volume</th>
                     <th className="p-5 font-bold text-center">Gateway Status</th>
                     <th className="p-5 font-bold text-right">Cryptographic Receipt</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {donations.map((d: any) => (
                     <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-5">
                           <div className="font-bold text-gray-900 flex items-center gap-2">
                              {d.donor_name || 'Anonymous Sponsor'}
                           </div>
                           <div className="text-xs text-[#006b61] font-bold mt-1 bg-[#006b61]/10 px-2 py-0.5 rounded-full inline-block">
                              {d.donor_type}
                           </div>
                           <div className="text-[10px] text-gray-400 mt-1 font-mono">Ref: {d.donation_reference}</div>
                        </td>
                        <td className="p-5">
                           <div className="text-sm font-bold text-gray-700">{d.donation_purpose}</div>
                           <div className="text-xs text-gray-400 mt-1">{d.payment_method || 'Awaiting Selection'}</div>
                        </td>
                        <td className="p-5 text-center">
                           <div className="text-lg font-black text-gray-900">
                              {d.currency} {Number(d.amount).toLocaleString()}
                           </div>
                        </td>
                        <td className="p-5 text-center">
                           <span className={\`text-xs font-bold px-3 py-1.5 rounded-xl border inline-block
                              \${d.payment_status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                                'bg-orange-50 text-orange-700 border-orange-200'}
                           \`}>
                              {d.payment_status}
                           </span>
                           {d.paid_at && (
                              <div className="text-[10px] text-gray-400 mt-2">
                                 {new Date(d.paid_at).toLocaleDateString()}
                              </div>
                           )}
                        </td>
                        <td className="p-5 text-right">
                           {d.receipt_number ? (
                              <span className="text-xs font-bold text-[#FA7D15] bg-[#FA7D15]/10 border border-[#FA7D15]/20 px-3 py-1.5 rounded-lg font-mono">
                                 {d.receipt_number}
                              </span>
                           ) : (
                              <span className="text-xs text-gray-300 italic">No receipt generated.</span>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            {donations.length === 0 && (
               <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center">
                  <HeartHandshake className="w-12 h-12 mb-4 opacity-20" />
                  The philanthropic ledger is perfectly quiet. Share your `/donate` link!
               </div>
            )}
         </div>
      </div>
    </PortalShell>
  );
}
