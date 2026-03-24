import * as XLSX from "xlsx";
import {
  MAX_IMPORT_FILE_BYTES,
  type ImportFileFormat,
} from "@/lib/server/imports/constants";
import { collapseWhitespace, normalizeHeaderCells } from "@/lib/server/imports/utils";

interface ParsedUploadSheet {
  fileName: string;
  fileFormat: ImportFileFormat;
  rows: Record<string, string>[];
}

function detectFormat(fileName: string): ImportFileFormat {
  const normalized = fileName.trim().toLowerCase();
  if (normalized.endsWith(".csv")) {
    return "csv";
  }
  if (normalized.endsWith(".xlsx") || normalized.endsWith(".xls")) {
    return "xlsx";
  }
  throw new Error("Use a CSV or Excel file (.csv, .xlsx, .xls).");
}

function parseCsvMatrix(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let index = 0;
  let inQuotes = false;
  const text = input.replace(/^\uFEFF/, "");

  while (index < text.length) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 2;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        index += 1;
        continue;
      }
      cell += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      index += 1;
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      index += 1;
      continue;
    }
    if (char === "\r") {
      index += 1;
      continue;
    }
    cell += char;
    index += 1;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function ensureHeaderContract(actual: string[], expected: readonly string[]): Map<string, number> {
  const normalized = normalizeHeaderCells(actual);
  const duplicates = normalized.filter((value, index) => value && normalized.indexOf(value) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate headers detected: ${Array.from(new Set(duplicates)).join(", ")}.`);
  }
  // Build a map from header name → column index
  const headerIndexMap = new Map<string, number>();
  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i]) {
      headerIndexMap.set(normalized[i], i);
    }
  }
  const missing = expected.filter((header) => !headerIndexMap.has(header));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(", ")}. Use the official template.`);
  }
  return headerIndexMap;
}

function matrixToObjects(matrix: unknown[][], headers: readonly string[], headerIndexMap: Map<string, number>) {
  return matrix
    .slice(1)
    .map((rawRow) =>
      headers.reduce<Record<string, string>>((accumulator, header) => {
        const colIndex = headerIndexMap.get(header) ?? -1;
        accumulator[header] = collapseWhitespace(String((rawRow as unknown[])[colIndex] ?? ""));
        return accumulator;
      }, {}),
    )
    .filter((row) => headers.some((header) => row[header].trim() !== ""));
}

function readXlsxMatrix(buffer: Buffer, templateSheetName: string) {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false, cellDates: false });
  if (!workbook.SheetNames.includes(templateSheetName)) {
    throw new Error(`The workbook must include the ${templateSheetName} sheet.`);
  }
  const worksheet = workbook.Sheets[templateSheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  return matrix;
}

export async function parseUploadSheet(args: {
  file: File;
  expectedHeaders: readonly string[];
  templateSheetName: string;
}): Promise<ParsedUploadSheet> {
  const fileName = args.file.name.trim() || "upload";
  const fileFormat = detectFormat(fileName);
  if (args.file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error(`File too large. Maximum upload size is ${Math.floor(MAX_IMPORT_FILE_BYTES / (1024 * 1024))} MB.`);
  }

  let matrix: unknown[][];
  if (fileFormat === "csv") {
    const text = await args.file.text();
    matrix = parseCsvMatrix(text);
  } else {
    const buffer = Buffer.from(await args.file.arrayBuffer());
    matrix = readXlsxMatrix(buffer, args.templateSheetName);
  }

  if (matrix.length === 0) {
    throw new Error("No rows found in uploaded file.");
  }

  const headerRow = (matrix[0] ?? []) as unknown[];
  const headerIndexMap = ensureHeaderContract(headerRow.map((value) => String(value ?? "")), args.expectedHeaders);

  return {
    fileName,
    fileFormat,
    rows: matrixToObjects(matrix, args.expectedHeaders, headerIndexMap),
  };
}
