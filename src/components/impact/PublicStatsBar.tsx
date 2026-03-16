import { LucideUsers, LucideSchool, LucideBookOpen, LucideTrendingUp } from "lucide-react";

export interface PublicStatsProps {
  totalSchools: number;
  totalLearners: number;
  avgReadingScore: number;
  avgCompScore: number;
}

export function PublicStatsBar({ stats }: { stats: PublicStatsProps }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 bg-white border rounded-2xl shadow-sm -mt-16 relative z-10 container mx-auto">
      <div className="flex flex-col items-center text-center">
        <div className="p-3 bg-blue-50 rounded-xl text-blue-600 mb-3">
          <LucideSchool className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-gray-500">Schools</p>
        <h2 className="text-2xl font-bold">{stats.totalSchools.toLocaleString()}</h2>
      </div>

      <div className="flex flex-col items-center text-center border-l border-gray-100">
        <div className="p-3 bg-green-50 rounded-xl text-green-600 mb-3">
          <LucideUsers className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-gray-500">Learners Impacted</p>
        <h2 className="text-2xl font-bold">{stats.totalLearners.toLocaleString()}</h2>
      </div>

      <div className="flex flex-col items-center text-center border-l border-gray-100">
        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 mb-3">
          <LucideBookOpen className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-gray-500">Avg. Reading Score</p>
        <h2 className="text-2xl font-bold">{stats.avgReadingScore.toFixed(1)} / 6.0</h2>
      </div>

      <div className="flex flex-col items-center text-center border-l border-gray-100">
        <div className="p-3 bg-purple-50 rounded-xl text-purple-600 mb-3">
          <LucideTrendingUp className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-gray-500">Comprehension Avg.</p>
        <h2 className="text-2xl font-bold">{stats.avgCompScore.toFixed(1)} / 6.0</h2>
      </div>
    </div>
  );
}
