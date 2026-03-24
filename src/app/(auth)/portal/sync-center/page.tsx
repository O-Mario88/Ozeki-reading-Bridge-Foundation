import { Metadata } from "next";
import { SyncCenterClient } from "./SyncCenterClient";

export const metadata: Metadata = {
  title: "Sync Center",
  description: "Monitor and resolve offline synchronization issues",
};

export default function SyncCenterPage() {
  return <SyncCenterClient />;
}
