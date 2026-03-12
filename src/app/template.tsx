"use client";

import type { ReactNode } from "react";
import { MotionRouteShell } from "@/components/ui/MotionRouteShell";

type RootTemplateProps = {
  children: ReactNode;
};

export default function RootTemplate({ children }: RootTemplateProps) {
  return <MotionRouteShell>{children}</MotionRouteShell>;
}
