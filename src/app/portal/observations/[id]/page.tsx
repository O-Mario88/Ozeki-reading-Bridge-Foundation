import { notFound } from "next/navigation";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { ObservationFormModalShell } from "@/components/portal/ObservationFormModalShell";
import { getObservationByIdPostgres } from "@/lib/server/postgres/repositories/phonics-observations";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `Observation #${id} | Ozeki Portal` };
}

export default async function ObservationDetailPage({ params }: Props) {
  const user = await requirePortalUser();
  const { id } = await params;
  const obs = await getObservationByIdPostgres(Number(id));
  if (!obs) notFound();

  return (
    <PortalShell user={user} activeHref="/portal/observations" hideFrame>
      <ObservationFormModalShell
        mode="edit"
        existingObservation={obs}
      />
    </PortalShell>
  );
}
