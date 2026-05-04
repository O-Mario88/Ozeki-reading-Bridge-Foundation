import { ExternalLoginShell } from "@/components/external/ExternalLoginShell";

export const metadata = { title: "Parent sign-in · Ozeki Reading Bridge" };

export default function ParentLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-16">
      <ExternalLoginShell
        role="parent"
        roleLabel="Parent"
        helperText="Track your child's reading progress, see what they're learning at school, and get a printable reading-passport you can share."
      />
    </main>
  );
}
