export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
export const TEMPLATE_ROW_LIMIT = 300;
export const PREVIEW_ROW_LIMIT = 200;

export const SCHOOLS_TEMPLATE_SHEET_NAME = "Schools_Template";
export const TRAINING_PARTICIPANTS_TEMPLATE_SHEET_NAME = "Training_Participants_Template";

export const SCHOOL_IMPORT_HEADERS = [
  "school_name",
  "country",
  "region",
  "sub_region",
  "district",
  "sub_county",
  "parish",
  "village",
  "head_teacher_name",
  "head_teacher_phone",
] as const;

export const TRAINING_PARTICIPANT_IMPORT_HEADERS = [
  "participant_external_id",
  "training_code",
  "first_name",
  "last_name",
  "sex",
  "phone",
  "email",
  "role",
  "job_title",
  "school_external_id",
  "school_name",
  "country",
  "region",
  "sub_region",
  "district",
  "parish",
  "attendance_status",
  "attended_from",
  "attended_to",
  "certificate_status",
  "notes",
] as const;

export type SchoolImportHeader = (typeof SCHOOL_IMPORT_HEADERS)[number];
export type TrainingParticipantImportHeader = (typeof TRAINING_PARTICIPANT_IMPORT_HEADERS)[number];
export type ImportFileFormat = "csv" | "xlsx";
export type ImportType = "schools" | "training_participants";
export type ImportAction = "CREATE" | "UPDATE" | "SKIP" | "ERROR";
export type ImportRowStatus = "READY" | "SKIPPED" | "ERROR" | "CREATED" | "UPDATED";

export interface ImportPreviewRow {
  rowNumber: number;
  action: ImportAction;
  status: ImportRowStatus;
  rawData: Record<string, string>;
  normalizedData: Record<string, unknown> | null;
  errorMessage: string | null;
  warningMessage: string | null;
  suggestedFix: string | null;
  linkedSchoolId?: number | null;
  linkedTrainingId?: number | null;
}

export interface ImportPreviewSummary {
  totalRows: number;
  validRows: number;
  createCount: number;
  updateCount: number;
  skippedCount: number;
  errorCount: number;
}

export interface ImportPreviewResult {
  importJobId: number;
  importType: ImportType;
  fileName: string;
  fileFormat: ImportFileFormat;
  summary: ImportPreviewSummary;
  rows: ImportPreviewRow[];
  missingSchools?: MissingSchoolCandidate[];
  missingSchoolsCount?: number;
  affectedRowsCount?: number;
}

export interface MissingSchoolCandidate {
  school_external_id: string;
  school_name: string;
  country: string;
  region: string;
  sub_region: string;
  district: string;
  parish: string;
  affected_rows: number[];
}

export interface SchoolsTemplateRow {
  school_name: string;
  country: string;
  region: string;
  sub_region: string;
  district: string;
  sub_county: string;
  parish: string;
  village: string;
  head_teacher_name: string;
  head_teacher_phone: string;
}

export interface TrainingParticipantTemplateRow {
  participant_external_id: string;
  training_code: string;
  first_name: string;
  last_name: string;
  sex: string;
  phone: string;
  email: string;
  role: string;
  job_title: string;
  school_external_id: string;
  school_name: string;
  country: string;
  region: string;
  sub_region: string;
  district: string;
  parish: string;
  attendance_status: string;
  attended_from: string;
  attended_to: string;
  certificate_status: string;
  notes: string;
}
