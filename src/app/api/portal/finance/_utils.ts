import { NextResponse } from "next/server";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";

export type FinanceApiActor = {
  id: number;
  userId: number;
  userName: string;
  isSuperAdmin: boolean;
};

export async function requireFinanceSuperAdmin() {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      actor: null,
    };
  }
  if (!user.isSuperAdmin) {
    return {
      error: NextResponse.json({ error: "Forbidden: Super Admin only." }, { status: 403 }),
      actor: null,
    };
  }
  return {
    error: null,
    actor: {
      id: user.id,
      userId: user.id,
      userName: user.fullName,
      isSuperAdmin: user.isSuperAdmin,
    } as FinanceApiActor,
  };
}

export async function requireFinanceEditor() {
  const user = await getAuthenticatedPortalUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      actor: null,
    };
  }
  if (!user.isSuperAdmin && !user.isAdmin) {
    return {
      error: NextResponse.json({ error: "Forbidden: Super Admin or Accountant only." }, { status: 403 }),
      actor: null,
    };
  }
  return {
    error: null,
    actor: {
      id: user.id,
      userId: user.id,
      userName: user.fullName,
      isSuperAdmin: user.isSuperAdmin,
    } as FinanceApiActor,
  };
}

export const requireFinanceReceiptEditor = requireFinanceEditor;

export function csvHeaders(fileName: string) {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${fileName}"`,
  };
}
