import { ReactNode } from "react";
import "@/app/portal-dashboard.css";
import { PortalUser } from "@/lib/types";
import { OzekiPortalShell } from "./OzekiPortalShell";

interface PortalShellProps {
  user: PortalUser;
  activeHref: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  shellClassName?: string;
  /** When true, the page handles its own header — shell renders only nav chrome. */
  hideFrame?: boolean;
  children: ReactNode;
}

/**
 * Legacy PortalShell — preserved for the ~77 portal pages that consume it.
 * Internals delegate to `OzekiPortalShell` (green sidebar + white workspace
 * matching the dashboard reference screenshot). Finance pages use
 * `FinanceShell` which still wraps `GlassDashboardShell`, so finance keeps
 * the glass theme while everything else uses the Ozeki green theme.
 *
 * The wrapper carries the `ozeki-portal-shell` class so legacy `.button` /
 * `.button-ghost` / `.action-row` markup picks up green-theme rules in
 * globals.css.
 */
export function PortalShell({
  user,
  activeHref,
  title,
  description,
  actions,
  shellClassName,
  hideFrame = false,
  children,
}: PortalShellProps) {
  return (
    <OzekiPortalShell
      user={user}
      activeHref={activeHref}
      title={title}
      description={description}
      actions={actions}
      hideFrame={hideFrame}
    >
      <div className={`ozeki-portal-shell ${shellClassName ?? ""}`.trim()}>
        {children}
      </div>
    </OzekiPortalShell>
  );
}
