import { getGoogleWorkspaceDiagnostics } from "../src/lib/google-workspace";

async function main() {
  const status = await getGoogleWorkspaceDiagnostics();
  console.log(JSON.stringify(status, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Google diagnostics failed.");
  process.exit(1);
});

