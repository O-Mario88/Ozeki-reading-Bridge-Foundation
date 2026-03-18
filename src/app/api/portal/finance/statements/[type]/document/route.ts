import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { requireFinanceEditor } from "@/app/api/portal/finance/_utils";
import { getFinanceFileById, listFinanceMonthlyStatements } from "@/services/financeService";

export const runtime = "nodejs";

const docTypeSchema = z.enum([
  "balance_sheet",
  "statement_of_financial_position",
  "income_statement",
]);
type StatementDocumentType = z.infer<typeof docTypeSchema>;

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  const auth = await requireFinanceEditor();
  if (auth.error) {
    return auth.error;
  }

  const { type: id } = await context.params;
  const statementId = Number(id);
  if (!Number.isFinite(statementId) || statementId <= 0) {
    return NextResponse.json({ error: "Invalid statement id." }, { status: 400 });
  }

  const parsedType = docTypeSchema.safeParse(request.nextUrl.searchParams.get("type") || "balance_sheet");
  if (!parsedType.success) {
    return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
  }
  const docType: StatementDocumentType = parsedType.data;

  const statement = (await listFinanceMonthlyStatements()).find((item) => item.id === statementId);
  if (!statement) {
    return NextResponse.json({ error: "Statement not found." }, { status: 404 });
  }

  const baseName = safeSegment(`${statement.month}-${statement.currency}`);
  const fileNameByType: Record<StatementDocumentType, string> = {
    balance_sheet: `balance-sheet-${baseName}.pdf`,
    statement_of_financial_position: `statement-of-financial-position-${baseName}.pdf`,
    income_statement: `income-statement-${baseName}.pdf`,
  };

  if (docType === "balance_sheet" && statement.balanceSheetPdfFileId) {
    const typedFile = await getFinanceFileById(statement.balanceSheetPdfFileId);
    const typedBytes = await fs.readFile(typedFile.storedPath);
    return new NextResponse(Buffer.from(typedBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileNameByType.balance_sheet}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  }
  if (docType === "statement_of_financial_position" && statement.statementOfFinancialPositionPdfFileId) {
    const typedFile = await getFinanceFileById(statement.statementOfFinancialPositionPdfFileId);
    const typedBytes = await fs.readFile(typedFile.storedPath);
    return new NextResponse(Buffer.from(typedBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileNameByType.statement_of_financial_position}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  }
  if (docType === "income_statement" && statement.incomeStatementPdfFileId) {
    const typedFile = await getFinanceFileById(statement.incomeStatementPdfFileId);
    const typedBytes = await fs.readFile(typedFile.storedPath);
    return new NextResponse(Buffer.from(typedBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileNameByType.income_statement}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  }

  const fallbackFileId =
    statement.pdfFileId ||
    statement.balanceSheetPdfFileId ||
    statement.statementOfFinancialPositionPdfFileId ||
    statement.incomeStatementPdfFileId;
  if (!fallbackFileId) {
    return NextResponse.json({ error: "Statement PDF not available." }, { status: 404 });
  }
  const file = await getFinanceFileById(fallbackFileId);
  const rawBytes = await fs.readFile(file.storedPath);

  // Legacy fallback for statements generated before independent document artifacts existed.
  const sourceDoc = await PDFDocument.load(rawBytes);
  const sourcePageCount = sourceDoc.getPageCount();
  const pageIndex = docType === "income_statement" ? 1 : 0;
  if (pageIndex >= sourcePageCount) {
    return NextResponse.json({ error: "Requested document section is unavailable in this statement PDF." }, { status: 404 });
  }

  const outputDoc = await PDFDocument.create();
  const [page] = await outputDoc.copyPages(sourceDoc, [pageIndex]);
  outputDoc.addPage(page);
  const outputBytes = await outputDoc.save();

  return new NextResponse(Buffer.from(outputBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileNameByType[docType]}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
