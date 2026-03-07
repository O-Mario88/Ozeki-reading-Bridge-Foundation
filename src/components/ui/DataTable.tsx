import { ReactNode } from "react";

type DataTableProps = {
  children: ReactNode;
  className?: string;
};

export function DataTable({ children, className }: DataTableProps) {
  return <div className={["table-wrap", className].filter(Boolean).join(" ")}>{children}</div>;
}
