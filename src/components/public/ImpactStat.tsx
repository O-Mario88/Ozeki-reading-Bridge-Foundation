import { ReactNode } from "react";

interface ImpactStatProps {
  value: string;
  label: string;
  className?: string;
}

export function ImpactStat({ value, label, className = "" }: ImpactStatProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-6 ${className}`.trim()}>
      <span className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-gray-900 to-gray-600 mb-2">
        {value}
      </span>
      <span className="text-sm font-semibold tracking-wide uppercase text-gray-500">
        {label}
      </span>
    </div>
  );
}
