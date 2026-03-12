import { CrudPanel } from "@/components/CrudPanel";

export default function PortalSchoolsPage() {
  return (
    <>
      <CrudPanel
        title="Schools"
        endpoint="/api/v1/staff/schools/schools/"
        fields={[
          { name: "code", label: "School Code" },
          { name: "name", label: "School Name" },
          { name: "district_name", label: "District" },
          { name: "sub_county_name", label: "Sub-county" },
          { name: "parish_name", label: "Parish" },
        ]}
      />
      <CrudPanel
        title="School Contacts"
        endpoint="/api/v1/staff/schools/contacts/"
        fields={[
          { name: "school", label: "School ID", type: "number" },
          { name: "full_name", label: "Full Name" },
          { name: "gender", label: "Gender" },
          { name: "category", label: "Category" },
          { name: "phone", label: "Phone" },
        ]}
      />
    </>
  );
}
