import { NextResponse } from "next/server";
import { resources } from "@/lib/content";

export async function GET() {
  return NextResponse.json({ resources });
}
