import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { CreditCard, Search, ArrowRightLeft, ShieldBan, CheckCircle, Clock } from "lucide-react";

export const metadata = { title: "Finance Reconciliation | Ozeki Portal" };

export default async function FinanceLedgerDashboard() {
  const user = await requirePortalStaffUser();

  const ledgersQuery = await queryPostgres(
    `SELECT sp.id, sp.provider, sp.payment_method, sp.amount_requested, sp.amount_paid, sp.currency,
            sp.payment_type, sp.payment_status, sp.pesapal_merchant_reference, sp.pesapal_order_tracking_id,
            sp.verified, sp.payment_initiated_at, sp.payment_confirmed_at,
            s.name AS school_name, pr.receipt_number
     FROM service_payments sp
     LEFT JOIN schools_directory s ON s.id = sp.school_id
     LEFT JOIN payment_receipts pr ON pr.id = sp.receipt_id
     ORDER BY sp.created_at DESC LIMIT 100`
  );

  const ledgers = ledgersQuery.rows;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/finance"
      title="Global Fintech Ledger"
      description="Raw transactional matrix orchestrating real-time telemetries against the Pesapal banking infrastructure."
    >
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
         <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <h2 className="text-xl font-bold flex items-center gap-2">
               <CreditCard className="w-5 h-5 text-gray-400" />
               Transaction Matrix
            </h2>
            <div className="relative">
               <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
               <input placeholder="Search Reference Hash..." className="pl-9 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-[#FA7D15] outline-none" />
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
               <thead>
                  <tr className="bg-white text-xs uppercase tracking-wider text-gray-500 border-b-2">
                     <th className="p-5 font-bold">Transaction Cryptography & Source</th>
                     <th className="p-5 font-bold">Gateway Origin</th>
                     <th className="p-5 font-bold text-center">Intent Volume</th>
                     <th className="p-5 font-bold text-center">IPN Webhook Status</th>
                     <th className="p-5 font-bold text-right">Audit Record</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {ledgers.map((tx: any) => (
                     <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-5">
                           <div className="font-bold text-gray-900 border border-gray-200 px-2 py-1 rounded inline-block bg-white shadow-sm mb-2 text-xs font-mono select-all">
                              {tx.pesapal_merchant_reference}
                           </div>
                           <div className="text-sm font-bold mt-1 text-[#006b61]">{tx.school_name || 'Unknown School Entity'}</div>
                           <div className="text-[10px] text-gray-400 mt-0.5">TK: {tx.pesapal_order_tracking_id || 'AWAITING HASH'}</div>
                        </td>
                        <td className="p-5">
                           <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                              <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                              {tx.provider}
                           </div>
                           <div className="text-xs text-gray-500 mt-1">{tx.payment_method || 'Awaiting Method Confirmation'}</div>
                        </td>
                        <td className="p-5 text-center">
                           <div className="text-lg font-black text-gray-900 leading-tight">
                              {tx.currency} {Number(tx.amount_requested).toLocaleString()}
                           </div>
                           <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest mt-1 inline-block">
                              {tx.payment_type}
                           </span>
                        </td>
                        <td className="p-5 text-center">
                           <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap
                              ${tx.verified ? 'bg-green-50 border-green-200 text-green-700' : 
                                tx.payment_status === 'Pending Customer Action' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                'bg-red-50 border-red-200 text-red-700'}
                           `}>
                              {tx.verified && <CheckCircle className="w-3 h-3 mr-1.5 inline" />}
                              {!tx.verified && tx.payment_status === 'Pending Customer Action' && <Clock className="w-3 h-3 mr-1.5 inline animate-pulse" />}
                              {!tx.verified && tx.payment_status !== 'Pending Customer Action' && <ShieldBan className="w-3 h-3 mr-1.5 inline" />}
                              {tx.payment_status}
                           </div>
                        </td>
                        <td className="p-5 text-right whitespace-nowrap">
                           {tx.receipt_number ? (
                              <span className="text-xs font-bold text-[#FA7D15] bg-[#FA7D15]/10 px-3 py-1.5 rounded-lg border border-[#FA7D15]/20 font-mono">
                                 {tx.receipt_number}
                              </span>
                           ) : (
                              <span className="text-xs text-gray-400 italic">No Cryptographic Receipt</span>
                           )}
                           <div className="text-[10px] text-gray-400 mt-2">
                              Initiated: {tx.payment_initiated_at ? new Date(tx.payment_initiated_at).toLocaleTimeString() : new Date().toLocaleTimeString()}
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            {ledgers.length === 0 && (
               <div className="p-16 flex flex-col items-center justify-center text-gray-400">
                  <CreditCard className="w-12 h-12 mb-4 opacity-20" />
                  <p>The Ledger is perfectly quiet.</p>
               </div>
            )}
         </div>
      </div>
    </PortalShell>
  );
}
