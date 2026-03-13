export interface CrmDetailItem {
  label: string;
  value: string;
  href?: string | null;
}

export interface CrmQuickLink {
  label: string;
  count: number;
  href: string;
  icon?: string;
}

export interface CrmActivityItem {
  id: number | string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  date?: string | null;
  status?: string | null;
  href?: string | null;
}

export interface CrmListColumn {
  key: string;
  label: string;
}

export interface CrmListCell {
  value: string;
  href?: string | null;
  muted?: boolean;
}

export interface CrmListRow {
  id: number | string;
  href?: string | null;
  cells: Record<string, CrmListCell>;
}

export interface PortalCrmListViewModel {
  badge: string;
  title: string;
  subtitle: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  columns: CrmListColumn[];
  rows: CrmListRow[];
}

export interface PortalCrmProfileViewModel {
  badge: string;
  title: string;
  subtitle?: string | null;
  heroFields: CrmDetailItem[];
  primaryActions?: Array<{
    label: string;
    href: string;
    tone?: "solid" | "ghost";
  }>;
  notice?: string | null;
  quickLinks: CrmQuickLink[];
  detailsLeft: CrmDetailItem[];
  detailsRight: CrmDetailItem[];
  tabs: Array<{
    id: string;
    label: string;
    items?: CrmActivityItem[];
    columns?: CrmListColumn[];
    rows?: CrmListRow[];
    emptyLabel: string;
  }>;
  sidebarCards?: Array<{
    title: string;
    items: CrmDetailItem[];
  }>;
}
