import { CrudPanel } from "@/components/CrudPanel";

export default function PortalAssessmentsPage() {
  return (
    <>
      <CrudPanel
        title="Assessment Sessions"
        endpoint="/api/v1/staff/assessments/sessions/"
        fields={[
          { name: "uid", label: "Session UID" },
          { name: "school", label: "School ID", type: "number" },
          { name: "assessment_date", label: "Date", type: "date" },
          { name: "assessment_type", label: "Type" },
          { name: "class_grade", label: "Class Grade" },
        ]}
      />
      <CrudPanel
        title="Assessment Results"
        endpoint="/api/v1/staff/assessments/results/"
        fields={[
          { name: "session", label: "Session ID", type: "number" },
          { name: "learner", label: "Learner ID", type: "number" },
          { name: "letter_identification_score", label: "Letter Score", type: "number" },
          { name: "story_reading_score", label: "Story Score", type: "number" },
          { name: "reading_comprehension_score", label: "Comprehension", type: "number" },
        ]}
      />
    </>
  );
}
