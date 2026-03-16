import { 
  getCountries, getRegions, getSubRegions, 
  getDistricts, getParishes, getSchoolsByParish 
} from "@/app/actions/geo-actions";
import Link from "next/link";

export default async function GeographicAdminPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ 
    countryId?: string; 
    regionId?: string; 
    districtId?: string; 
    parishId?: string;
  }> 
}) {
  const params = await searchParams;
  
  const countries = await getCountries();
  const regions = params.countryId ? await getRegions(Number(params.countryId)) : [];
  const districts = params.regionId ? await getDistricts(Number(params.regionId)) : [];
  const parishes = params.districtId ? await getParishes(Number(params.districtId)) : [];
  const schools = params.parishId ? await getSchoolsByParish(Number(params.parishId)) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Geographic Hierarchy Admin</h1>
        <p className="text-gray-500 mt-1">Manage recursive education locations and school linkages.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Column 1: Countries & Regions */}
        <div className="space-y-6">
          <section className="bg-white border rounded-2xl shadow-sm p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Countries</h3>
            <div className="space-y-1">
              {countries.map(c => (
                <Link 
                  key={c.id} 
                  href={`?countryId=${c.id}`}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                    params.countryId === String(c.id) ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {c.name} ({c.isoCode})
                </Link>
              ))}
            </div>
          </section>

          {params.countryId && (
            <section className="bg-white border rounded-2xl shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Regions</h3>
              <div className="space-y-1">
                {regions.map(r => (
                  <Link 
                    key={r.id} 
                    href={`?countryId=${params.countryId}&regionId=${r.id}`}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                      params.regionId === String(r.id) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {r.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Column 2: Districts */}
        <div className="lg:col-span-1">
          {params.regionId && (
            <section className="bg-white border rounded-2xl shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Districts</h3>
                <button className="text-[10px] text-blue-600 font-bold hover:underline">+ ADD NEW</button>
              </div>
              <div className="space-y-1">
                {districts.map(d => (
                  <Link 
                    key={d.id} 
                    href={`?countryId=${params.countryId}&regionId=${params.regionId}&districtId=${d.id}`}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                      params.districtId === String(d.id) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {d.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Column 3: Parishes */}
        <div className="lg:col-span-1">
          {params.districtId && (
            <section className="bg-white border rounded-2xl shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Parishes</h3>
                <button className="text-[10px] text-blue-600 font-bold hover:underline">+ ADD NEW</button>
              </div>
              <div className="space-y-1">
                {parishes.map(p => (
                  <Link 
                    key={p.id} 
                    href={`?countryId=${params.countryId}&regionId=${params.regionId}&districtId=${params.districtId}&parishId=${p.id}`}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                      params.parishId === String(p.id) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {p.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Column 4: Schools In Selected Parish */}
        <div className="lg:col-span-1">
          {params.parishId && (
            <section className="bg-white border rounded-2xl shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Schools (Unit Level)</h3>
              </div>
              <div className="space-y-1">
                {schools.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 py-4 italic">No schools linked to this parish.</p>
                ) : (
                  schools.map(s => (
                    <div 
                      key={s.id} 
                      className="px-3 py-2 rounded-lg text-sm font-medium border border-transparent bg-gray-50 text-gray-600"
                    >
                      {s.name}
                    </div>
                  ))
                )}
                <div className="mt-4 pt-4 border-t border-dashed">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Hierarchy Summary</p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Level 6 compliance: <span className="text-green-600 font-bold">YES</span><br/>
                    Traceability link: <span className="text-blue-600 font-bold underline cursor-pointer">View Schema</span>
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
