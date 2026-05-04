import { ExternalLoginShell } from "@/components/external/ExternalLoginShell";

export const metadata = { title: "Teacher sign-in · Ozeki Reading Bridge" };

export default function TeacherLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-16">
      <ExternalLoginShell
        role="teacher"
        roleLabel="Teacher"
        helperText="Access your training resources, your latest coaching feedback, and your verifiable training credentials."
        showOrganization
      />
    </main>
  );
}
