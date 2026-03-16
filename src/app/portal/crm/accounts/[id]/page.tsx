import { fetchAccountDetail } from "@/app/actions/crm-actions";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function Account360Page({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const account = await fetchAccountDetail(id);

  if (!account) notFound();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumbs & Header */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/portal/crm/accounts" className="hover:text-blue-600 transition">CRM Registry</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{account.account_name}</span>
      </div>

      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-gray-900">{account.account_name}</h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
              {account.account_type}
            </span>
          </div>
          <p className="text-gray-500 mt-2 flex items-center gap-4">
            <span>District: <b className="text-gray-700">{account.district || 'NA'}</b></span>
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
            <span>Code: <b className="text-gray-700">{account.school_code || 'NA'}</b></span>
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition">
            Edit Profile
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-md transition">
            + Log Interaction
          </button>
        </div>
      </div>

      {/* 360 Stats Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 border rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Impact</p>
          <h3 className="text-2xl font-bold text-gray-900">{account.enrolled_learners || 0} Learners</h3>
        </div>
        <div className="bg-white p-6 border rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Engagement</p>
          <h3 className="text-2xl font-bold text-gray-900">{account.total_interactions || 0} Touches</h3>
        </div>
        <div className="bg-white p-6 border rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Active Staff</p>
          <h3 className="text-2xl font-bold text-gray-900">{account.total_contacts || 0} People</h3>
        </div>
        <div className="bg-white p-6 border rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Program Status</p>
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2 capitalize">
            {account.program_status}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Timeline */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 tracking-tight">Interaction Timeline</h3>
            </div>
            <div className="p-6">
              {account.interactions?.length === 0 ? (
                <div className="py-12 text-center text-gray-400">No interaction history yet.</div>
              ) : (
                <div className="relative pl-6 border-l-2 border-gray-100 space-y-8">
                  {account.interactions.map((event: any) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-blue-500 ring-4 ring-white"></div>
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-gray-900">{event.subject}</h4>
                          <span className="text-xs font-medium text-gray-400">
                            {new Date(event.activity_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{event.notes}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                            {event.interaction_type}
                          </span>
                          {event.source_table && (
                            <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-500 px-2 py-0.5 rounded">
                              Linked: {event.source_table}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Key Contacts & Details */}
        <div className="space-y-8">
          <div className="bg-white border rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex justify-between items-center">
              Key Contacts
              <button className="text-xs text-blue-600 hover:underline">+ Add</button>
            </h3>
            <div className="space-y-4">
              {account.contacts?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No associated contacts.</p>
              ) : (
                account.contacts.map((contact: any) => (
                  <div key={contact.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      {contact.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{contact.full_name}</p>
                      <p className="text-xs text-gray-500">{contact.role_title} • {contact.contact_type}</p>
                    </div>
                    {contact.is_primary_contact && (
                      <div className="ml-auto text-yellow-500">★</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="font-bold text-lg mb-2">School Status View</h3>
            <p className="text-blue-100 text-sm mb-4">Jump to the detailed operational delivery dashboard for this school.</p>
            <Link 
              href={`/portal/schools/${account.school_code}`}
              className="block w-full text-center py-2 bg-white text-blue-600 rounded-xl font-bold shadow-sm hover:bg-blue-50 transition"
            >
              Open Domain View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
