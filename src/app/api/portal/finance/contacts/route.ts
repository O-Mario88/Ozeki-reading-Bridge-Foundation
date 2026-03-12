import { NextResponse } from "next/server";
import { z } from "zod";
import { createFinanceContact, listFinanceContacts } from "@/lib/finance-db";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(2).max(180),
  emails: z.array(z.string().trim().email()).min(1),
  phone: z.string().trim().max(80).optional(),
  address: z.string().trim().max(300).optional(),
  contactType: z.enum(["donor", "partner", "sponsor", "other"]),
});

export async function GET() {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }
  return NextResponse.json({ contacts: await listFinanceContacts() });
}

export async function POST(request: Request) {
  const auth = await requireFinanceEditor();
  if (auth.error || !auth.actor) {
    return auth.error;
  }

  try {
    const parsed = createSchema.parse(await request.json());
    const contact = createFinanceContact(
      {
        name: parsed.name,
        emails: parsed.emails,
        phone: parsed.phone,
        address: parsed.address,
        contactType: parsed.contactType,
      },
      auth.actor,
    );
    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create contact." },
      { status: 400 },
    );
  }
}
