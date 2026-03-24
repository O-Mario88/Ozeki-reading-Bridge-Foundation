import {
  SCHOOL_IMPORT_HEADERS,
  SCHOOLS_TEMPLATE_SHEET_NAME,
  type ImportPreviewRow,
  type SchoolsTemplateRow,
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
  assertImportScope,
  collapseWhitespace,
  normalizePhone,
  normalizeText,
} from "@/lib/server/imports/utils";
import {
  createOrUpdateSchool,
  resolveSchoolForImport,
  resolveSchoolLocationHierarchy,
  schoolImportFieldsChanged,
  type SchoolDirectoryWriteInput,
} from "@/lib/server/services/schools/write-service";
import { withPostgresClient } from "@/lib/server/postgres/client";
import type { PortalUser } from "@/lib/types";

function requiredValue(value: string, label: string) {
  const normalized = collapseWhitespace(value);
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
}

function toDuplicateKey(row: SchoolsTemplateRow) {
  return [
    normalizeText(row.school_name),
    normalizeText(row.district),
    normalizeText(row.parish),
    normalizeText(row.country),
  ].join("|");
}


function toImportInput(row: SchoolsTemplateRow): SchoolDirectoryWriteInput {
  let headTeacher: SchoolDirectoryWriteInput["headTeacher"] = null;
  const hName = collapseWhitespace(row.head_teacher_name);
  if (hName) {
    headTeacher = {
      fullName: hName,
      gender: "Other",
      phone: normalizePhone(row.head_teacher_phone),
      email: null,
      whatsapp: null,
    };
  }

  return {
    schoolExternalId: null,
    name: requiredValue(row.school_name, "school_name"),
    alternativeSchoolNames: null,
    country: requiredValue(row.country, "country"),
    region: requiredValue(row.region, "region"),
    subRegion: collapseWhitespace(row.sub_region) || null,
    district: requiredValue(row.district, "district"),
    subCounty: collapseWhitespace(row.sub_county) || null,
    parish: collapseWhitespace(row.parish) || "",
    village: collapseWhitespace(row.village) || null,

    yearFounded: null,

    schoolStatus: "Open",
    schoolStatusDate: null,
    currentPartnerType: "NA",
    currentPartnerSchool: false,

    isActive: true,
    schoolActive: true,
    classesJson: null,
    headTeacher,
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

export async function validateSchoolsImport(args: {
  actor: PortalUser;
  file: File;
}) {
  assertImportRole(args.actor, "schools");

  const parsed = await parseUploadSheet({
    file: args.file,
    expectedHeaders: SCHOOL_IMPORT_HEADERS,
    templateSheetName: SCHOOLS_TEMPLATE_SHEET_NAME,
  });

  const seenKeys = new Map<string, number>();
  const previewRows: ImportPreviewRow[] = [];

  await withPostgresClient(async (client) => {
    for (const [index, rawData] of parsed.rows.entries()) {
      const rowNumber = index + 2;
      const typedRow = rawData as unknown as SchoolsTemplateRow;
      try {
        const duplicateKey = toDuplicateKey(typedRow);
        const firstRow = seenKeys.get(duplicateKey);
        if (firstRow) {
          throw new Error(`Duplicate school row in this file. Already provided on row ${firstRow}.`);
        }
        seenKeys.set(duplicateKey, rowNumber);

        const input = toImportInput(typedRow);
        const hierarchy = await resolveSchoolLocationHierarchy(client, {
          country: input.country ?? "",
          region: input.region ?? "",
          subRegion: input.subRegion ?? "",
          district: input.district ?? "",
          parish: input.parish ?? "",
        });
        assertImportScope(args.actor, {
          country: hierarchy.countryName,
          region: hierarchy.regionName,
          district: hierarchy.districtName,
        });

        const match = await resolveSchoolForImport(client, {
          schoolExternalId: input.schoolExternalId,
          schoolName: input.name ?? "",
          country: hierarchy.countryName,
          district: hierarchy.districtName,
          parish: hierarchy.parishName,
        });

        const normalizedInput: SchoolDirectoryWriteInput = {
          ...input,
          schoolId: match.schoolId,
          country: hierarchy.countryName,
          region: hierarchy.regionName,
          subRegion: hierarchy.subRegionName,
          district: hierarchy.districtName,
          parish: hierarchy.parishName,
        };
        const shouldUpdate =
          match.schoolId && match.action === "UPDATE"
            ? await schoolImportFieldsChanged(match.schoolId, normalizedInput)
            : false;
        const action = match.action === "CREATE" ? "CREATE" : shouldUpdate ? "UPDATE" : "SKIP";

        previewRows.push({
          rowNumber,
          action,
          status: action === "SKIP" ? "SKIPPED" : "READY",
          rawData,
          normalizedData: normalizedInput as Record<string, unknown>,
          errorMessage: null,
          warningMessage: null,
          suggestedFix: null,
          linkedSchoolId: match.schoolId,
        });
      } catch (error) {
        previewRows.push(
          errorPreviewRow({
            rowNumber,
            rawData,
            errorMessage: error instanceof Error ? error.message : "Invalid school row.",
            suggestedFix:
              "Use the official template values for the location hierarchy and required school fields.",
          }),
        );
      }
    }
  });

  return createValidatedImportJob({
    importType: "schools",
    fileName: parsed.fileName,
    fileFormat: parsed.fileFormat,
    actor: args.actor,
    rows: previewRows,
  });
}

export async function commitSchoolsImport(args: {
  actor: PortalUser;
  importJobId: number;
}) {
  assertImportRole(args.actor, "schools");

  const job = await getImportJob(args.importJobId);
  if (!job || job.importType !== "schools") {
    throw new Error("Schools import job not found.");
  }
  if (job.rows.some((row) => row.status === "ERROR" || row.action === "ERROR")) {
    throw new Error("Fix import errors before committing this schools import.");
  }

  await markImportJobCommitting(args.importJobId, args.actor);

  for (const row of job.rows) {
    if (row.action === "SKIP") {
      await updateImportJobRow({
        importJobId: args.importJobId,
        rowNumber: row.rowNumber,
        action: "SKIP",
        status: "SKIPPED",
        warningMessage: row.warningMessage,
        linkedSchoolId: row.linkedSchoolId,
      });
      continue;
    }

    try {
      const normalizedData = (row.normalizedData ?? {}) as SchoolDirectoryWriteInput;
      if (!normalizedData.name || !normalizedData.country || !normalizedData.region || !normalizedData.district) {
        throw new Error("This row is missing normalized school data and must be revalidated.");
      }

      const result = await createOrUpdateSchool({
        actor: args.actor,
        input: normalizedData,
      });
      await updateImportJobRow({
        importJobId: args.importJobId,
        rowNumber: row.rowNumber,
        action: result.action,
        status: result.action === "CREATE" ? "CREATED" : "UPDATED",
        linkedSchoolId: result.school.id,
        createdRecordId: result.action === "CREATE" ? String(result.school.id) : null,
        updatedRecordId: result.action === "UPDATE" ? String(result.school.id) : null,
        warningMessage: row.warningMessage,
      });
    } catch (error) {
      await updateImportJobRow({
        importJobId: args.importJobId,
        rowNumber: row.rowNumber,
        action: "ERROR",
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "School import commit failed.",
        warningMessage: row.warningMessage,
        linkedSchoolId: row.linkedSchoolId,
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
