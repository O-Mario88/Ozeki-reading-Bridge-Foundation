"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { NewContactModal } from "./NewContactModal";

type Props = {
  schoolId: number;
  schoolName: string;
};

/**
 * Header trigger that opens the existing NewContactModal for this school.
 * On successful create, refreshes the page so the new contact appears in
 * the school's contact grid + list.
 */
export function AddContactButton({ schoolId, schoolName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 whitespace-nowrap"
      >
        <UserPlus className="h-4 w-4" strokeWidth={1.75} />
        <span className="hidden sm:inline">Add New Contact</span>
        <span className="sm:hidden">Contact</span>
      </button>
      {open ? (
        <NewContactModal
          schoolId={schoolId}
          schoolName={schoolName}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
