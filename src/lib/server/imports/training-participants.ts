import {
  TRAINING_PARTICIPANT_IMPORT_HEADERS,
  TRAINING_PARTICIPANTS_TEMPLATE_SHEET_NAME,
  type ImportPreviewResult,
  type ImportPreviewRow,
  type MissingSchoolCandidate,
  type TrainingParticipantTemplateRow,
} from "@/lib/server/imports/constants";
import {
  createValidatedImportJob,
  finalizeImportJob,
  getImportJob,
  markImportJobCommitting,
  updateImportJobRow,
} from "@/lib/server/imports/jobs";
import { parseUploadSheet } from "@/lib/server/imports/parsing";
import {
  assertImportRole,
  collapseWhitespace,
  normalizePhone,
  normalizeText,
} from "@/lib/server/imports/utils";
import {
  createOrUpdateTrainingParticipant,
  previewTrainingParticipantWrite,
  type TrainingParticipantNormalizedData,
  type TrainingParticipantWriteInput,
} from "@/lib/server/services/training/participant-service";
import type { PortalUser } from "@/lib/types";

const MISSING_SCHOOL_ERROR = "School not found. Import the school first or provide school_external_id.";

type MissingSchoolMapValue = MissingSchoolCandidate;

function requiredValue(value: string, label: string) {
  const normalized = collapseWhitespace(value);
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
}

function createParticipantDuplicateKey(row: TrainingParticipantTemplateRow, trainingContextId?: number | null) {
  const participantExternalId = normalizeText(row.participant_external_id);
  if (participantExternalId) {
    return `participant_external_id:${participantExternalId}`;
  }

  const email = normalizeText(row.email);
  if (email) {
    return `email:${email}`;
  }

  const phone = normalizePhone(row.phone);
  if (phone) {
    return `phone:${phone}`;
  }

  const trainingRef = trainingContextId ? `training:${trainingContextId}` : `code:${normalizeText(row.training_code)}`;
  const schoolRef = normalizeText(row.school_external_id)
    ? `school_external_id:${normalizeText(row.school_external_id)}`
    : [
        normalizeText(row.school_name),
        normalizeText(row.district),
        normalizeText(row.parish),
        normalizeText(row.country),
      ].join("|");

  return [
    trainingRef,
    normalizeText(row.first_name),
    normalizeText(row.last_name),
    schoolRef,
  ].join("|");
}

function createMissingSchoolKey(row: TrainingParticipantTemplateRow) {
  const externalId = normalizeText(row.school_external_id);
  if (externalId) {
    return `school_external_id:${externalId}`;
  }
  return [
    normalizeText(row.school_name),
    normalizeText(row.district),
    normalizeText(row.parish),
    normalizeText(row.country),
  ].join("|");
}

function addMissingSchoolCandidate(
  collection: Map<string, MissingSchoolMapValue>,
  row: TrainingParticipantTemplateRow,
  rowNumber: number,
) {
  const key = createMissingSchoolKey(row);
  const current = collection.get(key);
  if (current) {
    current.affected_rows.push(rowNumber);
    return;
  }

  collection.set(key, {
    school_external_id: collapseWhitespace(row.school_external_id),
    school_name: collapseWhitespace(row.school_name),
    country: collapseWhitespace(row.country),
    region: collapseWhitespace(row.region),
    sub_region: collapseWhitespace(row.sub_region),
    district: collapseWhitespace(row.district),
    parish: collapseWhitespace(row.parish),
    affected_rows: [rowNumber],
  });
}

function toWriteInput(row: TrainingParticipantTemplateRow, trainingRecordId?: number | null): TrainingParticipantWriteInput {
  const trainingCode = collapseWhitespace(row.training_code);
  if (!trainingRecordId && !trainingCode) {
    throw new Error("training_code is required.");
  }

  const schoolExternalId = collapseWhitespace(row.school_external_id);
  const schoolName = collapseWhitespace(row.school_name);
  if (!schoolExternalId && !schoolName) {
    throw new Error("Provide school_external_id or school_name.");
  }

  return {
    trainingRecordId: trainingRecordId ?? undefined,
    trainingCode: trainingRecordId ? trainingCode || undefined : requiredValue(trainingCode, "training_code"),
    participantExternalId: collapseWhitespace(row.participant_external_id) || null,
    firstName: requiredValue(row.first_name, "first_name"),
    lastName: requiredValue(row.last_name, "last_name"),
    sex: collapseWhitespace(row.sex) || null,
    phone: normalizePhone(row.phone),
    email: collapseWhitespace(row.email) || null,
    role: requiredValue(row.role, "role"),
    jobTitle: collapseWhitespace(row.job_title) || null,
    schoolExternalId: schoolExternalId || null,
    schoolName: schoolName || null,
    country: collapseWhitespace(row.country) || null,
    region: collapseWhitespace(row.region) || null,
    subRegion: collapseWhitespace(row.sub_region) || null,
    district: collapseWhitespace(row.district) || null,
    parish: collapseWhitespace(row.parish) || null,
    attendanceStatus: collapseWhitespace(row.attendance_status) || null,
    attendedFrom: collapseWhitespace(row.attended_from) || null,
    attendedTo: collapseWhitespace(row.attended_to) || null,
    certificateStatus: collapseWhitespace(row.certificate_status) || null,
    notes: collapseWhitespace(row.notes) || null,
  };
}

function errorPreviewRow(args: {
  rowNumber: number;
  rawData: Record<string, string>;
  errorMessage: string;
  suggestedFix?: string | null;
}): ImportPreviewRow {
  return {
    rowNumber: args.rowNumber,
    action: "ERROR",
    status: "ERROR",
    rawData: args.rawData,
    normalizedData: null,
    errorMessage: args.errorMessage,
    warningMessage: null,
    suggestedFix: args.suggestedFix ?? null,
  };
}

function normalizeCommitInput(normalizedData: Record<string, unknown>) {
  const data = normalizedData as Partial<TrainingParticipantNormalizedData>;
  if (!data.trainingRecordId || !data.firstName || !data.lastName || !data.role || !data.schoolId) {
    throw new Error("This row is missing normalized participant data and must be revalidated.");
  }
  const commitInput: TrainingParticipantWriteInput = {
    trainingRecordId: data.trainingRecordId,
    trainingCode: data.trainingCode ?? null,
    participantExternalId: data.participantExternalId ?? null,
    firstName: data.firstName,
    lastName: data.lastName,
    sex: data.sex ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    role: data.role,
    jobTitle: data.jobTitle ?? null,
    schoolId: data.schoolId,
    schoolExternalId: data.schoolExternalId ?? null,
    schoolName: data.schoolName ?? null,
    country: data.country ?? null,
    region: data.region ?? null,
    subRegion: data.subRegion ?? null,
    district: data.district ?? null,
    parish: data.parish ?? null,
    attendanceStatus: data.attendanceStatus ?? null,
    attendedFrom: data.attendedFrom ?? null,
    attendedTo: data.attendedTo ?? null,
    certificateStatus: data.certificateStatus ?? null,
    notes: data.notes ?? null,
  };
  return commitInput;
}

export async function validateTrainingParticipantsImport(args: {
  actor: PortalUser;
  file: File;
  trainingRecordId?: number | null;
}) {
  assertImportRole(args.actor, "training_participants");

  const parsed = await parseUploadSheet({
    file: args.file,
    expectedHeaders: TRAINING_PARTICIPANT_IMPORT_HEADERS,
    templateSheetName: TRAINING_PARTICIPANTS_TEMPLATE_SHEET_NAME,
  });

  const seenKeys = new Map<string, number>();
  const missingSchools = new Map<string, MissingSchoolMapValue>();
  const previewRows: ImportPreviewRow[] = [];
  let affectedRowsCount = 0;

  for (const [index, rawData] of parsed.rows.entries()) {
    const rowNumber = index + 2;
    const typedRow = rawData as unknown as TrainingParticipantTemplateRow;
    try {
      const duplicateKey = createParticipantDuplicateKey(typedRow, args.trainingRecordId);
      const firstRow = seenKeys.get(duplicateKey);
      if (firstRow) {
        throw new Error(`Duplicate participant row in this file. Already provided on row ${firstRow}.`);
      }
      seenKeys.set(duplicateKey, rowNumber);

      const input = toWriteInput(typedRow, args.trainingRecordId);
      const preview = await previewTrainingParticipantWrite({
        actor: args.actor,
        input,
      });
      const warningMessage = [
        preview.warningMessage,
        preview.action === "SKIP" && preview.isAlreadyRegistered
          ? "Participant already registered for this training and no changes are pending."
          : null,
        !typedRow.school_external_id && typedRow.school_name
          ? "school_external_id is preferred for reliable school matching in future imports."
          : null,
      ]
        .filter(Boolean)
        .join(" ");

      previewRows.push({
        rowNumber,
        action: preview.action,
        status: preview.action === "SKIP" ? "SKIPPED" : "READY",
        rawData,
        normalizedData: preview.normalizedData as unknown as Record<string, unknown>,
        errorMessage: null,
        warningMessage: warningMessage || null,
        suggestedFix: null,
        linkedSchoolId: preview.linkedSchoolId,
        linkedTrainingId: preview.linkedTrainingId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid training participant row.";
      const normalizedError = errorMessage.startsWith("School not found.") ? MISSING_SCHOOL_ERROR : errorMessage;
      if (normalizedError === MISSING_SCHOOL_ERROR && (typedRow.school_external_id || typedRow.school_name)) {
        addMissingSchoolCandidate(missingSchools, typedRow, rowNumber);
        affectedRowsCount += 1;
      }
      previewRows.push(
        errorPreviewRow({
          rowNumber,
          rawData,
          errorMessage: normalizedError,
          suggestedFix:
            normalizedError === MISSING_SCHOOL_ERROR
              ? "Download the missing schools template, import those schools first, then re-run this participant import."
              : null,
        }),
      );
    }
  }

  const preview = await createValidatedImportJob({
    importType: "training_participants",
    fileName: parsed.fileName,
    fileFormat: parsed.fileFormat,
    actor: args.actor,
    rows: previewRows,
    sourceTrainingRecordId: args.trainingRecordId ?? null,
  });

  return {
    ...preview,
    missingSchools: Array.from(missingSchools.values()),
    missingSchoolsCount: missingSchools.size,
    affectedRowsCount,
  } satisfies ImportPreviewResult;
}

export async function commitTrainingParticipantsImport(args: {
  actor: PortalUser;
  importJobId: number;
  forceImport?: boolean;
}) {
  assertImportRole(args.actor, "training_participants");

  const job = await getImportJob(args.importJobId);
  if (!job || job.importType !== "training_participants") {
    throw new Error("Training participant import job not found.");
  }
  const hasErrors = job.rows.some((row) => row.status === "ERROR" || row.action === "ERROR");
  if (hasErrors && !args.forceImport) {
    throw new Error("Fix import errors before committing this training participant import.");
  }

  await markImportJobCommitting(args.importJobId, args.actor);

  for (const row of job.rows) {
    if (row.action === "ERROR" || row.status === "ERROR") {
      await updateImportJobRow({
        importJobId: args.importJobId,
        rowNumber: row.rowNumber,
        action: "SKIP",
        status: "SKIPPED",
        warningMessage: row.errorMessage
          ? `Force-skipped: ${row.errorMessage}`
          : "Force-skipped due to validation error.",
        linkedSchoolId: row.linkedSchoolId,
        linkedTrainingId: row.linkedTrainingId,
      });
      continue;
    }
    if (row.action === "SKIP") {
      await updateImportJobRow({
        importJobId: args.importJobId,
        rowNumber: row.rowNumber,
        action: "SKIP",
        status: "SKIPPED",
        warningMessage: row.warningMessage,
        linkedSchoolId: row.linkedSchoolId,
        linkedTrainingId: row.linkedTrainingId,
      });
      continue;
    }

    try {
      const input = normalizeCommitInput(row.normalizedData ?? {});
      const result = await createOrUpdateTrainingParticipant({
        actor: args.actor,
        input,
      });
      await updateImportJobRow({
        importJobId: args.importJobId,
        rowNumber: row.rowNumber,
        action: result.action,
        status: result.action === "CREATE" ? "CREATED" : result.action === "UPDATE" ? "UPDATED" : "SKIPPED",
        warningMessage: row.warningMessage ?? result.warningMessage,
        linkedSchoolId: result.schoolId,
        linkedTrainingId: result.trainingRecordId,
        createdRecordId: result.action === "CREATE" ? String(result.contactId) : null,
        updatedRecordId: result.action === "UPDATE" ? String(result.contactId) : null,
      });
    } catch (error) {
      await updateImportJobRow({
        importJobId: args.importJobId,
        rowNumber: row.rowNumber,
        action: "ERROR",
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Training participant import commit failed.",
        warningMessage: row.warningMessage,
        linkedSchoolId: row.linkedSchoolId,
        linkedTrainingId: row.linkedTrainingId,
      });
    }
  }

  const summary = await finalizeImportJob({
    importJobId: args.importJobId,
    actor: args.actor,
  });

  return {
    importJobId: args.importJobId,
    summary,
  };
}

export {
  MISSING_SCHOOL_ERROR,
  addMissingSchoolCandidate,
  createMissingSchoolKey,
  createParticipantDuplicateKey,
};
