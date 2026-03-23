import ExcelJS from "exceljs";
import {
  SCHOOL_IMPORT_HEADERS,
  SCHOOLS_TEMPLATE_SHEET_NAME,
  TEMPLATE_ROW_LIMIT,
  TRAINING_PARTICIPANT_IMPORT_HEADERS,
  TRAINING_PARTICIPANTS_TEMPLATE_SHEET_NAME,
  type ImportFileFormat,
  type MissingSchoolCandidate,
  type SchoolsTemplateRow,
  type TrainingParticipantTemplateRow,
} from "@/lib/server/imports/constants";
import { buildCsv, collapseWhitespace } from "@/lib/server/imports/utils";
import {
  listTrainingImportLookupRows,
  listTrainingParticipantSchoolLookupRows,
} from "@/lib/server/services/training/participant-service";

const WORKBOOK_AUTHOR = "Ozeki Reading Bridge Foundation";
const DEFAULT_TEMPLATE_PLACEHOLDER_ROWS = 30;
const VALIDATION_ROW_LIMIT = TEMPLATE_ROW_LIMIT + 1;

type RowLike = object;

function normalizeCell(value: unknown) {
  return collapseWhitespace(String(value ?? ""));
}

function columnLetter(columnIndex: number) {
  let index = columnIndex;
  let letter = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    index = Math.floor((index - 1) / 26);
  }
  return letter;
}

function emptyTemplateRow<T extends RowLike>(headers: readonly string[], seed?: Partial<T>) {
  return headers.reduce<Record<string, string>>((accumulator, header) => {
    accumulator[header] = String((seed as Record<string, string> | undefined)?.[header] ?? "");
    return accumulator;
  }, {}) as T;
}

function buildTemplateRows<T extends RowLike>(args: {
  headers: readonly string[];
  rows?: T[];
  includePlaceholders?: boolean;
  placeholderCount?: number;
  seed?: Partial<T>;
}) {
  if (args.rows && args.rows.length > 0) {
    return args.rows;
  }
  if (args.includePlaceholders === false) {
    return [] as T[];
  }
  const count = args.placeholderCount ?? DEFAULT_TEMPLATE_PLACEHOLDER_ROWS;
  return Array.from({ length: count }, () => emptyTemplateRow<T>(args.headers, args.seed));
}

function createWorkbookBase() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = WORKBOOK_AUTHOR;
  workbook.lastModifiedBy = WORKBOOK_AUTHOR;
  workbook.created = new Date();
  workbook.modified = new Date();
  return workbook;
}

function applyWorksheetWidths(worksheet: ExcelJS.Worksheet, headers: readonly string[]) {
  worksheet.columns = headers.map((header) => ({
    key: header,
    width: Math.min(Math.max(header.length + 4, 16), 28),
  }));
}

function applyWorksheetHeader(worksheet: ExcelJS.Worksheet, headers: readonly string[]) {
  const row = worksheet.addRow([...headers]);
  row.font = { bold: true, color: { argb: "FF1E293B" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

function addInstructionSheet(workbook: ExcelJS.Workbook, title: string, lines: string[]) {
  const worksheet = workbook.addWorksheet("Instructions");
  worksheet.columns = [{ width: 120 }];
  const titleRow = worksheet.addRow([title]);
  titleRow.font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
  worksheet.addRow([""]);
  lines.forEach((line) => {
    const row = worksheet.addRow([line]);
    row.alignment = { wrapText: true, vertical: "top" };
  });
}

function addExamplesSheet<T extends RowLike>(
  workbook: ExcelJS.Workbook,
  headers: readonly string[],
  rows: T[],
) {
  const worksheet = workbook.addWorksheet("Examples");
  applyWorksheetWidths(worksheet, headers);
  applyWorksheetHeader(worksheet, headers);
  rows.forEach((row) => {
    const record = row as Record<string, unknown>;
    worksheet.addRow(headers.map((header) => String(record[header] ?? "")));
  });
}

function addTemplateSheet<T extends RowLike>(args: {
  workbook: ExcelJS.Workbook;
  name: string;
  headers: readonly string[];
  rows: T[];
}) {
  const worksheet = args.workbook.addWorksheet(args.name);
  applyWorksheetWidths(worksheet, args.headers);
  applyWorksheetHeader(worksheet, args.headers);
  args.rows.forEach((row) => {
    const record = row as Record<string, unknown>;
    worksheet.addRow(args.headers.map((header) => String(record[header] ?? "")));
  });
  return worksheet;
}

function addLookupSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: Array<Record<string, string>>,
) {
  const worksheet = workbook.addWorksheet(name);
  worksheet.state = "veryHidden";
  applyWorksheetWidths(worksheet, headers);
  applyWorksheetHeader(worksheet, headers);
  if (rows.length === 0) {
    worksheet.addRow(headers.map(() => ""));
  } else {
    rows.forEach((row) => {
      worksheet.addRow(headers.map((header) => row[header] ?? ""));
    });
  }
  return worksheet;
}

function addNamedRange(args: {
  workbook: ExcelJS.Workbook;
  name: string;
  sheetName: string;
  columnIndex: number;
  rowCount: number;
}) {
  if (args.rowCount <= 0) {
    return false;
  }
  const column = columnLetter(args.columnIndex);
  const lastRow = Math.max(args.rowCount + 1, 2);
  args.workbook.definedNames.add(`'${args.sheetName}'!$${column}$2:$${column}$${lastRow}`, args.name);
  return true;
}

function applyNamedListValidation(args: {
  worksheet: ExcelJS.Worksheet;
  columnIndex: number;
  rangeName: string;
  promptTitle: string;
  allowBlank?: boolean;
}) {
  const letter = columnLetter(args.columnIndex);
  for (let rowIndex = 2; rowIndex <= VALIDATION_ROW_LIMIT; rowIndex += 1) {
    args.worksheet.getCell(`${letter}${rowIndex}`).dataValidation = {
      type: "list",
      allowBlank: args.allowBlank ?? true,
      formulae: [args.rangeName],
      showErrorMessage: true,
      errorTitle: "Invalid value",
      error: `Choose a valid ${args.promptTitle.toLowerCase()} from the lookup list.`,
      promptTitle: args.promptTitle,
    };
  }
}

function applyStaticListValidation(args: {
  worksheet: ExcelJS.Worksheet;
  columnIndex: number;
  values: string[];
  promptTitle: string;
  allowBlank?: boolean;
}) {
  const letter = columnLetter(args.columnIndex);
  const formula = `"${args.values.join(",")}"`;
  for (let rowIndex = 2; rowIndex <= VALIDATION_ROW_LIMIT; rowIndex += 1) {
    args.worksheet.getCell(`${letter}${rowIndex}`).dataValidation = {
      type: "list",
      allowBlank: args.allowBlank ?? true,
      formulae: [formula],
      showErrorMessage: true,
      errorTitle: "Invalid value",
      error: `Choose a valid ${args.promptTitle.toLowerCase()}.`,
      promptTitle: args.promptTitle,
    };
  }
}

function applyTextNumberFormat(worksheet: ExcelJS.Worksheet, columnIndex: number, format: string) {
  const letter = columnLetter(columnIndex);
  for (let rowIndex = 2; rowIndex <= VALIDATION_ROW_LIMIT; rowIndex += 1) {
    worksheet.getCell(`${letter}${rowIndex}`).numFmt = format;
  }
}

function toWorkbookBuffer(buffer: Buffer | ArrayBuffer) {
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

function buildSchoolsExampleRows(): SchoolsTemplateRow[] {
  return [
    {
      school_external_id: "SCH-GUL-001",
      school_name: "Bright Future Primary School",
      alternative_school_names: "Bright Future PS",
      country: "Uganda",
      region: "Northern",
      sub_region: "Acholi",
      district: "Gulu",
      sub_county: "Layibi",
      parish: "Layibi",
      village: "Koro",
      latitude: "2.772404",
      longitude: "32.298987",
      year_founded: "2014",
      school_status: "Open",
      school_status_date: "2024-01-01",
      current_partner_type: "Partner",
      current_partner_school: "TRUE",
      is_active: "TRUE",
      classes_offered: "P1, P2, P3",
      head_teacher_name: "Sarah Akello",
      head_teacher_gender: "Female",
      head_teacher_phone: "+256700000001",
      head_teacher_email: "brightfuture@example.org",
      head_teacher_whatsapp: "+256700000001",
    },
    {
      school_external_id: "SCH-LIR-014",
      school_name: "Lira Demonstration School",
      alternative_school_names: "",
      country: "Uganda",
      region: "Northern",
      sub_region: "Lango",
      district: "Lira",
      sub_county: "Lira Central",
      parish: "Adyel",
      village: "",
      latitude: "2.249900",
      longitude: "32.899800",
      year_founded: "1998",
      school_status: "Open",
      school_status_date: "",
      current_partner_type: "Sponsor District",
      current_partner_school: "FALSE",
      is_active: "YES",
      classes_offered: "Baby Class, Middle Class, Top Class, P1, P2, P3, P4, P5, P6, P7",
      head_teacher_name: "John Okello",
      head_teacher_gender: "Male",
      head_teacher_phone: "+256700000014",
      head_teacher_email: "",
      head_teacher_whatsapp: "",
    },
  ];
}

function buildTrainingParticipantsExampleRows(trainingCode = "TR-0001"): TrainingParticipantTemplateRow[] {
  return [
    {
      participant_external_id: "PART-001",
      training_code: trainingCode,
      first_name: "Ruth",
      last_name: "Nakato",
      sex: "Female",
      phone: "+256700000021",
      email: "ruth.nakato@example.org",
      role: "Classroom Teacher",
      job_title: "P3 Teacher",
      school_external_id: "SCH-GUL-001",
      school_name: "Bright Future Primary School",
      country: "Uganda",
      region: "Northern",
      sub_region: "Acholi",
      district: "Gulu",
      parish: "Layibi",
      attendance_status: "Attended",
      attended_from: "2026-03-01",
      attended_to: "2026-03-03",
      certificate_status: "Issued",
      notes: "Completed all sessions.",
    },
    {
      participant_external_id: "PART-002",
      training_code: trainingCode,
      first_name: "Peter",
      last_name: "Okello",
      sex: "Male",
      phone: "+256700000022",
      email: "",
      role: "School Leader",
      job_title: "Head Teacher",
      school_external_id: "SCH-LIR-014",
      school_name: "Lira Demonstration School",
      country: "Uganda",
      region: "Northern",
      sub_region: "Lango",
      district: "Lira",
      parish: "Adyel",
      attendance_status: "Confirmed",
      attended_from: "",
      attended_to: "",
      certificate_status: "Pending",
      notes: "Travel pending.",
    },
  ];
}

export function buildSchoolsCsvTemplate(rows: SchoolsTemplateRow[] = []) {
  return buildCsv(rows as unknown as Array<Record<string, unknown>>, [...SCHOOL_IMPORT_HEADERS]);
}

export function buildTrainingParticipantsCsvTemplate(rows: TrainingParticipantTemplateRow[] = []) {
  return buildCsv(rows as unknown as Array<Record<string, unknown>>, [...TRAINING_PARTICIPANT_IMPORT_HEADERS]);
}

export function mapMissingSchoolsToTemplateRows(missingSchools: MissingSchoolCandidate[]): SchoolsTemplateRow[] {
  return missingSchools.map((row) => ({
    school_external_id: normalizeCell(row.school_external_id),
    school_name: normalizeCell(row.school_name),
    alternative_school_names: "",
    country: normalizeCell(row.country),
    region: normalizeCell(row.region),
    sub_region: normalizeCell(row.sub_region),
    district: normalizeCell(row.district),
    sub_county: "",
    parish: normalizeCell(row.parish),
    village: "",
    latitude: "",
    longitude: "",
    year_founded: "",
    school_status: "Open",
    school_status_date: "",
    current_partner_type: "NA",
    current_partner_school: "FALSE",
    is_active: "TRUE",
    classes_offered: "",
    head_teacher_name: "",
    head_teacher_gender: "",
    head_teacher_phone: "",
    head_teacher_email: "",
    head_teacher_whatsapp: "",
  }));
}

export async function generateSchoolsWorkbook(args?: {
  rows?: SchoolsTemplateRow[];
  includePlaceholders?: boolean;
  instructionLines?: string[];
}) {
  const workbook = createWorkbookBase();
  addInstructionSheet(
    workbook,
    "Schools Import Instructions",
    args?.instructionLines ?? [
      "Do not rename headers or change the Schools_Template sheet name.",
      "Use one row per school.",
      "Required columns: school_name, country, region, sub_region, district, parish.",
      "Use TRUE/FALSE, YES/NO, or 1/0 for is_active and current_partner_school.",
      "Latitude and longitude accept decimal values. year_founded must be numeric or blank.",
      "classes_offered accepts a comma-separated list like 'Baby Class, P1, P2'.",
      "Blank optional fields are allowed. Do not invent missing location values.",
    ],
  );

  const rows = buildTemplateRows<SchoolsTemplateRow>({
    headers: SCHOOL_IMPORT_HEADERS,
    rows: args?.rows,
    includePlaceholders: args?.includePlaceholders,
  });
  const templateSheet = addTemplateSheet({
    workbook,
    name: SCHOOLS_TEMPLATE_SHEET_NAME,
    headers: SCHOOL_IMPORT_HEADERS,
    rows,
  });
  applyStaticListValidation({
    worksheet: templateSheet,
    columnIndex: 17, // current_partner_school
    values: ["TRUE", "FALSE", "YES", "NO", "1", "0"],
    promptTitle: "Partner School value",
  });
  applyStaticListValidation({
    worksheet: templateSheet,
    columnIndex: 18, // is_active
    values: ["TRUE", "FALSE", "YES", "NO", "1", "0"],
    promptTitle: "School active value",
  });
  applyStaticListValidation({
    worksheet: templateSheet,
    columnIndex: 21, // head_teacher_gender
    values: ["Male", "Female", "Other"],
    promptTitle: "Gender",
  });
  applyTextNumberFormat(templateSheet, 11, "0.000000"); // latitude
  applyTextNumberFormat(templateSheet, 12, "0.000000"); // longitude
  applyTextNumberFormat(templateSheet, 13, "0"); // year_founded

  addExamplesSheet(workbook, SCHOOL_IMPORT_HEADERS, buildSchoolsExampleRows());
  return toWorkbookBuffer(await workbook.xlsx.writeBuffer());
}

export async function generateTrainingParticipantsWorkbook(args?: {
  rows?: TrainingParticipantTemplateRow[];
  trainingRecordId?: number | null;
  includePlaceholders?: boolean;
}) {
  const workbook = createWorkbookBase();
  const [lookupSchools, lookupTrainings] = await Promise.all([
    listTrainingParticipantSchoolLookupRows(),
    listTrainingImportLookupRows(),
  ]);
  const selectedTraining = args?.trainingRecordId
    ? lookupTrainings.find((row) => row.id === args.trainingRecordId) ?? null
    : null;
  const prefilledTrainingCode = selectedTraining?.trainingCode ?? "";

  addInstructionSheet(
    workbook,
    "Training Participants Import Instructions",
    [
      "Do not rename headers or change the Training_Participants_Template sheet name.",
      "Use one row per participant registration.",
      "Required columns: training_code (unless this workbook is tied to one training), first_name, last_name, role, and either school_external_id or school_name.",
      selectedTraining
        ? `This workbook is prefilled for training ${selectedTraining.trainingCode}: ${selectedTraining.trainingTitle}.`
        : "Use the Trainings_Lookup sheet to choose a valid training_code.",
      "If a school is missing, stop and import that school first using the Schools Import flow.",
      "attended_from and attended_to accept dates. attendance_status and certificate_status normalize friendly values.",
    ],
  );

  const rows = buildTemplateRows<TrainingParticipantTemplateRow>({
    headers: TRAINING_PARTICIPANT_IMPORT_HEADERS,
    rows: args?.rows?.map((row) => ({
      ...row,
      training_code: row.training_code || prefilledTrainingCode,
    })),
    includePlaceholders: args?.includePlaceholders,
    seed: prefilledTrainingCode ? ({ training_code: prefilledTrainingCode } as Partial<TrainingParticipantTemplateRow>) : undefined,
  });

  const templateSheet = addTemplateSheet({
    workbook,
    name: TRAINING_PARTICIPANTS_TEMPLATE_SHEET_NAME,
    headers: TRAINING_PARTICIPANT_IMPORT_HEADERS,
    rows,
  });

  const schoolLookupSheetName = "Schools_Lookup";
  const trainingLookupSheetName = "Trainings_Lookup";
  addLookupSheet(
    workbook,
    schoolLookupSheetName,
    ["school_external_id", "school_name", "country", "region", "sub_region", "district", "parish"],
    lookupSchools.map((row) => ({
      school_external_id: row.schoolExternalId ?? "",
      school_name: row.name,
      country: row.country,
      region: row.region,
      sub_region: row.subRegion,
      district: row.district,
      parish: row.parish,
    })),
  );
  addLookupSheet(
    workbook,
    trainingLookupSheetName,
    ["training_code", "training_title", "start_date", "end_date"],
    lookupTrainings.map((row) => ({
      training_code: row.trainingCode,
      training_title: row.trainingTitle,
      start_date: row.startDate ?? "",
      end_date: row.endDate ?? "",
    })),
  );

  const hasSchoolNames = addNamedRange({
    workbook,
    name: "training_school_names",
    sheetName: schoolLookupSheetName,
    columnIndex: 2,
    rowCount: lookupSchools.length,
  });
  const hasSchoolExternalIds = addNamedRange({
    workbook,
    name: "training_school_external_ids",
    sheetName: schoolLookupSheetName,
    columnIndex: 1,
    rowCount: lookupSchools.length,
  });
  const hasTrainingCodes = addNamedRange({
    workbook,
    name: "training_codes_lookup",
    sheetName: trainingLookupSheetName,
    columnIndex: 1,
    rowCount: lookupTrainings.length,
  });

  if (!selectedTraining && hasTrainingCodes) {
    applyNamedListValidation({
      worksheet: templateSheet,
      columnIndex: 2,
      rangeName: "training_codes_lookup",
      promptTitle: "Training code",
      allowBlank: false,
    });
  }
  if (hasSchoolExternalIds) {
    applyNamedListValidation({
      worksheet: templateSheet,
      columnIndex: 10,
      rangeName: "training_school_external_ids",
      promptTitle: "School external ID",
    });
  }
  if (hasSchoolNames) {
    applyNamedListValidation({
      worksheet: templateSheet,
      columnIndex: 11,
      rangeName: "training_school_names",
      promptTitle: "School name",
    });
  }
  applyStaticListValidation({
    worksheet: templateSheet,
    columnIndex: 5,
    values: ["Female", "Male", "Other"],
    promptTitle: "Sex",
  });
  applyStaticListValidation({
    worksheet: templateSheet,
    columnIndex: 8,
    values: [
      "Classroom Teacher",
      "Teacher",
      "School Leader",
      "Head Teacher",
      "Deputy Head Teacher",
      "Administrator",
      "Coach",
    ],
    promptTitle: "Role",
    allowBlank: false,
  });
  applyStaticListValidation({
    worksheet: templateSheet,
    columnIndex: 17,
    values: ["Registered", "Invited", "Confirmed", "Attended", "Absent", "Excused"],
    promptTitle: "Attendance status",
  });
  applyStaticListValidation({
    worksheet: templateSheet,
    columnIndex: 20,
    values: ["Pending", "Issued", "Not Required", "Rejected"],
    promptTitle: "Certificate status",
  });
  applyTextNumberFormat(templateSheet, 18, "yyyy-mm-dd");
  applyTextNumberFormat(templateSheet, 19, "yyyy-mm-dd");

  addExamplesSheet(
    workbook,
    TRAINING_PARTICIPANT_IMPORT_HEADERS,
    buildTrainingParticipantsExampleRows(prefilledTrainingCode || "TR-0001"),
  );

  return toWorkbookBuffer(await workbook.xlsx.writeBuffer());
}

export async function generateSchoolsTemplate(args?: {
  format: ImportFileFormat;
  rows?: SchoolsTemplateRow[];
  includePlaceholders?: boolean;
  instructionLines?: string[];
}) {
  if (args?.format === "csv") {
    return buildSchoolsCsvTemplate(args.rows);
  }
  return generateSchoolsWorkbook({
    rows: args?.rows,
    includePlaceholders: args?.includePlaceholders,
    instructionLines: args?.instructionLines,
  });
}

export async function generateTrainingParticipantsTemplate(args?: {
  format: ImportFileFormat;
  rows?: TrainingParticipantTemplateRow[];
  trainingRecordId?: number | null;
  includePlaceholders?: boolean;
}) {
  if (args?.format === "csv") {
    const rows = (args.rows ?? []).map((row) => ({
      ...row,
      training_code: row.training_code,
    }));
    return buildTrainingParticipantsCsvTemplate(rows);
  }
  return generateTrainingParticipantsWorkbook({
    rows: args?.rows,
    trainingRecordId: args?.trainingRecordId,
    includePlaceholders: args?.includePlaceholders,
  });
}

export async function generateMissingSchoolsTemplate(args: {
  format: ImportFileFormat;
  missingSchools: MissingSchoolCandidate[];
}) {
  const rows = mapMissingSchoolsToTemplateRows(args.missingSchools);
  return generateSchoolsTemplate({
    format: args.format,
    rows,
    includePlaceholders: false,
    instructionLines: [
      "This workbook was generated from training participant import rows that reference schools not yet in the system.",
      "Review and complete any blank location or profile fields before uploading it in the Schools Import flow.",
      "Do not rename headers or change the Schools_Template sheet name.",
      "Only the missing schools from the participant preview are included here.",
      "After importing these schools, re-run the participant import.",
    ],
  });
}
