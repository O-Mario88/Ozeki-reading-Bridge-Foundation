"use client";

import { PlayCircle, Clock } from "lucide-react";

export function UpNextPanel() {
    const upNext = [
        { title: "Phonics Core Routines - Part 2", time: "Tomorrow, 2:00 PM", duration: "90 min" },
        { title: "Assessment Data Clinic", time: "Next Week", duration: "60 min" },
    ];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-bold text-brand-primary text-sm uppercase tracking-wide">Up Next</h3>
                <button className="text-xs font-medium text-blue-600 hover:text-blue-800">View All</button>
            </div>

            <div className="divide-y divide-gray-50 flex-1 overflow-y-auto">
                {upNext.map((item, i) => (
                    <div key={i} className="p-4 hover:bg-gray-50 transition-colors group cursor-pointer flex gap-4">
                        <div className="w-20 h-14 bg-gray-200 rounded-lg overflow-hidden relative shrink-0">
                            {/* Thumbnail placeholder */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-900 to-transparent opacity-80" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <PlayCircle className="w-6 h-6 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-brand-primary line-clamp-2 leading-tight mb-1 group-hover:text-blue-600 transition-colors">{item.title}</h4>
                            <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                {item.time} ({item.duration})
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
