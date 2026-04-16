import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import { queryPostgres } from "@/lib/server/postgres/client";
import { Building, MapPin, CheckCircle, Clock, AlertTriangle } from "lucide-react";

export const metadata = { title: "Service Booking Demands | Ozeki Portal" };

export default async function ServiceRequestsDashboard() {
  const user = await requirePortalStaffUser();

  const requestsQuery = await queryPostgres(
    \`SELECT sr.id, sr.request_code, sr.status, sr.estimated_total, sr.amount_paid, sr.balance, sr.created_at,
            s.name AS school_name, s.district
     FROM service_requests sr
     JOIN schools_directory s ON s.id = sr.school_id
     ORDER BY sr.created_at DESC\`
  );

  const requests = requestsQuery.rows;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/services/requests"
      title="Service Deployments"
      description="Command center for reviewing incoming school booking cart transactions and deploying Ozeki staff logistics."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-gray-500 font-bold text-sm mb-2">Total Bookings</div>
            <div className="text-3xl font-black text-gray-900">{requests.length}</div>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-blue-500 font-bold text-sm mb-2">Awaiting Deposit</div>
            <div className="text-3xl font-black text-blue-900">{requests.filter((r: any) => r.status === 'Awaiting Deposit').length}</div>
         </div>
         <div className="bg-[#006b61]/10 p-6 rounded-2xl shadow-sm border border-[#006b61]/20">
            <div className="text-[#006b61] font-bold text-sm mb-2">Secured / Follow-Up Needed</div>
            <div className="flex items-center gap-2">
               <div className="text-3xl font-black text-[#006b61]">
                  {requests.filter((r: any) => ['Deposit Paid', 'Fully Paid'].includes(r.status)).length}
               </div>
               <AlertTriangle className="w-5 h-5 text-yellow-600 animate-pulse" />
            </div>
         </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
         <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-lg font-bold">Booking Logistics Queue</h2>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
               <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                     <th className="p-4 font-bold border-b">Booking Entity</th>
                     <th className="p-4 font-bold border-b">Request Hash</th>
                     <th className="p-4 font-bold border-b">Financial State</th>
                     <th className="p-4 font-bold border-b text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {requests.map((req: any) => (
                     <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                           <div className="font-bold text-gray-900 flex items-center gap-2">
                              <Building className="w-4 h-4 text-gray-400" />
                              {req.school_name}
                           </div>
                           <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" /> {req.district} District
                           </div>
                        </td>
                        <td className="p-4">
                           <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200">
                              {req.request_code}
                           </span>
                           <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {new Date(req.created_at).toLocaleDateString()}
                           </div>
                        </td>
                        <td className="p-4">
                           <span className={\`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap
                              \${req.status === 'Fully Paid' ? 'bg-green-100 text-green-800 border border-green-200' :
                                req.status === 'Deposit Paid' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                'bg-gray-100 text-gray-800 border border-gray-200'}
                           \`}>
                              {req.status === 'Fully Paid' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                              {req.status}
                           </span>
                           {req.status !== 'Awaiting Deposit' && (
                              <div className="text-xs font-bold text-gray-900 mt-2">
                                 Paid: <span className="text-[#006b61]">UGX {Number(req.amount_paid).toLocaleString()}</span>
                              </div>
                           )}
                           <div className="text-[10px] text-gray-500 mt-0.5">
                              Balance: UGX {Number(req.balance).toLocaleString()}
                           </div>
                        </td>
                        <td className="p-4 text-right">
                           <button className="bg-gray-900 text-white font-bold py-2 px-4 rounded-lg text-sm hover:opacity-90">
                              Schedule Deployment
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            {requests.length === 0 && (
               <div className="p-12 text-center text-gray-500">
                  No service booking demands generated yet.
               </div>
            )}
         </div>
      </div>
    </PortalShell>
  );
}
