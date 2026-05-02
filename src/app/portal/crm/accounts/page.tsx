import { fetchCrmAccounts } from "@/app/actions/crm-actions";
import Link from "next/link";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";

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
          <h1 className="text-3xl font-bold text-brand-primary">CRM Account Registry</h1>
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

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden p-4">
        <DashboardListHeader template="minmax(0,1.6fr) 110px minmax(0,1fr) 100px 140px 110px">
          <span>Account Name</span>
          <span>Type</span>
          <span>Source</span>
          <span>Status</span>
          <span>Last Engagement</span>
          <span />
        </DashboardListHeader>
        {accounts.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No accounts found matching your criteria.
          </div>
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          accounts.map((account: any) => (
            <DashboardListRow
              key={account.id}
              template="minmax(0,1.6fr) 110px minmax(0,1fr) 100px 140px 110px"
            >
              <span className="min-w-0">
                <Link href={`/portal/crm/accounts/${account.id}`} className="font-semibold text-blue-600 hover:underline truncate inline-block max-w-full">
                  {account.account_name}
                </Link>
              </span>
              <span className="text-sm">
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium uppercase">
                  {account.account_type}
                </span>
              </span>
              <span className="text-sm text-gray-500 truncate">
                {account.source_table ? (
                  <span className="italic">{account.source_table} #{account.source_id}</span>
                ) : (
                  "Manual Entry"
                )}
              </span>
              <span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                  account.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {account.status}
                </span>
              </span>
              <span className="text-sm text-gray-500">
                {account.last_engagement_date ? new Date(account.last_engagement_date).toLocaleDateString() : 'Never'}
              </span>
              <span className="text-right">
                <Link
                  href={`/portal/crm/accounts/${account.id}`}
                  className="text-gray-400 hover:text-blue-600"
                >
                  View 360 →
                </Link>
              </span>
            </DashboardListRow>
          ))
        )}
      </div>
    </div>
  );
}
