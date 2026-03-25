"use server";

import { getCrmAccounts, getAccount360, logInteraction } from "@/lib/server/postgres/repositories/crm";
import { auth } from "@/lib/auth";

export async function fetchCrmAccounts(filters: any) {
  return await getCrmAccounts(filters);
}

export async function fetchAccountDetail(id: string) {
  return await getAccount360(id);
}

export async function addInteraction(data: any) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  return await logInteraction({
    ...data,
    userId: Number(session.user.id)
  });
}
