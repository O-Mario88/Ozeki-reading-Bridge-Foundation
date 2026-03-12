import { CrudPanel } from "@/components/CrudPanel";

export default function PortalReportsPage() {
  return (
    <>
      <CrudPanel
        title="Impact Reports"
        endpoint="/api/v1/staff/reports/impact-reports/"
        fields={[
          { name: "report_code", label: "Report Code" },
          { name: "title", label: "Title" },
          { name: "scope_type", label: "Scope Type" },
          { name: "scope_value", label: "Scope Value" },
          { name: "is_public", label: "Public" },
        ]}
      />
      <CrudPanel
        title="Public Aggregates"
        endpoint="/api/v1/staff/reports/public-aggregates/"
        fields={[
          { name: "scope_type", label: "Scope Type" },
          { name: "scope_value", label: "Scope Value" },
          { name: "period_key", label: "Period" },
          { name: "kpis", label: "KPIs JSON" },
          { name: "domain_breakdown", label: "Domains JSON" },
        ]}
      />
    </>
  );
}
