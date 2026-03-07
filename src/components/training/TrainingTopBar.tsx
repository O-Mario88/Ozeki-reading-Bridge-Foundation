"use client";

import Link from "next/link";
import {
    Search,
    Calendar as CalendarIcon,
    Bell,
    ChevronRight,
    Plus
} from "lucide-react";

interface TrainingTopBarProps {
    sessionTitle?: string;
    isStaff?: boolean;
}

export function TrainingTopBar({ sessionTitle, isStaff = false }: TrainingTopBarProps) {
    return (
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-20 sticky top-0">

            {/* Breadcrumbs / Title */}
            <div className="flex items-center text-sm font-medium overflow-hidden whitespace-nowrap">
                <Link href="/training/classroom" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Classroom
                </Link>
                <ChevronRight className="w-4 h-4 text-gray-300 mx-2 shrink-0" />
                <span className="text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
                    My Trainings
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 mx-2 shrink-0" />
                <span className="text-gray-900 font-bold truncate max-w-[200px] sm:max-w-xs" title={sessionTitle || "Current Session"}>
                    {sessionTitle || "Current Session"}
                </span>
            </div>

            {/* Center Search (Hidden on small screens) */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
                <div className="relative w-full group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#00155F] transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-full leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00155F]/20 focus:border-[#00155F] transition-all sm:text-sm"
                        placeholder="Search sessions, resources, notes..."
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-3 sm:space-x-4">
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative">
                    <CalendarIcon className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                </button>

                {isStaff && (
                    <button className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-[#00155F] hover:bg-[#00155F]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00155F] transition-colors">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Upload Resource
                    </button>
                )}

                <div className="pl-2 border-l border-gray-200 flex items-center">
                    <button className="flex items-center focus:outline-none ml-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#00155F] to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white shadow-sm overflow-hidden">
                            <span className="drop-shadow-sm">AB</span>
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
}
