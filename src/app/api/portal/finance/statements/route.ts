import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { csvHeaders, requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import {
  exportFinanceRowsToCsv,
  generateFinanceMonthlyStatement,
  listFinanceMonthlyStatements,
} from "@/lib/finance-db";
import { FINANCE_INCOME_CATEGORIES } from "@/lib/finance-categories";

export const runtime = "nodejs";

const createSchema = z.object({
  periodType: z.enum(["monthly", "quarterly", "fiscal_year"]).default("monthly"),
  month: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
  year: z.coerce.number().int().min(2000).max(3000).optional(),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]).optional(),
  currency: z.enum(["UGX", "USD"]).default("UGX"),
}).superRefine((payload, ctx) => {
  if (payload.periodType === "monthly" && !payload.month) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["month"],
      message: "Month is required for monthly statements.",
    });
  }
  if (payload.periodType === "quarterly") {
    if (!payload.year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["year"],
        message: "Year is required for quarterly statements.",
      });
    }
    if (!payload.quarter) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quarter"],
        message: "Quarter is required for quarterly statements.",
      });
    }
  }
  if (payload.periodType === "fiscal_year" && !payload.year) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["year"],
      message: "Year is required for fiscal year statements.",
    });
  }
});

export async function GET(request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }
  const format = request.nextUrl.searchParams.get("format");
  const statements = await listFinanceMonthlyStatements();

  if (format === "csv") {
    const rows = statements.map((item) => ({
      month: item.month,
      periodType: item.periodType,
      currency: item.currency,
      totalMoneyIn: item.totalMoneyIn,
      totalMoneyOut: item.totalMoneyOut,
      net: item.net,
      donation: item.breakdownByCategory.Donation,
      training: item.breakdownByCategory.Training,
      schoolCoachingVisitsAndFollowUp: item.breakdownByCategory["School Coaching visits and Follow Up"],
      assessment: item.breakdownByCategory.Assessment,
      contracts: item.breakdownByCategory.Contracts,
      sponsorship: item.breakdownByCategory.Sponsorship,
      expense: item.breakdownByCategory.Expense,
      generatedAt: item.generatedAt,
    }));
    const categoryColumns = FINANCE_INCOME_CATEGORIES.map((category) => {
      if (category === "School Coaching visits and Follow Up") {
        return "schoolCoachingVisitsAndFollowUp";
      }
      return category.toLowerCase();
    });
    const csv = exportFinanceRowsToCsv(rows, [
      "month",
      "periodType",
      "currency",
      "totalMoneyIn",
      "totalMoneyOut",
      "net",
      ...categoryColumns,
      "expense",
      "generatedAt",
    ]);
    return new NextResponse(csv, { headers: csvHeaders(`finance-statements-${Date.now()}.csv`) });
  }
  return NextResponse.json({ statements });
}

export async function POST(request: NextRequest) {
  const auth = await requireFinanceEditor();
  if (auth.error || !auth.actor) {
    return auth.error;
  }

  try {
    const parsed = createSchema.parse(await request.json());
    const statement = await generateFinanceMonthlyStatement(
      {
        periodType: parsed.periodType,
        month: parsed.month,
        year: parsed.year,
        quarter: parsed.quarter,
      },
      parsed.currency,
      auth.actor,
    );
    return NextResponse.json({ statement }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate statement." },
      { status: 400 },
    );
  }
}
