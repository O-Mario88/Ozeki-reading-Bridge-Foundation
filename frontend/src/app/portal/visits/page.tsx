import { CrudPanel } from "@/components/CrudPanel";

export default function PortalVisitsPage() {
  return (
    <>
      <CrudPanel
        title="School Visits"
        endpoint="/api/v1/staff/visits/records/"
        fields={[
          { name: "school", label: "School ID", type: "number" },
          { name: "visit_date", label: "Visit Date", type: "date" },
          { name: "visit_type", label: "Visit Type" },
          { name: "visit_reason", label: "Reason" },
          { name: "implementation_status", label: "Implementation" },
        ]}
      />
      <CrudPanel
        title="Lesson Evaluations"
        endpoint="/api/v1/staff/evaluations/lessons/"
        fields={[
          { name: "school", label: "School ID", type: "number" },
          { name: "teacher", label: "Teacher ID", type: "number" },
          { name: "lesson_date", label: "Lesson Date", type: "date" },
          { name: "grade", label: "Grade" },
          { name: "status", label: "Status" },
        ]}
      />
    </>
  );
}
