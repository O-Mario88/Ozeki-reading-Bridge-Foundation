"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "lg", label: "Oluganda" },
];

type Props = { currentLocale: string };

export function LanguageSwitcher({ currentLocale }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const change = async (code: string) => {
    setOpen(false);
    if (code === currentLocale) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: code }),
    });
    startTransition(() => router.refresh());
  };

  const current = LOCALES.find((l) => l.code === currentLocale) ?? LOCALES[0];
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 hover:text-[#066a67] hover:bg-gray-50"
      >
        <Globe className="w-3.5 h-3.5" />
        {current.label}
      </button>
      {open ? (
        <div className="absolute right-0 mt-1 w-36 rounded-lg bg-white border border-gray-100 shadow-lg z-50 py-1">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onMouseDown={() => change(l.code)}
              className={`w-full text-left px-3 py-1.5 text-xs ${l.code === currentLocale ? "font-bold text-[#066a67]" : "text-gray-700 hover:bg-gray-50"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
