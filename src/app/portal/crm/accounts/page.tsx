import { fetchCrmAccounts } from "@/app/actions/crm-actions";
import Link from "next/link";

export default async function CrmAccountsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ type?: string; status?: string }> 
}) {
  const filters = await searchParams;
  const accounts = await fetchCrmAccounts(filters);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CRM Account Registry</h1>
          <p className="text-gray-500 mt-1">Manage unified school, donor, and partner profiles.</p>
        </div>
        <div className="flex gap-4">
          <Link 
            href="/portal/crm/accounts/new" 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            + Register Account
          </Link>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="flex gap-4 mb-6 p-4 bg-white border rounded-xl shadow-sm">
        <select className="bg-transparent font-medium text-gray-700 focus:outline-none">
          <option value="">All Types</option>
          <option value="School">Schools</option>
          <option value="Donor">Donors</option>
          <option value="Partner">Partners</option>
          <option value="Government">Government</option>
        </select>
        <div className="w-px h-6 bg-gray-200"></div>
        <select className="bg-transparent font-medium text-gray-700 focus:outline-none">
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Prospect">Prospect</option>
        </select>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Account Name</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Type</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Source</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Status</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Last Engagement</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No accounts found matching your criteria.
                </td>
              </tr>
            ) : (
              accounts.map((account: any) => (
                <tr key={account.id} className="hover:bg-gray-50 transition group">
                  <td className="px-6 py-4">
                    <Link href={`/portal/crm/accounts/${account.id}`} className="font-semibold text-blue-600 hover:underline">
                      {account.account_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium uppercase">
                      {account.account_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {account.source_table ? (
                      <span className="italic">{account.source_table} #{account.source_id}</span>
                    ) : (
                      "Manual Entry"
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                      account.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {account.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {account.last_engagement_date ? new Date(account.last_engagement_date).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/portal/crm/accounts/${account.id}`}
                      className="text-gray-400 group-hover:text-blue-600"
                    >
                      View 360 →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
