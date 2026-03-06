"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    MonitorPlay,
    LayoutDashboard,
    Users,
    BarChart,
    Calendar,
    MessageSquare,
    FolderOpen,
    Settings,
    HelpCircle,
    LogOut
} from "lucide-react";

const mainNavItems = [
    { href: "/training/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/training/classroom", label: "Classroom", icon: MonitorPlay },
    { href: "/training/community", label: "Community", icon: Users },
    { href: "/training/analytics", label: "Analytics", icon: BarChart },
    { href: "/training/schedule", label: "Schedule", icon: Calendar },
    { href: "/training/messages", label: "Messages", icon: MessageSquare },
    { href: "/training/resources", label: "Resources", icon: FolderOpen },
    { href: "/training/settings", label: "Settings", icon: Settings },
];

export function TrainingShellSidebar() {
    const pathname = usePathname();

    // Hardcoded active logic for the prototype (Classroom is active when inside a session)
    const isClassroomActive = pathname.includes("/training/") && pathname !== "/training";

    return (
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full shrink-0 shadow-[2px_0_8px_rgba(0,0,0,0.02)] hidden md:flex">
            {/* Brand */}
            <div className="h-16 flex items-center px-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                <Link href="/training" className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-[#00155F] flex items-center justify-center text-white font-bold text-sm">
                        OZ
                    </div>
                    <span className="font-bold text-gray-900 tracking-tight">Ozeki Training</span>
                </Link>
            </div>

            {/* Main Nav */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-3">Menu</div>

                {mainNavItems.map((item) => {
                    const isActive = item.href === "/training/classroom" ? isClassroomActive : pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group \${
                    isActive
                        ? "bg-blue-50/80 text-[#00155F]"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
            >
                <Icon
                    className={`w-5 h-5 mr-3 transition-colors \${
                    isActive ? "text-[#FA7D15]" : "text-gray-400 group-hover:text-gray-600"
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
                {item.label}
                {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FA7D15]" />
                )}
            </Link>
            );
        })}

            {/* Pinned area could go here */}
        </div>

      {/* Footer Nav */ }
    <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <Link
            href="/support"
            className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
        >
            <HelpCircle className="w-4 h-4 mr-3 text-gray-400" />
            Help & Support
        </Link>
        <button
            className="w-full flex items-center px-3 py-2 mt-1 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
            <LogOut className="w-4 h-4 mr-3 text-gray-400 group-hover:text-red-500" />
            Sign Out
        </button>
    </div>
    </aside >
  );
}
