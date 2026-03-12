import { CrudPanel } from "@/components/CrudPanel";

export default function PortalTrainingsPage() {
  return (
    <>
      <CrudPanel
        title="Training Sessions"
        endpoint="/api/v1/staff/training/sessions/"
        fields={[
          { name: "school", label: "School ID", type: "number" },
          { name: "date", label: "Date", type: "date" },
          { name: "training_type", label: "Type" },
          { name: "title", label: "Title" },
          { name: "status", label: "Status" },
        ]}
      />
      <CrudPanel
        title="Training Participants"
        endpoint="/api/v1/staff/training/participants/"
        fields={[
          { name: "session", label: "Session ID", type: "number" },
          { name: "participant_name", label: "Participant Name" },
          { name: "participant_role", label: "Role" },
          { name: "phone", label: "Phone" },
          { name: "email", label: "Email" },
        ]}
      />
    </>
  );
}
